import React, { useEffect, useState, useCallback } from 'react';
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
} from '@chakra-ui/react';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import { ArrowBackIcon } from '@chakra-ui/icons';
import axios, { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';

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

const KitchenDisplay: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { socket } = useSocket();
  const toast = useToast();
  const { login } = useAuth();

  // Sound notification function
  const playSound = (type: 'new-order' | 'completed' | 'special-request') => {
    const soundMap = {
      'new-order': '/new-order.mp3',
      'completed': '/completed.mp3',
      'special-request': '/notification.mp3'
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
      const response = await axios.get<Order[]>('http://localhost:5000/api/orders');
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

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
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

  return (
    <Box height="100vh" bg="gray.100" p={4}>
      <Stack spacing={6}>
        <Box bg="white" p={4} borderRadius="lg" shadow="sm">
          <HStack align="center" spacing={8}>
            <Heading size="lg">Kitchen Orders</Heading>
            <Spacer />
            <VStack align="flex-end" spacing={1}>
              <Text fontSize="lg" fontWeight="semibold">
                {formatDate(currentTime)}
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {formatTime(currentTime)}
              </Text>
            </VStack>
          </HStack>
        </Box>

        <Tabs variant="enclosed" colorScheme="blue" bg="white" borderRadius="lg" shadow="sm">
          <TabList>
            <Tab fontWeight="semibold">
              Active Orders {activeOrders.length > 0 && `(${activeOrders.length})`}
            </Tab>
            <Tab fontWeight="semibold">
              Completed Orders {completedOrders.length > 0 && `(${completedOrders.length})`}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={4}>
              <Grid 
                templateColumns="repeat(auto-fill, minmax(350px, 1fr))" 
                gap={6}
                overflowY="auto"
                maxHeight="calc(100vh - 220px)"
              >
                {activeOrders.map((order) => (
                  <Box
                    key={order._id}
                    borderWidth="2px"
                    borderRadius="lg"
                    p={6}
                    bg={order.status === 'pending' ? 'red.50' : 'green.50'}
                    shadow="md"
                    _hover={{ shadow: 'lg' }}
                    transition="all 0.2s"
                  >
                    <Stack spacing={4}>
                      <Stack direction="row" justify="space-between">
                        <Heading size="lg">Table {order.tableNumber}</Heading>
                        <Badge
                          colorScheme={
                            order.status === 'pending'
                              ? 'red'
                              : order.status === 'in-progress'
                              ? 'yellow'
                              : 'green'
                          }
                          fontSize="lg"
                          p={2}
                          borderRadius="md"
                        >
                          {order.status}
                        </Badge>
                      </Stack>

                      <Stack spacing={3}>
                        {order.items.map((item, index) => (
                          <Box key={index} p={3} bg="white" borderRadius="md">
                            <Text fontSize="xl" fontWeight="bold">
                              {item.quantity}x {item.menuItem.name}
                            </Text>
                            {Object.entries(item.selectedOptions).map(([key, value]) => (
                              <Text key={key} fontSize="md" color="gray.600">
                                {key}: {value}
                              </Text>
                            ))}
                            {item.specialInstructions && (
                              <Text fontSize="md" color="red.600" mt={2}>
                                Note: {item.specialInstructions}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Stack>

                      {order.specialRequests.length > 0 && (
                        <Box bg="purple.50" p={3} borderRadius="md">
                          <Text fontWeight="bold" mb={2}>Special Requests:</Text>
                          <HStack spacing={2} flexWrap="wrap">
                            {order.specialRequests.map((request, index) => (
                              <Badge 
                                key={index} 
                                colorScheme="purple" 
                                fontSize="md"
                                p={2}
                                borderRadius="md"
                              >
                                {request}
                              </Badge>
                            ))}
                          </HStack>
                        </Box>
                      )}

                      <Text fontSize="md" color="gray.500">
                        Ordered at: {new Date(order.createdAt).toLocaleTimeString()}
                      </Text>

                      <Stack direction="row">
                        {order.status === 'pending' && (
                          <Button
                            colorScheme="yellow"
                            onClick={() => handleStatusUpdate(order._id, 'in-progress')}
                            width="100%"
                            size="lg"
                            height="60px"
                            fontSize="xl"
                          >
                            Start Preparing
                          </Button>
                        )}
                        {order.status === 'in-progress' && (
                          <Button
                            colorScheme="green"
                            onClick={() => handleStatusUpdate(order._id, 'completed')}
                            width="100%"
                            size="lg"
                            height="60px"
                            fontSize="xl"
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

            <TabPanel p={4}>
              <Grid 
                templateColumns="repeat(auto-fill, minmax(350px, 1fr))" 
                gap={6}
                overflowY="auto"
                maxHeight="calc(100vh - 220px)"
              >
                {completedOrders.map((order) => (
                  <Box
                    key={order._id}
                    borderWidth="2px"
                    borderRadius="lg"
                    p={6}
                    bg="gray.50"
                    shadow="md"
                    opacity={0.8}
                  >
                    <Stack spacing={4}>
                      <Stack direction="row" justify="space-between">
                        <Heading size="lg">Table {order.tableNumber}</Heading>
                        <Badge
                          colorScheme="green"
                          fontSize="lg"
                          p={2}
                          borderRadius="md"
                        >
                          Completed
                        </Badge>
                      </Stack>

                      <Stack spacing={3}>
                        {order.items.map((item, index) => (
                          <Box key={index} p={3} bg="white" borderRadius="md">
                            <Text fontSize="xl" fontWeight="bold">
                              {item.quantity}x {item.menuItem.name}
                            </Text>
                          </Box>
                        ))}
                      </Stack>

                      <Text fontSize="md" color="gray.500">
                        Completed at: {new Date(order.createdAt).toLocaleTimeString()}
                      </Text>

                      <Button
                        colorScheme="yellow"
                        onClick={() => handleStatusUpdate(order._id, 'in-progress')}
                        width="100%"
                        size="lg"
                        height="50px"
                        fontSize="lg"
                        variant="outline"
                      >
                        Revert to In-Progress
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Grid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Box>
  );
};

export default KitchenDisplay; 