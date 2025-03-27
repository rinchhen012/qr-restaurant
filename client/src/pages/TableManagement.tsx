import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
  Badge,
  useToast,
  IconButton,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon, TimeIcon } from '@chakra-ui/icons';
import axios from 'axios';

interface Table {
  _id: string;
  tableNumber: number;
  isActive: boolean;
  currentOrderId?: string;
  lastActivatedAt?: string;
  lastDeactivatedAt?: string;
}

interface Order {
  _id: string;
  tableNumber: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TableManagement: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const toast = useToast();

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tables',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchOrders();
  }, []);

  const handleToggleTable = async (tableNumber: number, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await axios.post(`${API_URL}/api/tables/${tableNumber}/${endpoint}`);
      fetchTables();
      toast({
        title: `Table ${tableNumber} ${isActive ? 'deactivated' : 'activated'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update table status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      await axios.put(`${API_URL}/api/orders/${orderId}/payment-status`, {
        paymentStatus: 'paid'
      });
      fetchOrders();
      toast({
        title: 'Order marked as paid',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getTableOrder = (tableNumber: number) => {
    return orders.find(order => 
      order.tableNumber === tableNumber && 
      order.paymentStatus === 'pending'
    );
  };

  const getActiveOrdersCount = () => {
    return orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').length;
  };

  const getPendingPaymentsCount = () => {
    return orders.filter(order => order.paymentStatus === 'pending').length;
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Table Management</Heading>

        {/* Statistics */}
        <Grid templateColumns="repeat(3, 1fr)" gap={6}>
          <Stat
            px={4}
            py={3}
            bg="white"
            rounded="lg"
            shadow="sm"
          >
            <StatLabel>Active Tables</StatLabel>
            <StatNumber>{tables.filter(t => t.isActive).length}</StatNumber>
            <StatHelpText>Out of {tables.length} total tables</StatHelpText>
          </Stat>
          <Stat
            px={4}
            py={3}
            bg="white"
            rounded="lg"
            shadow="sm"
          >
            <StatLabel>Active Orders</StatLabel>
            <StatNumber>{getActiveOrdersCount()}</StatNumber>
            <StatHelpText>Currently being processed</StatHelpText>
          </Stat>
          <Stat
            px={4}
            py={3}
            bg="white"
            rounded="lg"
            shadow="sm"
          >
            <StatLabel>Pending Payments</StatLabel>
            <StatNumber>{getPendingPaymentsCount()}</StatNumber>
            <StatHelpText>Awaiting payment</StatHelpText>
          </Stat>
        </Grid>

        {/* Tables Grid */}
        <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
          {tables.map((table) => {
            const currentOrder = getTableOrder(table.tableNumber);
            return (
              <Box
                key={table._id}
                p={6}
                bg="white"
                rounded="lg"
                shadow="sm"
                borderWidth="1px"
                borderColor={table.isActive ? 'green.200' : 'gray.200'}
              >
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Heading size="md">Table {table.tableNumber}</Heading>
                    <Badge
                      colorScheme={table.isActive ? 'green' : 'gray'}
                      fontSize="sm"
                    >
                      {table.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </HStack>

                  {currentOrder && (
                    <Box p={3} bg="gray.50" rounded="md">
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Current Order
                      </Text>
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <Text fontSize="sm">Total Amount:</Text>
                          <Text fontSize="sm" fontWeight="bold">
                            ¥{currentOrder.totalAmount.toLocaleString('ja-JP')}
                          </Text>
                        </HStack>
                        <Button
                          size="sm"
                          colorScheme="green"
                          leftIcon={<CheckIcon />}
                          onClick={() => handleMarkAsPaid(currentOrder._id)}
                        >
                          Mark as Paid
                        </Button>
                      </VStack>
                    </Box>
                  )}

                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.500">
                      Last {table.isActive ? 'activated' : 'deactivated'}:{' '}
                      {table.isActive
                        ? new Date(table.lastActivatedAt!).toLocaleString('ja-JP')
                        : table.lastDeactivatedAt
                        ? new Date(table.lastDeactivatedAt).toLocaleString('ja-JP')
                        : 'Never'}
                    </Text>
                    <Tooltip label={table.isActive ? 'Deactivate table' : 'Activate table'}>
                      <IconButton
                        aria-label={table.isActive ? 'Deactivate table' : 'Activate table'}
                        icon={table.isActive ? <CloseIcon /> : <CheckIcon />}
                        colorScheme={table.isActive ? 'red' : 'green'}
                        onClick={() => handleToggleTable(table.tableNumber, table.isActive)}
                        isDisabled={table.isActive && currentOrder !== undefined}
                      />
                    </Tooltip>
                  </HStack>
                </VStack>
              </Box>
            );
          })}
        </Grid>
      </VStack>
    </Container>
  );
};

export default TableManagement; 