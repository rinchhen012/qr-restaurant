import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Heading,
  Stack,
  Text,
  Badge,
  Button,
  useToast,
  UseToastOptions,
  Select,
  HStack,
  Spacer,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Spinner,
  Icon,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Flex,
  Circle,
  Tooltip,
  Wrap,
  WrapItem,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import { ArrowBackIcon, TimeIcon, BellIcon, StarIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import axios, { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: Record<string, string>;
  specialInstructions?: string;
}

interface Order {
  _id: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  specialRequests: string[];
  totalAmount: number;
  createdAt: string;
}

interface Table {
  _id: string;
  tableNumber: number;
  isActive: boolean;
  lastActivatedAt?: string;
}

const KitchenDisplay: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { socket } = useSocket();
  const toast = useToast();
  const { login } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isPaymentAlertOpen, setIsPaymentAlertOpen] = useState(false);
  const [paymentRequestTable, setPaymentRequestTable] = useState<number | null>(null);
  const paymentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<number[]>([]);
  const [confirmingPayment, setConfirmingPayment] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Sound notification elements
  const audioElement = (
    <>
      <audio ref={paymentAudioRef} src="/payment-request.mp3" />
    </>
  );

  // Sound notification function
  const playSound = (type: 'new-order' | 'completed' | 'special-request' | 'payment-request') => {
    const soundMap = {
      'new-order': '/new-order.mp3',
      'completed': '/completed.mp3',
      'special-request': '/notification.mp3',
      'payment-request': '/new-order.mp3'
    };

    const audio = new Audio(soundMap[type]);
    audio.play().catch(error => {
      console.error('Error playing sound:', error);
    });
  };

  useEffect(() => {
    // Auto-login for kitchen display if token is not present
    const token = localStorage.getItem('adminToken');
    if (!token) {
      login('admin', 'admin123', true).catch((error: AxiosError | Error) => {
        toast({
          title: 'Error',
          description: 'Failed to auto-login. Please refresh the page or contact support.',
          status: 'error',
          duration: null,
          isClosable: true,
        });
        console.error('Auto-login error:', error);
      });
    }
  }, [login, toast]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date and time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get<Order[]>(`${API_URL}/api/orders`);
      // Filter out any orders with invalid menuItems
      const validOrders = response.data.map((order: Order) => ({
        ...order,
        items: order.items.filter((item: OrderItem) => item.menuItem && item.menuItem.name)
      })).filter((order: Order) => order.items.length > 0);
      
      setOrders(validOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        status: 'error',
        duration: 3000,
        isClosable: true,
      } as UseToastOptions);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;

    socket.on('kitchen-update', ({ type, order }) => {
      if (type === 'new-order') {
        setOrders(prev => [order, ...prev]);
        // Play new order sound
        playSound('new-order');
        
        toast({
          title: 'New Order',
          description: `Order from Table ${order.tableNumber}`,
          status: 'info',
          duration: 5000,
          isClosable: true,
        } as UseToastOptions);
      }
    });

    socket.on('kitchen-notification', (notification) => {
      // Play special request sound
      playSound('special-request');

      toast({
        title: 'Special Request',
        description: `Table ${notification.tableNumber} requests ${notification.type}`,
        status: 'warning',
        duration: null,
        isClosable: true,
      } as UseToastOptions);
    });

    return () => {
      socket.off('kitchen-update');
      socket.off('kitchen-notification');
    };
  }, [socket, toast]);

  // Fetch tables
  const fetchTables = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tables`);
      const activeTables = response.data.filter((table: Table) => table.isActive);
      setTables(activeTables.sort((a: Table, b: Table) => a.tableNumber - b.tableNumber));
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  }, []);
  
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Updated to open confirmation dialog
  const openPaymentConfirmation = (tableNumber: number) => {
    setConfirmingPayment(tableNumber);
  };
  
  // Add a new function to specifically handle marking orders as paid
  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const response = await axios.put(`${API_URL}/api/orders/${orderId}/payment-status`, {
        paymentStatus: 'paid'
      });

      if (response.data) {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId
              ? { ...order, paymentStatus: 'paid' }
              : order
          )
        );

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating payment status:', error);
      let errorMessage = 'Failed to update payment status';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
  };

  // Add a new function to handle deactivating tables
  const handleDeactivateTable = async (tableNumber: number) => {
    try {
      await axios.post(`${API_URL}/api/tables/${tableNumber}/deactivate`);
      
      // Update local state to remove the table
      setTables(prev => prev.filter(table => table.tableNumber !== tableNumber));
      
      return true;
    } catch (error) {
      console.error('Error deactivating table:', error);
      let errorMessage = 'Failed to deactivate table';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
  };

  // Modify the confirmPaymentAndDeactivate function to use the new specialized functions
  const confirmPaymentAndDeactivate = async () => {
    if (!confirmingPayment) return;

    setIsProcessing(true);
    let activeOrder = null;

    try {
      console.log(`[1] Starting payment/deactivation for table ${confirmingPayment}`);
      // 1. Find the active order
      activeOrder = orders.find(
        order => order.tableNumber === confirmingPayment &&
                 order.status !== 'completed' &&
                 order.status !== 'cancelled'
      );

      // 2. If active order exists, mark it as paid
      if (activeOrder) {
        console.log(`[2a] Found active order ${activeOrder._id}. Marking as paid...`);
        const paymentSuccess = await handleMarkAsPaid(activeOrder._id); // This already updates local order paymentStatus
        if (!paymentSuccess) {
          throw new Error('Failed to mark order as paid. Halting process.');
        }
        console.log(`[2b] Order ${activeOrder._id} marked as paid.`);

        // Keep the delay just in case, though it likely didn't help previously
        console.log(`[DELAY] Waiting 200ms before deactivation...`);
        await new Promise(resolve => setTimeout(resolve, 200));

      } else {
        console.log(`[2] No active, unpaid/incomplete order found for table ${confirmingPayment}. Proceeding directly to deactivate.`);
      }

      // 3. Deactivate the table
      console.log(`[3] Attempting to deactivate table ${confirmingPayment}...`);
      const deactivateSuccess = await handleDeactivateTable(confirmingPayment); // This updates local tables state

      if (deactivateSuccess) {
        console.log(`[4] Table ${confirmingPayment} deactivated successfully.`);
        setPaymentRequests(prev => prev.filter(num => num !== confirmingPayment));

        toast({
          title: 'Payment Completed',
          description: `Table ${confirmingPayment} has been marked as paid and reset for new customers. Order history preserved.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        console.log(`[5] Refreshing tables and orders data...`);
        await Promise.all([fetchTables(), fetchOrders()]);
      } else {
        // This means handleDeactivateTable returned false due to API error
        // The error toast inside handleDeactivateTable already fired.
        // We just need to stop the 'success' path here.
         throw new Error(`Server rejected table deactivation for table ${confirmingPayment}. See previous error toast for details.`);
      }

    } catch (error) {
      // Catch errors from handleMarkAsPaid failure OR handleDeactivateTable failure OR explicit throws
      console.error('Error during payment/deactivation process:', error);
      let errorMessage = 'Failed to process payment and/or deactivate table';

      // Log detailed Axios error if available from handleDeactivateTable or other potential spots
      if (axios.isAxiosError(error)) {
         console.error('Axios Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data // Log the actual response data
        });
         // Use server message if specific, otherwise use the error message from our catch block
         errorMessage = error.response?.data?.message || (error as Error).message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message; // Use message from explicit throws
      }

      // Avoid duplicate toasts if handleDeactivateTable already showed one for the API error
      // Check if the error message isn't the generic one from the explicit throw when deactivateSuccess is false
       if (!errorMessage.startsWith('Server rejected table deactivation')) {
         toast({
            title: 'Process Error',
            description: errorMessage,
            status: 'error',
            duration: 5000,
            isClosable: true,
         });
       }
    } finally {
      setIsProcessing(false);
      setConfirmingPayment(null);
      console.log(`[END] Finished processing attempt for table ${confirmingPayment}`);
    }
  };

  // Update payment request socket listener
  useEffect(() => {
    if (!socket) return;

    socket.on('request-payment-at-register', (data) => {
      // Add to payment requests array
      setPaymentRequests(prev => {
        if (!prev.includes(data.tableNumber)) {
          return [...prev, data.tableNumber];
        }
        return prev;
      });
      
      // Play payment request sound
      playSound('payment-request');
      
      toast({
        title: 'Payment Request',
        description: `Table ${data.tableNumber} is ready to pay at the register`,
        status: 'info',
        duration: null,
        isClosable: true,
      } as UseToastOptions);
    });

    // Listen for table status updates
    socket.on('table-status-update', (data) => {
      if (data.type === 'activated') {
        // Add the table to our list if it's not already there
        setTables(prev => {
          const exists = prev.some(t => t._id === data.table._id);
          if (!exists) {
            // Sort tables by number after adding the new one
            return [...prev, data.table].sort((a, b) => a.tableNumber - b.tableNumber);
          }
          return prev;
        });
        
        toast({
          title: 'Table Activated',
          description: `Table ${data.tableNumber} is now active`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } else if (data.type === 'deactivated') {
        // Remove the table from our list
        setTables(prev => prev.filter(t => t.tableNumber !== data.tableNumber));
        
        // Also remove from payment requests if it exists there
        setPaymentRequests(prev => prev.filter(t => t !== data.tableNumber));
        
        toast({
          title: 'Table Deactivated',
          description: `Table ${data.tableNumber} is now inactive`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    });

    return () => {
      socket.off('request-payment-at-register');
      socket.off('table-status-update');
    };
  }, [socket, toast]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/status`, {
        status: newStatus,
      });

      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? { ...order, status: newStatus as Order['status'] } : order
        )
      );

      if (socket) {
        socket.emit('order-status-update', { orderId, status: newStatus });
      }

      // Play completion sound when order is marked as completed
      if (newStatus === 'completed') {
        playSound('completed');
      }

      // Add toast notification for status changes
      const statusMessages = {
        'in-progress': 'Order moved back to In-Progress',
        'completed': 'Order marked as Completed',
      };

      if (statusMessages[newStatus as keyof typeof statusMessages]) {
        toast({
          title: 'Status Updated',
          description: statusMessages[newStatus as keyof typeof statusMessages],
          status: newStatus === 'completed' ? 'success' : 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      } as UseToastOptions);
    }
  };

  const activeOrders = orders.filter(order => 
    order.status !== 'completed' && order.status !== 'cancelled'
  );

  const completedOrders = orders.filter(order => 
    order.status === 'completed'
  ).slice(0, 20); // Show only last 20 completed orders

  // Add this new function to calculate elapsed time
  const calculateElapsedTime = (createdAt: string): string => {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m ago`;
    }
  };

  return (
    <Box height="100vh" bg="gray.100" p={{ base: 2, md: 4 }}>
      {audioElement}
      
      <Stack spacing={{ base: 1, md: 2 }}>
        <Box bg="white" p={{ base: 2, md: 4 }} borderRadius="lg" shadow="sm">
          <HStack align="center" spacing={{ base: 2, md: 8 }}>
            <Heading size={{ base: 'md', md: 'lg' }}>Kitchen Orders</Heading>
            <Spacer />
            <VStack align="center" spacing={1}>
              <Text fontSize={{ base: 'sm', md: 'lg' }} fontWeight="semibold">
                {formatDate(currentTime)}
              </Text>
              <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold">
                {formatTime(currentTime)}
              </Text>
            </VStack>
            <Spacer />
            <HStack spacing={4}>
              <Link to="/admin/tables">
                <Button colorScheme="green" leftIcon={<TimeIcon />}>
                  Tables
                </Button>
              </Link>
              <Link to="/admin/menu">
                <Button colorScheme="blue">
                  Admin
                </Button>
              </Link>
            </HStack>
          </HStack>
        </Box>
        
        {/* Active Tables Section - make bell icon more visible */}
        {tables.length > 0 && (
          <Box bg="white" px={2} py={1} borderRadius="lg" shadow="sm">
            <Flex justify="space-between" align="center">
              <HStack spacing={1}>
                <Text fontSize="xs" fontWeight="medium" color="gray.600">Active Tables:</Text>
                <Badge colorScheme="green" fontSize="xs">{tables.length}</Badge>
              </HStack>
              
              {paymentRequests.length > 0 && (
                <HStack spacing={1}>
                  <Icon as={BellIcon} color="red.500" fontSize="xs" />
                  <Text fontSize="xs" fontWeight="medium" color="red.500">
                    {paymentRequests.length} {paymentRequests.length === 1 ? 'payment' : 'payments'} pending
                  </Text>
                </HStack>
              )}
            </Flex>
            
            <Flex 
              mt={1}
              overflowX="auto" 
              css={{
                '&::-webkit-scrollbar': { height: '4px' },
                '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '4px' },
                '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '4px' },
              }}
            >
              <Wrap spacing={1} flexWrap="nowrap">
                {tables.map(table => (
                  <WrapItem key={table._id}>
                    <Box position="relative">
                      <Tooltip
                        label={
                          paymentRequests.includes(table.tableNumber)
                            ? "Click to complete payment and deactivate table"
                            : `Table ${table.tableNumber} active`
                        }
                        hasArrow
                      >
                        <Flex
                          minW="34px"
                          h="22px"
                          bg={paymentRequests.includes(table.tableNumber) ? "red.50" : "green.50"}
                          border="1px solid"
                          borderColor={paymentRequests.includes(table.tableNumber) ? "red.200" : "green.200"}
                          borderRadius="md"
                          justify="center"
                          align="center"
                          fontWeight="bold"
                          fontSize="xs"
                          color={paymentRequests.includes(table.tableNumber) ? "red.700" : "green.700"}
                          position="relative"
                          cursor={paymentRequests.includes(table.tableNumber) ? "pointer" : "default"}
                          onClick={paymentRequests.includes(table.tableNumber) ? () => openPaymentConfirmation(table.tableNumber) : undefined}
                          _hover={paymentRequests.includes(table.tableNumber) ? { bg: "red.100" } : undefined}
                        >
                          {table.tableNumber}
                          {/* Enhanced bell icon */}
                          {paymentRequests.includes(table.tableNumber) && (
                            <Circle
                              size="16px"
                              bg="red.500"
                              color="white"
                              position="absolute"
                              top="-10px"
                              right="-6px"
                              border="2px solid white"
                              boxShadow="0 0 0 2px rgba(229, 62, 62, 0.3)"
                              zIndex={2}
                            >
                              <Icon as={BellIcon} fontSize="8px" />
                            </Circle>
                          )}
                        </Flex>
                      </Tooltip>
                    </Box>
                  </WrapItem>
                ))}
              </Wrap>
            </Flex>
          </Box>
        )}

        <Tabs variant="soft-rounded" colorScheme="blue">
          <TabList mb={4} justifyContent="center">
            <Tab>Active Orders ({activeOrders.length})</Tab>
            <Tab>Completed Orders ({completedOrders.length})</Tab>
          </TabList>
          <TabPanels>
            {/* Active Orders */}
            <TabPanel p={0}>
              <Grid
                templateColumns={{ 
                  base: "repeat(1, 1fr)", 
                  sm: "repeat(2, 1fr)", 
                  md: "repeat(3, 1fr)", 
                  lg: "repeat(4, 1fr)",
                  xl: "repeat(5, 1fr)"
                }}
                gap={{ base: 4, md: 6 }}
              >
                {activeOrders.map((order) => (
                  <Box
                    key={order._id}
                    bg="white"
                    p={{ base: 3, md: 4 }}
                    borderRadius="lg"
                    shadow="md"
                    borderTop="8px solid"
                    borderColor={
                      order.status === 'pending'
                        ? 'red.400'
                        : 'yellow.400'
                    }
                  >
                    <Stack spacing={{ base: 3, md: 4 }}>
                      <Stack direction="row" justify="space-between" align="center">
                        <Heading size={{ base: 'sm', md: 'lg' }}>Table {order.tableNumber}</Heading>
                        <HStack>
                          {order.status === 'in-progress' && (
                            <Spinner size="sm" color="yellow.500" speed="0.8s" />
                          )}
                          <Badge
                            colorScheme={
                              order.status === 'pending'
                                ? 'red'
                                : order.status === 'in-progress'
                                ? 'yellow'
                                : 'green'
                            }
                            fontSize={{ base: 'sm', md: 'lg' }}
                            p={{ base: 1, md: 2 }}
                            borderRadius="md"
                          >
                            {order.status}
                          </Badge>
                        </HStack>
                      </Stack>

                      <Stack spacing={{ base: 2, md: 3 }}>
                        {order.items.map((item, index) => (
                          <Box key={index} p={{ base: 2, md: 3 }} bg="gray.50" borderRadius="md">
                            <Text fontSize={{ base: 'md', md: 'xl' }} fontWeight="bold">
                              {item.quantity}x {item.menuItem.name}
                            </Text>
                            {Object.entries(item.selectedOptions).map(([key, value]) => (
                              <Text key={key} fontSize={{ base: 'sm', md: 'md' }} color="gray.600">
                                {key}: {value}
                              </Text>
                            ))}
                            {item.specialInstructions && (
                              <Text fontSize={{ base: 'sm', md: 'md' }} color="red.600" mt={2}>
                                Note: {item.specialInstructions}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Stack>

                      <Stack direction="row" justify="space-between" align="center">
                        <Text fontSize="xs" color="gray.500">
                          <TimeIcon mr={1} />
                          Received: {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {calculateElapsedTime(order.createdAt)}
                        </Text>
                      </Stack>

                      <Stack direction="row">
                        {order.status === 'pending' && (
                          <Button
                            colorScheme="yellow"
                            onClick={() => handleStatusUpdate(order._id, 'in-progress')}
                            width="100%"
                            size={{ base: 'sm', md: 'lg' }}
                            height={{ base: '40px', md: '60px' }}
                            fontSize={{ base: 'md', md: 'xl' }}
                          >
                            Start Preparing
                          </Button>
                        )}
                        {order.status === 'in-progress' && (
                          <Button
                            colorScheme="green"
                            onClick={() => handleStatusUpdate(order._id, 'completed')}
                            width="100%"
                            size={{ base: 'sm', md: 'lg' }}
                            height={{ base: '40px', md: '60px' }}
                            fontSize={{ base: 'md', md: 'xl' }}
                          >
                            Mark Completed
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Grid>
            </TabPanel>

            {/* Completed Orders */}
            <TabPanel p={0}>
              <Grid
                templateColumns={{ 
                  base: "repeat(1, 1fr)", 
                  sm: "repeat(2, 1fr)", 
                  md: "repeat(2, 1fr)", 
                  lg: "repeat(3, 1fr)",
                  xl: "repeat(4, 1fr)"
                }}
                gap={{ base: 3, md: 4 }}
              >
                {completedOrders.map((order) => (
                  <Box
                    key={order._id}
                    bg="white"
                    p={{ base: 2, sm: 3 }}
                    borderRadius="lg"
                    shadow="md"
                    opacity={0.7}
                    maxW="100%"
                    overflow="hidden"
                  >
                    <Stack spacing={{ base: 2, md: 3 }}>
                      <Stack direction="row" justify="space-between" wrap="wrap">
                        <Heading size={{ base: 'xs', sm: 'sm' }}>Table {order.tableNumber}</Heading>
                        <Badge colorScheme="green" fontSize={{ base: 'xs', md: 'sm' }} p={{ base: 1 }} borderRadius="md">
                          {order.status}
                        </Badge>
                      </Stack>
                      <Stack spacing={{ base: 1, md: 2 }}>
                        {order.items.map((item, index) => (
                          <Box key={index} p={{ base: 1, md: 2 }} bg="gray.50" borderRadius="md">
                            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="bold" noOfLines={1}>
                              {item.quantity}x {item.menuItem.name}
                            </Text>
                          </Box>
                        ))}
                      </Stack>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Completed at: {new Date(order.createdAt).toLocaleTimeString()} {/* We need an updatedAt field for accuracy */}
                      </Text>
                    </Stack>
                  </Box>
                ))}
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
      
      {/* Payment Confirmation Dialog */}
      <AlertDialog
        isOpen={confirmingPayment !== null}
        leastDestructiveRef={confirmRef}
        onClose={() => setConfirmingPayment(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Complete Payment for Table {confirmingPayment}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to mark this table as paid and deactivate it? This will remove the table from active tables.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={confirmRef} onClick={() => setConfirmingPayment(null)}>
                Cancel
              </Button>
              <Button 
                colorScheme="green" 
                onClick={confirmPaymentAndDeactivate} 
                ml={3}
                isLoading={isProcessing}
                loadingText="Processing"
              >
                Confirm
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default KitchenDisplay; 