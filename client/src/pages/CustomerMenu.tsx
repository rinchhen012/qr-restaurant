import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Text,
  useToast,
  Button,
  useDisclosure,
  HStack,
  Badge,
  IconButton,
  useColorModeValue,
  Divider,
  Flex,
  Center,
  Collapse,
  VStack,
  Progress,
  Spinner,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Grid,
} from '@chakra-ui/react';
import { HamburgerIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useSocket } from '../context/SocketContext';
import { useCart } from '../context/CartContext';
import MenuItemCard from '../components/MenuItemCard';
import CartDrawer from '../components/CartDrawer';
import axios from 'axios';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  options?: {
    name: string;
    choices: string[];
  }[];
}

interface Order {
  _id: string;
  tableNumber: number;
  items: {
    menuItem: MenuItem;
    quantity: number;
    selectedOptions: Record<string, string>;
    specialInstructions?: string;
  }[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  totalAmount: number;
}

// Define meal types with icons and descriptions
const MEAL_TYPES = [
  { id: 'Lunch', label: 'Lunch Menu', description: 'Available 11:00 - 15:00' },
  { id: 'Dinner', label: 'Dinner Menu', description: 'Available after 17:00' },
  { id: 'Drinks', label: 'Drinks & Bar', description: 'Refreshments & Cocktails' },
  { id: 'Nepali', label: 'Nepali Special', description: 'Traditional Dishes' },
  { id: 'Takeout', label: 'Takeaway', description: 'Ready in 20 mins' },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Add this helper function at the top level
const formatPrice = (price: number) => {
  return `¥${price.toLocaleString('ja-JP')}`;
};

const CustomerMenu: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTableActive, setIsTableActive] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { socket } = useSocket();
  const { state } = useCart();
  const toast = useToast();
  const cartDisclosure = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const tabsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Add user interaction handler
  useEffect(() => {
    const handleInteraction = () => {
      setHasUserInteracted(true);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const checkAndActivateTable = async () => {
      try {
        // First try to get table status
        const statusResponse = await axios.get(`${API_URL}/api/tables/${tableId}/status`);
        
        if (statusResponse.data.isActive) {
          setIsTableActive(true);
          return;
        }

        // If table is not active, try to activate it
        try {
          await axios.post(`${API_URL}/api/tables/${tableId}/activate`);
          setIsTableActive(true);
        } catch (activateError: any) {
          if (activateError.response?.status === 400) {
            toast({
              title: 'Table Not Available',
              description: activateError.response.data.message || 'This table is not currently available. Please try another table or contact staff.',
              status: 'error',
              duration: null,
              isClosable: true,
              position: 'top',
            });
          } else {
            throw activateError;
          }
          navigate('/');
          return;
        }
      } catch (error: any) {
        console.error('Failed to check/activate table:', error);
        toast({
          title: 'Error',
          description: 'Failed to verify table status. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
        navigate('/');
      }
    };

    if (tableId) {
      checkAndActivateTable();
    }
  }, [tableId, toast, navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/orders`);
        const tableOrders = response.data.filter(
          (order: Order) => 
            order.tableNumber === parseInt(tableId || '0') && 
            order.status !== 'completed' && 
            order.status !== 'cancelled'
        );
        setActiveOrders(tableOrders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    };

    fetchOrders();

    // Set up socket listeners for real-time updates
    if (!socket) return;

    // Listen for order status updates
    socket.on('order-status-update', ({ orderId, status }) => {
      // First update the order in active orders
      setActiveOrders(prev => {
        const updated = prev.map(order => 
          order._id === orderId 
            ? { ...order, status } 
            : order
        );
        // Only remove completed or cancelled orders
        return updated.filter(order => 
          order.status !== 'completed' && 
          order.status !== 'cancelled'
        );
      });

      // If order is moved back to in-progress, add it to active orders
      if (status === 'in-progress') {
        setActiveOrders(prev => {
          // Check if order is already in active orders
          if (prev.some(order => order._id === orderId)) {
            return prev;
          }
          // If not, fetch the order details and add it
          axios.get(`${API_URL}/api/orders/${orderId}`)
            .then(response => {
              const order = response.data;
              if (order.tableNumber === parseInt(tableId || '0')) {
                setActiveOrders(current => [order, ...current]);
              }
            })
            .catch(error => console.error('Error fetching order details:', error));
          return prev;
        });
      }

      // Show toast notification for status updates
      const statusMessages = {
        'pending': 'Your order is pending',
        'in-progress': 'Your order is now being prepared! 👨‍🍳',
        'completed': 'Your order will be served soon. Please wait 🍽️',
      };

      if (statusMessages[status as keyof typeof statusMessages]) {
        toast({
          title: 'Order Update',
          description: statusMessages[status as keyof typeof statusMessages],
          status: status === 'completed' ? 'success' : 'info',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
      }
    });

    // Listen for new orders
    socket.on('kitchen-update', ({ type, order }) => {
      if (type === 'new-order' && order.tableNumber === parseInt(tableId || '0')) {
        setActiveOrders(prev => [order, ...prev]);
      }
    });

    return () => {
      if (socket) {
        socket.off('order-status-update');
        socket.off('kitchen-update');
      }
    };
  }, [tableId, socket]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/menu`);
        setMenuItems(response.data);
        
        // Extract unique categories and sort them
        const uniqueCategories = Array.from(
          new Set(response.data.map((item: MenuItem) => item.category))
        ).sort() as string[];
        
        setCategories(uniqueCategories);
        // Set the first category as selected by default
        if (uniqueCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(uniqueCategories[0]);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch menu items',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    fetchMenu();
  }, [toast]);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/orders`);
        const tableOrders = response.data.filter(
          (order: Order) => 
            order.tableNumber === parseInt(tableId || '0') && 
            (order.status === 'completed' || order.status === 'cancelled')
        );
        setOrderHistory(tableOrders);
      } catch (error) {
        console.error('Failed to fetch order history:', error);
      }
    };

    fetchOrderHistory();
  }, [tableId]);

  const handleSpecialRequest = (requestType: 'water-refill' | 'naan-refill' | 'call-staff') => {
    if (socket) {
      socket.emit('customer-request', {
        tableNumber: parseInt(tableId || '0'),
        type: requestType,
      });

      toast({
        title: 'Request Sent',
        description: 'Staff has been notified of your request',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? tabsRef.current.scrollLeft - scrollAmount
        : tabsRef.current.scrollLeft + scrollAmount;
      
      tabsRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const filteredItems = menuItems.filter(item => item.category === selectedCategory);
  const selectedCategoryInfo = MEAL_TYPES.find(type => type.id === selectedCategory);

  // Add this function to format the order status for display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Received';
      case 'in-progress':
        return 'Preparing';
      case 'completed':
        return 'Will be served soon';
      default:
        return status;
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case 'pending':
        return 33;
      case 'in-progress':
        return 66;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'in-progress':
        return 'blue';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  if (!isTableActive) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Verifying table status...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box pb="70px">
      {/* Active Orders Section */}
      {activeOrders.length > 0 && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bg={bgColor}
          zIndex="20"
          borderBottom="1px"
          borderColor={borderColor}
          px={4}
          py={2}
        >
          <HStack justify="space-between" onClick={() => setIsOrdersOpen(!isOrdersOpen)} cursor="pointer">
            <HStack spacing={2}>
              <Text fontWeight="bold" color="blue.500">
                Active Orders {activeOrders.length > 0 && `(${activeOrders.length})`}
              </Text>
              <Spinner size="xs" color="blue.500" speed="0.8s" />
            </HStack>
            <IconButton
              aria-label="Toggle orders"
              icon={isOrdersOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              variant="ghost"
              size="sm"
            />
          </HStack>
          
          <Collapse in={isOrdersOpen}>
            <VStack spacing={3} align="stretch" mt={2}>
              {activeOrders.map((order) => (
                <Box key={order._id} p={3} bg="gray.50" borderRadius="md">
                  <HStack justify="space-between" mb={2}>
                    <Badge colorScheme={getStatusColor(order.status)} fontSize="sm">
                      {getStatusDisplay(order.status)}
                    </Badge>
                    <Text fontSize="sm" color={mutedColor}>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </Text>
                  </HStack>
                  <Progress
                    value={getProgressValue(order.status)}
                    size="sm"
                    colorScheme={getStatusColor(order.status)}
                    borderRadius="full"
                    mb={2}
                  />
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={mutedColor}>
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="blue.500">
                      {formatPrice(order.totalAmount)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Collapse>
        </Box>
      )}

      {/* Order History Drawer */}
      <Drawer
        isOpen={isHistoryOpen}
        placement="right"
        onClose={() => setIsHistoryOpen(false)}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Order History</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {orderHistory.map((order) => (
                <Box
                  key={order._id}
                  borderWidth="1px"
                  borderRadius="lg"
                  p={4}
                >
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontWeight="bold">
                        {new Date(order.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                      <Badge
                        colorScheme={order.status === 'completed' ? 'green' : 'red'}
                        fontSize="sm"
                      >
                        {order.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color={mutedColor}>
                      {new Date(order.createdAt).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Divider />
                    <VStack align="stretch" spacing={2}>
                      {order.items.map((item, index) => (
                        <HStack key={index} justify="space-between">
                          <Text fontSize="sm">
                            {item.quantity}x {item.menuItem.name}
                          </Text>
                          <Text fontSize="sm" color={mutedColor}>
                            {formatPrice(item.menuItem.price * item.quantity)}
                          </Text>
                        </HStack>
                      ))}
                      <Divider />
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Total</Text>
                        <Text fontWeight="bold" color="blue.500">
                          {formatPrice(order.totalAmount)}
                        </Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Box>
              ))}
              {orderHistory.length === 0 && (
                <Center py={10}>
                  <Text color={mutedColor}>No order history available</Text>
                </Center>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Adjust top padding based on whether orders section is shown */}
      <Box pt={activeOrders.length > 0 ? (isOrdersOpen ? "180px" : "100px") : "65px"}>
        {/* Fixed Top Bar */}
        <Box 
          position="fixed"
          top={activeOrders.length > 0 ? (isOrdersOpen ? "130px" : "50px") : "0"}
          left={0}
          right={0}
          bg={bgColor}
          borderBottom="1px"
          borderColor={borderColor}
          zIndex={15}
          px={4}
          py={3}
          height="65px"
        >
          <HStack justify="space-between" align="center" height="100%">
            <Box>
              <Text fontWeight="bold" fontSize="lg">Table {tableId}</Text>
              <Text fontSize="xs" color={mutedColor}>Scan QR to order</Text>
            </Box>
            <Button
              size="lg"
              colorScheme="blue"
              variant="outline"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              leftIcon={<HamburgerIcon />}
              height="50px"
              fontSize="lg"
            >
              Order History
            </Button>
          </HStack>
        </Box>

        {/* Category Tabs */}
        <Box
          position="fixed"
          top={activeOrders.length > 0 ? (isOrdersOpen ? "195px" : "115px") : "65px"}
          left={0}
          right={0}
          bg={bgColor}
          zIndex={10}
          borderBottom="1px"
          borderColor={borderColor}
        >
          <Flex align="center" position="relative">
            <IconButton
              aria-label="Scroll left"
              icon={<ChevronLeftIcon />}
              onClick={() => scrollTabs('left')}
              position="absolute"
              left={0}
              zIndex={1}
              h="full"
              rounded="none"
              bg={`linear-gradient(to right, ${bgColor}, transparent)`}
            />
            
            <Box
              ref={tabsRef}
              overflowX="auto"
              py={3}
              px={12}
              css={{
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
              <HStack spacing={2}>
                {categories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? 'solid' : 'ghost'}
                    colorScheme="blue"
                    size="md"
                    flexShrink={0}
                    rounded="full"
                    px={6}
                  >
                    {category}
                  </Button>
                ))}
              </HStack>
            </Box>

            <IconButton
              aria-label="Scroll right"
              icon={<ChevronRightIcon />}
              onClick={() => scrollTabs('right')}
              position="absolute"
              right={0}
              zIndex={1}
              h="full"
              rounded="none"
              bg={`linear-gradient(to left, ${bgColor}, transparent)`}
            />
          </Flex>
        </Box>

        {/* Adjust main content padding based on whether orders section is shown */}
        <Box pt={activeOrders.length > 0 ? (isOrdersOpen ? "280px" : "200px") : "140px"}>
          {/* Category Description */}
          <Box px={4}>
            {selectedCategoryInfo && (
              <Text color={mutedColor} fontSize="sm" mb={0}>
                {selectedCategoryInfo.description}
              </Text>
            )}
          </Box>

          {/* Menu Items Grid */}
          <Box px={4}>
            <Grid
              templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
              gap={6}
              mt={0}
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <Box key={item._id}>
                    <MenuItemCard item={item} />
                    <Divider />
                  </Box>
                ))
              ) : (
                <Center py={10}>
                  <Text color={mutedColor}>No items available in this category</Text>
                </Center>
              )}
            </Grid>
          </Box>

          {/* Fixed Bottom Bar */}
          <Box
            position="fixed"
            bottom={0}
            left={0}
            right={0}
            bg={bgColor}
            borderTop="1px"
            borderColor={borderColor}
            py={3}
            px={4}
            zIndex={10}
          >
            <HStack justify="space-between" align="center">
              <Stack spacing={0}>
                <Text fontSize="xs" color={mutedColor}>
                  {state.items.length} {state.items.length === 1 ? 'item' : 'items'} in cart
                </Text>
                <Text fontSize="lg" fontWeight="bold">
                  {formatPrice(state.total)}
                </Text>
              </Stack>
              <Button
                colorScheme="blue"
                size="lg"
                onClick={cartDisclosure.onOpen}
                leftIcon={<HamburgerIcon />}
                height="50px"
                px={8}
              >
                View Cart
              </Button>
            </HStack>
          </Box>
        </Box>
      </Box>

      <CartDrawer
        isOpen={cartDisclosure.isOpen}
        onClose={cartDisclosure.onClose}
        tableId={tableId || '0'}
      />
    </Box>
  );
};

export default CustomerMenu; 