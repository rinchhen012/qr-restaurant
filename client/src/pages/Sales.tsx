import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Spacer,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Input,
  Select,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useToast,
  Divider,
  Spinner,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { SearchIcon, CalendarIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

// Define interface for Order
interface MenuItem {
  _id: string;
  name: string;
  price: number;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

interface Order {
  _id: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  completedAt?: string;
  paidAt?: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const Sales: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      // Sort orders by creation date (newest first)
      const sortedOrders = response.data.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
    } catch (error) {
      toast({
        title: 'Error fetching orders',
        description: 'Could not load sales history',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, dateFilter, statusFilter, orders]);

  const applyFilters = () => {
    let result = [...orders];

    // Filter by payment status
    if (statusFilter !== 'all') {
      result = result.filter(order => order.paymentStatus === statusFilter);
    }

    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'today') {
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= today;
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= weekAgo;
      });
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthAgo;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        // Search by table number
        order.tableNumber.toString().includes(term) ||
        // Search by order items
        order.items.some(item => 
          item.menuItem?.name.toLowerCase().includes(term)
        )
      );
    }

    setFilteredOrders(result);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    onOpen();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd HH:mm');
  };

  const calculateTotalSales = () => {
    return filteredOrders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((total, order) => total + order.totalAmount, 0);
  };

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        <Flex align="center" wrap="wrap">
          <Heading size="lg">Sales</Heading>
          <Spacer />
          <Link to="/admin/tables">
            <Button colorScheme="blue" size="sm" mr={2}>
              Back to Tables
            </Button>
          </Link>
          <Button colorScheme="green" size="sm" onClick={fetchOrders}>
            Refresh
          </Button>
        </Flex>

        {/* Filters */}
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={4}>
          <InputGroup maxW={{ base: '100%', md: '250px' }}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by table or item"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Select
            maxW={{ base: '100%', md: '200px' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </Select>

          <Select
            maxW={{ base: '100%', md: '200px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Flex>

        {/* Summary Box */}
        <Box bg="white" p={4} borderRadius="md" shadow="sm">
          <Flex justifyContent="space-between" wrap="wrap" gap={3}>
            <Box>
              <Text fontWeight="bold">Total Orders</Text>
              <Text fontSize="xl">{filteredOrders.length}</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Paid Orders</Text>
              <Text fontSize="xl">{filteredOrders.filter(o => o.paymentStatus === 'paid').length}</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Total Sales</Text>
              <Text fontSize="xl" color="green.600">¥{calculateTotalSales().toLocaleString('ja-JP')}</Text>
            </Box>
          </Flex>
        </Box>

        {/* Orders Table */}
        {isLoading ? (
          <Flex justify="center" align="center" h="200px">
            <Spinner size="xl" />
          </Flex>
        ) : (
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Table</Th>
                  <Th>Items</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredOrders.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={6}>
                      No orders found.
                    </Td>
                  </Tr>
                ) : (
                  filteredOrders.map((order) => (
                    <Tr key={order._id} _hover={{ bg: 'gray.50' }}>
                      <Td fontSize="sm">{formatDate(order.createdAt)}</Td>
                      <Td>{order.tableNumber}</Td>
                      <Td>
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </Td>
                      <Td>
                        <Badge colorScheme={
                          order.status === 'completed' ? 'green' :
                          order.status === 'in-progress' ? 'orange' :
                          order.status === 'cancelled' ? 'red' : 'blue'
                        }>
                          {order.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={
                          order.paymentStatus === 'paid' ? 'green' :
                          order.paymentStatus === 'cancelled' ? 'red' : 'yellow'
                        }>
                          {order.paymentStatus}
                        </Badge>
                      </Td>
                      <Td isNumeric>¥{order.totalAmount.toLocaleString('ja-JP')}</Td>
                      <Td>
                        <Button
                          size="xs"
                          onClick={() => handleViewOrder(order)}
                        >
                          View Details
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </VStack>

      {/* Order Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedOrder && (
              <VStack align="stretch" spacing={4}>
                <Flex justifyContent="space-between" wrap="wrap">
                  <Text fontWeight="bold">Table: {selectedOrder.tableNumber}</Text>
                  <Text>Order ID: {selectedOrder._id.substring(0, 8)}...</Text>
                </Flex>
                
                <Box>
                  <Text fontWeight="bold">Order Date:</Text>
                  <Text>{formatDate(selectedOrder.createdAt)}</Text>
                </Box>
                
                {selectedOrder.paidAt && (
                  <Box>
                    <Text fontWeight="bold">Paid Date:</Text>
                    <Text>{formatDate(selectedOrder.paidAt)}</Text>
                  </Box>
                )}
                
                <Box>
                  <HStack mb={1}>
                    <Text fontWeight="bold">Status:</Text>
                    <Badge colorScheme={
                      selectedOrder.status === 'completed' ? 'green' :
                      selectedOrder.status === 'in-progress' ? 'orange' :
                      selectedOrder.status === 'cancelled' ? 'red' : 'blue'
                    }>
                      {selectedOrder.status}
                    </Badge>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold">Payment:</Text>
                    <Badge colorScheme={
                      selectedOrder.paymentStatus === 'paid' ? 'green' :
                      selectedOrder.paymentStatus === 'cancelled' ? 'red' : 'yellow'
                    }>
                      {selectedOrder.paymentStatus}
                    </Badge>
                  </HStack>
                </Box>
                
                <Divider />
                
                <Text fontWeight="bold">Order Items:</Text>
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Item</Th>
                        <Th isNumeric>Price</Th>
                        <Th isNumeric>Qty</Th>
                        <Th isNumeric>Subtotal</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <Tr key={idx}>
                          <Td>{item.menuItem?.name || 'Unknown Item'}</Td>
                          <Td isNumeric>¥{item.menuItem?.price.toLocaleString('ja-JP')}</Td>
                          <Td isNumeric>{item.quantity}</Td>
                          <Td isNumeric>
                            ¥{((item.menuItem?.price || 0) * item.quantity).toLocaleString('ja-JP')}
                          </Td>
                        </Tr>
                      ))}
                      <Tr fontWeight="bold">
                        <Td colSpan={3} textAlign="right">Total:</Td>
                        <Td isNumeric>¥{selectedOrder.totalAmount.toLocaleString('ja-JP')}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
                
                {selectedOrder.items.some(item => item.specialInstructions) && (
                  <Box>
                    <Text fontWeight="bold">Special Instructions:</Text>
                    {selectedOrder.items
                      .filter(item => item.specialInstructions)
                      .map((item, idx) => (
                        <Text key={idx}>
                          {item.menuItem?.name}: {item.specialInstructions}
                        </Text>
                      ))}
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default Sales; 