import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
}

// Define meal types with icons and descriptions
const MEAL_TYPES = [
  { id: 'Lunch', label: 'Lunch Menu', description: 'Available 11:00 - 15:00' },
  { id: 'Dinner', label: 'Dinner Menu', description: 'Available after 17:00' },
  { id: 'Drinks', label: 'Drinks & Bar', description: 'Refreshments & Cocktails' },
  { id: 'Nepali', label: 'Nepali Special', description: 'Traditional Dishes' },
  { id: 'Takeout', label: 'Takeaway', description: 'Ready in 20 mins' },
];

const CustomerMenu: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isOrdersOpen, setIsOrdersOpen] = useState(true);
  const { socket } = useSocket();
  const { state } = useCart();
  const toast = useToast();
  const cartDisclosure = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/orders');
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
      setActiveOrders(prev => {
        const updated = prev.map(order => 
          order._id === orderId 
            ? { ...order, status } 
            : order
        );
        // Remove completed or cancelled orders
        return updated.filter(order => 
          order.status !== 'completed' && 
          order.status !== 'cancelled'
        );
      });

      // Show toast notification for status updates
      const statusMessages = {
        'in-progress': 'Your order is now being prepared! 👨‍🍳',
        'completed': 'Your order will be served soon. Please wait 🍽️',
      };

      if (statusMessages[status as keyof typeof statusMessages]) {
        // Play a notification sound
        const audio = new Audio('/notification.mp3');
        audio.play().catch(console.error);

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
        const response = await axios.get('http://localhost:5000/api/menu');
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
              <Text fontWeight="bold" color="blue.500">Active Orders</Text>
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
                  <Text fontSize="sm" color={mutedColor}>
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Collapse>
        </Box>
      )}

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
          zIndex={10}
          px={4}
          py={3}
        >
          <HStack justify="space-between" align="center">
            <Box>
              <Text fontWeight="bold" fontSize="lg">Table {tableId}</Text>
              <Text fontSize="xs" color={mutedColor}>Scan QR to order</Text>
            </Box>
            <IconButton
              aria-label="Cart"
              icon={<HamburgerIcon />}
              onClick={cartDisclosure.onOpen}
              colorScheme="blue"
              variant="ghost"
              position="relative"
              size="lg"
            >
              {state.items.length > 0 && (
                <Badge
                  position="absolute"
                  top="-1"
                  right="-1"
                  colorScheme="red"
                  borderRadius="full"
                >
                  {state.items.length}
                </Badge>
              )}
            </IconButton>
          </HStack>
        </Box>

        {/* Category Tabs */}
        <Box
          position="fixed"
          top="65px"
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

        {/* Category Description */}
        <Box pt="130px" px={4} pb={4}>
          <Text fontSize="2xl" fontWeight="bold">
            {selectedCategoryInfo?.label}
          </Text>
          <Text color={mutedColor} fontSize="sm">
            {selectedCategoryInfo?.description}
          </Text>
        </Box>

        {/* Menu Items Stack */}
        <Box px={4}>
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
                ${state.total.toFixed(2)}
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

      <CartDrawer
        isOpen={cartDisclosure.isOpen}
        onClose={cartDisclosure.onClose}
        tableId={tableId || '0'}
      />
    </Box>
  );
};

export default CustomerMenu; 