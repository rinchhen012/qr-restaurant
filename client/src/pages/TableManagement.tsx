import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Flex,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  SimpleGrid,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon, TimeIcon, AddIcon, DeleteIcon, DragHandleIcon, SettingsIcon, InfoIcon } from '@chakra-ui/icons';
import axios from 'axios';

interface TablePosition {
  x: number;
  y: number;
}

// Constants for grid snapping
const GRID_SIZE = 20; // Size of grid cells in pixels
const SNAP_THRESHOLD = 15; // Distance in pixels to snap to grid or other tables

interface Table {
  _id: string;
  tableNumber: number;
  isActive: boolean;
  currentOrderId?: string;
  lastActivatedAt?: string;
  lastDeactivatedAt?: string;
  position: TablePosition;
  shape: 'square' | 'round' | 'rectangle';
}

interface Order {
  _id: string;
  tableNumber: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  items: Array<{
    menuItem: any;
    quantity: number;
    selectedOptions?: Record<string, string>;
    specialInstructions?: string;
  }>;
  createdAt: string;
}

interface FloorPlan {
  _id: string;
  name: string;
  tables: Table[];
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const TableManagement: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newTableCount, setNewTableCount] = useState(1);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [floorPlanName, setFloorPlanName] = useState('Default Floor Plan');
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true); // Whether to show alignment grid
  const toast = useToast();
  const floorPlanRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isTableModalOpen, 
    onOpen: onTableModalOpen, 
    onClose: onTableModalClose 
  } = useDisclosure();
  const [dragPosition, setDragPosition] = useState<TablePosition | null>(null);
  const [draggedTableData, setDraggedTableData] = useState<Table | null>(null);
  const [tableToToggle, setTableToToggle] = useState<Table | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { 
    isOpen: isStatusChangeOpen, 
    onOpen: onStatusChangeOpen, 
    onClose: onStatusChangeClose 
  } = useDisclosure();
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTableBg = useColorModeValue('green.100', 'green.900');
  const inactiveTableBg = useColorModeValue('red.100', 'red.900');
  const activeBorder = useColorModeValue('green.500', 'green.200');
  const inactiveBorder = useColorModeValue('red.500', 'red.200');
  const tableTextColor = useColorModeValue('gray.800', 'white');

  // Calculate duration since activation in minutes
  const calculateActiveDuration = useCallback((lastActivatedAt?: string): number => {
    if (!lastActivatedAt) return 0;
    const activatedTime = new Date(lastActivatedAt).getTime();
    const currentTime = new Date().getTime();
    return Math.floor((currentTime - activatedTime) / (1000 * 60));
  }, []);

  // Update timers every minute
  useEffect(() => {
    const updateTimers = () => {
      const newTimers: Record<number, number> = {};
      
      tables.filter(table => table.isActive).forEach(table => {
        newTimers[table.tableNumber] = calculateActiveDuration(table.lastActivatedAt);
      });
      
      setActiveTimers(newTimers);
    };
    
    // Initialize timers
    updateTimers();
    
    // Set up interval to update timers every minute
    timerIntervalRef.current = setInterval(updateTimers, 60000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [tables, calculateActiveDuration]);

  // Update timers when fetching tables
  useEffect(() => {
    const newTimers: Record<number, number> = {};
    
    tables.filter(table => table.isActive).forEach(table => {
      newTimers[table.tableNumber] = calculateActiveDuration(table.lastActivatedAt);
    });
    
    setActiveTimers(newTimers);
  }, [tables, calculateActiveDuration]);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tables`);
      // If tables don't have positions, assign default ones
      const tablesWithPositions = response.data.map((table: Table, index: number) => {
        if (!table.position) {
          return {
            ...table,
            position: { x: 50 + (index % 5) * 120, y: 50 + Math.floor(index / 5) * 120 },
            shape: table.shape || 'square'
          };
        }
        return {
          ...table,
          shape: table.shape || 'square'
        };
      });
      setTables(tablesWithPositions);
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
    fetchFloorPlans();
  }, []);

  const fetchFloorPlans = async () => {
    try {
      // Try to get the default floor plan first
      try {
        const defaultResponse = await axios.get(`${API_URL}/api/floorplans/default`);
        if (defaultResponse.data) {
          setFloorPlans([defaultResponse.data]);
          setSelectedFloorPlan(defaultResponse.data);
          setFloorPlanName(defaultResponse.data.name);
          return;
        }
      } catch (error) {
        console.log('No default floor plan found, will try to fetch all or create one');
      }

      // If no default floor plan, try to get all floor plans
      const response = await axios.get(`${API_URL}/api/floorplans`);
      let plans = response.data;
      
      if (plans.length === 0) {
        // No floor plans exist, create a new one on the server side
        const createResponse = await axios.post(`${API_URL}/api/floorplans`, {
          name: 'Default Floor Plan',
          tables: tables.map(table => table._id),
          isDefault: true
        });
        
        setFloorPlans([createResponse.data]);
        setSelectedFloorPlan(createResponse.data);
      } else {
        setFloorPlans(plans);
        setSelectedFloorPlan(plans[0]);
        setFloorPlanName(plans[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch floor plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch floor plans',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

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
      console.log('Marking order as paid:', orderId);
      const response = await axios.put(`${API_URL}/api/orders/${orderId}/payment-status`, {
        paymentStatus: 'paid'
      });
      console.log('Mark as paid response:', response.data);
      
      // Refresh orders list
      await fetchOrders();
      
      toast({
        title: 'Order marked as paid',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Failed to mark order as paid:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update payment status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddTables = async () => {
    try {
      // Get the current highest table number
      const highestTableNumber = tables.length > 0 
        ? Math.max(...tables.map(t => t.tableNumber))
        : 0;
      
      const newTables = [];
      
      // Create the specified number of new tables
      for (let i = 0; i < newTableCount; i++) {
        const tableNumber = highestTableNumber + i + 1;
        
        // Calculate position for the new table
        // Arrange in a grid pattern
        const position = {
          x: 50 + (tableNumber % 5) * 120,
          y: 50 + Math.floor(tableNumber / 5) * 120
        };
        
        const newTable = {
          tableNumber,
          isActive: false,
          position,
          shape: 'square' as const
        };
        
        const response = await axios.post(`${API_URL}/api/tables`, newTable);
        newTables.push(response.data);
      }
      
      // Update tables state with new tables
      setTables([...tables, ...newTables]);
      
      toast({
        title: `${newTableCount} new table${newTableCount > 1 ? 's' : ''} added`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset the new table count
      setNewTableCount(1);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add tables',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditTable = (table: Table) => {
    setSelectedTable(table);
    onTableModalOpen();
  };

  const handleSaveTableChanges = async () => {
    if (!selectedTable) return;
    
    try {
      await axios.put(`${API_URL}/api/tables/${selectedTable._id}`, {
        shape: selectedTable.shape
      });
      
      // Update tables state
      const updatedTables = tables.map(t => 
        t._id === selectedTable._id ? selectedTable : t
      );
      setTables(updatedTables);
      
      toast({
        title: `Table ${selectedTable.tableNumber} updated`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onTableModalClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update table',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteTable = async (tableId: string, tableNumber: number) => {
    try {
      await axios.delete(`${API_URL}/api/tables/${tableId}`);
      
      // Update tables state
      setTables(tables.filter(t => t._id !== tableId));
      
      toast({
        title: `Table ${tableNumber} deleted`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete table',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSaveFloorPlan = async () => {
    try {
      // Prepare the table data - we only need the IDs
      const tableIds = tables.map(table => table._id);
      
      if (selectedFloorPlan) {
        // Update existing floor plan
        await axios.put(`${API_URL}/api/floorplans/${selectedFloorPlan._id}`, {
          name: floorPlanName,
          tables: tableIds
        });
      } else {
        // Create new floor plan
        const response = await axios.post(`${API_URL}/api/floorplans`, {
          name: floorPlanName,
          tables: tableIds,
          isDefault: true
        });
        
        setFloorPlans([...floorPlans, response.data]);
        setSelectedFloorPlan(response.data);
      }
      
      toast({
        title: 'Floor plan saved',
        description: `"${floorPlanName}" saved successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error saving floor plan:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save floor plan',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getTableOrder = (tableNumber: number) => {
    // First try to find in-progress orders
    const activeOrder = orders.find(order => 
      order.tableNumber === tableNumber && 
      (order.status === 'pending' || order.status === 'in-progress')
    );
    
    if (activeOrder) return activeOrder;
    
    // If no active order but table is active, find the most recent completed order
    const table = tables.find(t => t.tableNumber === tableNumber);
    
    if (table?.isActive) {
      // Find all completed orders for this table
      const completedOrders = orders.filter(order => 
        order.tableNumber === tableNumber && 
        order.status === 'completed'
      );
      
      // Sort by creation date (most recent first)
      const sortedOrders = completedOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Return the most recent completed order
      return sortedOrders[0];
    }
    
    return undefined;
  };

  const getActiveOrdersCount = () => {
    return orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').length;
  };

  const getPendingPaymentsCount = () => {
    return orders.filter(order => order.paymentStatus === 'pending').length;
  };

  const handleDragStart = (e: React.DragEvent, tableId: string) => {
    if (!isEditMode) return;
    setDraggedTable(tableId);
    
    // Store the table data for the preview
    const table = tables.find(t => t._id === tableId);
    if (table) {
      setDraggedTableData(table);
    }
    
    // Set a ghost image for drag (optional)
    if (e.dataTransfer.setDragImage) {
      const dragGhost = document.createElement('div');
      dragGhost.classList.add('drag-ghost');
      dragGhost.innerHTML = `Table`;
      document.body.appendChild(dragGhost);
      e.dataTransfer.setDragImage(dragGhost, 0, 0);
      setTimeout(() => {
        document.body.removeChild(dragGhost);
      }, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode || !floorPlanRef.current || !draggedTable) return;
    e.preventDefault();
    
    // Calculate position relative to the floor plan
    const floorPlanRect = floorPlanRef.current.getBoundingClientRect();
    const rawX = e.clientX - floorPlanRect.left;
    const rawY = e.clientY - floorPlanRect.top;
    
    // Apply snapping for the preview
    const snappedPosition = findClosestAlignment({ x: rawX, y: rawY }, draggedTable);
    setDragPosition(snappedPosition);
  };

  const handleDragEnd = () => {
    setDragPosition(null);
    setDraggedTableData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditMode || !draggedTable || !floorPlanRef.current) return;
    e.preventDefault();
    
    // Calculate position relative to the floor plan
    const floorPlanRect = floorPlanRef.current.getBoundingClientRect();
    const rawX = e.clientX - floorPlanRect.left;
    const rawY = e.clientY - floorPlanRect.top;
    
    // Apply snapping
    const { x, y } = findClosestAlignment({ x: rawX, y: rawY }, draggedTable);
    
    // Update the table position
    const updatedTables = tables.map(table => 
      table._id === draggedTable 
        ? { ...table, position: { x, y } } 
        : table
    );
    
    setTables(updatedTables);
    
    // Save to backend
    const tableToUpdate = updatedTables.find(t => t._id === draggedTable);
    if (tableToUpdate) {
      saveTablePosition(draggedTable, tableToUpdate.position);
    }
    
    // Clear drag state
    setDraggedTable(null);
    setDragPosition(null);
    setDraggedTableData(null);
  };

  const saveTablePosition = async (tableId: string, position: TablePosition) => {
    try {
      await axios.put(`${API_URL}/api/tables/${tableId}/position`, { position });
    } catch (error) {
      console.error('Failed to save table position:', error);
    }
  };

  // Helper function to snap a position to grid
  const snapToGrid = (position: TablePosition): TablePosition => {
    return {
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE
    };
  };

  // Helper function to find closest table position for alignment
  const findClosestAlignment = (position: TablePosition, tableId: string): TablePosition => {
    // First, get positions of all other tables
    const otherTables = tables.filter(t => t._id !== tableId);
    
    let snappedPosition = {...position};
    let minDistanceX = SNAP_THRESHOLD;
    let minDistanceY = SNAP_THRESHOLD;
    
    // Check for alignment with other tables
    for (const table of otherTables) {
      // Check for horizontal alignment (same y-coordinate)
      const distanceY = Math.abs(table.position.y - position.y);
      if (distanceY < minDistanceY) {
        minDistanceY = distanceY;
        snappedPosition.y = table.position.y;
      }
      
      // Check for vertical alignment (same x-coordinate)
      const distanceX = Math.abs(table.position.x - position.x);
      if (distanceX < minDistanceX) {
        minDistanceX = distanceX;
        snappedPosition.x = table.position.x;
      }
    }
    
    // If no close alignment with other tables, snap to grid
    if (minDistanceX === SNAP_THRESHOLD && minDistanceY === SNAP_THRESHOLD) {
      return snapToGrid(position);
    }
    
    return snappedPosition;
  };

  const handleTableClick = (table: Table) => {
    if (!isEditMode) {
      // Set the selected table and open the confirmation dialog
      setTableToToggle(table);
      onStatusChangeOpen();
    } else {
      handleEditTable(table);
    }
  };

  const confirmToggleTable = () => {
    if (tableToToggle) {
      handleToggleTable(tableToToggle.tableNumber, tableToToggle.isActive);
      onStatusChangeClose();
    }
  };

  // Format date helper
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const countOrderItems = (order: Order) => {
    if (!order.items || !Array.isArray(order.items)) return 0;
    return order.items.reduce((total, item: any) => total + (item.quantity || 1), 0);
  };

  // Format duration to display in HH:MM format
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between">
          <Heading>Table Management</Heading>
          <HStack>
            <Button
              colorScheme={isEditMode ? "orange" : "blue"}
              onClick={() => setIsEditMode(!isEditMode)}
              leftIcon={<SettingsIcon />}
            >
              {isEditMode ? "Exit Edit Mode" : "Edit Layout"}
            </Button>
            {isEditMode && (
              <Button 
                colorScheme="green" 
                leftIcon={<AddIcon />}
                onClick={onOpen}
              >
                Add Tables
              </Button>
            )}
          </HStack>
        </HStack>

        {/* Statistics */}
        {!isEditMode && (
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
        )}

        {/* Floor Plan Name and Controls */}
        <HStack justify="space-between">
          {isEditMode ? (
            <Input
              value={floorPlanName}
              onChange={(e) => setFloorPlanName(e.target.value)}
              placeholder="Floor Plan Name"
              width="300px"
            />
          ) : (
            <Heading size="md">{floorPlanName}</Heading>
          )}
          
          {isEditMode && (
            <HStack>
              <Button
                size="sm"
                colorScheme="gray"
                onClick={() => setShowGrid(!showGrid)}
                leftIcon={showGrid ? <CheckIcon /> : undefined}
              >
                {showGrid ? "Hide Grid" : "Show Grid"}
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSaveFloorPlan}
              >
                Save Floor Plan
              </Button>
            </HStack>
          )}
        </HStack>

        {/* Floor Plan Area with Grid */}
        <Box
          ref={floorPlanRef}
          position="relative"
          h="600px"
          bg="gray.100"
          rounded="lg"
          border="2px dashed"
          borderColor="gray.300"
          overflow="hidden"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          backgroundImage={showGrid && isEditMode ? `linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), 
                            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)` : "none"}
          backgroundSize={`${GRID_SIZE}px ${GRID_SIZE}px`}
        >
          {/* Drop Preview */}
          {dragPosition && draggedTableData && isEditMode && (
            <Box
              position="absolute"
              left={`${dragPosition.x}px`}
              top={`${dragPosition.y}px`}
              w={draggedTableData.shape === 'rectangle' ? '160px' : '120px'}
              h={draggedTableData.shape === 'rectangle' ? '100px' : '120px'}
              bg="blue.100"
              border="2px dashed"
              borderColor="blue.500"
              rounded={draggedTableData.shape === 'round' ? 'full' : 'md'}
              opacity="0.7"
              display="flex"
              justifyContent="center"
              alignItems="center"
              zIndex={0}
              pointerEvents="none"
            >
              <Text fontWeight="bold" color="blue.700">Table {draggedTableData.tableNumber}</Text>
            </Box>
          )}
          
          {/* Alignment Guides */}
          {draggedTable && isEditMode && (
            <>
              {tables.filter(t => t._id !== draggedTable).map((table) => (
                <React.Fragment key={`guide-${table._id}`}>
                  {/* Horizontal alignment guide */}
                  <Box
                    position="absolute"
                    left="0"
                    top={`${table.position.y + (table.shape === 'rectangle' ? 40 : 40)}px`}
                    width="100%"
                    height="1px"
                    bg="blue.400"
                    opacity="0.5"
                    zIndex={0}
                    pointerEvents="none"
                  />
                  {/* Vertical alignment guide */}
                  <Box
                    position="absolute"
                    left={`${table.position.x + (table.shape === 'rectangle' ? 60 : 40)}px`}
                    top="0"
                    width="1px"
                    height="100%"
                    bg="blue.400"
                    opacity="0.5"
                    zIndex={0}
                    pointerEvents="none"
                  />
                </React.Fragment>
              ))}
            </>
          )}

          {/* Tables */}
          {tables.map((table) => {
            const currentOrder = getTableOrder(table.tableNumber);
            return (
              <Box
                key={table._id}
                position="absolute"
                left={`${table.position.x}px`}
                top={`${table.position.y}px`}
                w={table.shape === 'rectangle' ? '160px' : '120px'}
                h={table.shape === 'rectangle' ? '100px' : '120px'}
                bg={table.isActive ? activeTableBg : inactiveTableBg}
                border="2px solid"
                borderColor={table.isActive ? activeBorder : inactiveBorder}
                rounded={table.shape === 'round' ? 'full' : 'md'}
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                cursor={isEditMode ? 'move' : 'pointer'}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, table._id)}
                boxShadow="md"
                zIndex={draggedTable === table._id ? 0 : 1}
                opacity={draggedTable === table._id ? 0.5 : 1}
                onClick={() => isEditMode ? handleEditTable(table) : handleTableClick(table)}
                _hover={{ boxShadow: "lg", transform: "scale(1.02)" }}
                transition="all 0.2s"
                px={2}
                py={2}
              >
                <Text fontWeight="bold" color={tableTextColor}>Table {table.tableNumber}</Text>
                
                {/* Payment status badge in top right corner */}
                {!isEditMode && currentOrder && (
                  <Badge 
                    position="absolute"
                    top="-8px"
                    right="-8px"
                    colorScheme={currentOrder.paymentStatus === 'paid' ? 'green' : 'orange'} 
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="full"
                    boxShadow="sm"
                  >
                    {currentOrder.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                )}
                
                {!isEditMode && (
                  <VStack spacing={0} mt={1}>
                    <HStack spacing={1}>
                      <Badge
                        colorScheme={table.isActive ? 'green' : 'red'}
                        fontSize="2xs"
                        px={1}
                      >
                        {table.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </HStack>
                    
                    {table.isActive && (
                      <>
                        <Text fontSize="9px" fontWeight="medium" mt={0} lineHeight="1">
                          {table.lastActivatedAt ? formatTime(table.lastActivatedAt) : 'Just now'}
                        </Text>

                        {/* Timer Display */}
                        <Badge colorScheme="purple" fontSize="2xs" px={1} mt={1}>
                          <TimeIcon mr={1} fontSize="8px" />
                          {formatDuration(activeTimers[table.tableNumber] || 0)}
                        </Badge>
                        
                        {currentOrder && (
                          <Text fontSize="9px" color={tableTextColor} fontWeight="bold" mt={1}>
                            {countOrderItems(currentOrder)} items | ¥{currentOrder.totalAmount.toLocaleString('ja-JP')}
                          </Text>
                        )}
                        
                        {currentOrder && currentOrder.paymentStatus === 'pending' && currentOrder.status !== 'completed' && (
                          <Button 
                            size="xs" 
                            colorScheme="green" 
                            leftIcon={<CheckIcon fontSize="8px" />}
                            height="16px"
                            fontSize="8px"
                            mt={1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsPaid(currentOrder._id);
                            }}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </>
                    )}
                  </VStack>
                )}
                
                {isEditMode && (
                  <IconButton
                    aria-label="Delete table"
                    icon={<DeleteIcon />}
                    size="xs"
                    colorScheme="red"
                    position="absolute"
                    top="-8px"
                    right="-8px"
                    rounded="full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(table._id, table.tableNumber);
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Table List Section (only shown when not in edit mode) */}
        {!isEditMode && (
          <>
            <Heading size="md" mt={4}>Table Details</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {tables.map((table) => {
                const currentOrder = getTableOrder(table.tableNumber);
                return (
                  <Box
                    key={table._id}
                    p={6}
                    rounded="lg"
                    shadow="sm"
                    borderWidth="2px"
                    borderColor={table.isActive ? activeBorder : inactiveBorder}
                    bg={table.isActive ? "green.50" : "red.50"}
                  >
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between">
                        <Heading size="md">Table {table.tableNumber}</Heading>
                        <HStack>
                          <Badge
                            colorScheme={table.isActive ? 'green' : 'red'}
                            fontSize="sm"
                          >
                            {table.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {currentOrder && (
                            <Badge 
                              colorScheme={currentOrder.paymentStatus === 'paid' ? 'green' : 'orange'} 
                              fontSize="sm"
                            >
                              {currentOrder.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                            </Badge>
                          )}
                        </HStack>
                      </HStack>

                      {table.isActive && (
                        <HStack>
                          <Badge colorScheme="purple" px={2} py={1}>
                            <TimeIcon mr={1} />
                            Active for {formatDuration(activeTimers[table.tableNumber] || 0)}
                          </Badge>
                        </HStack>
                      )}

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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsPaid(currentOrder._id);
                              }}
                              isDisabled={currentOrder.paymentStatus === 'paid' || currentOrder.status === 'completed'}
                            >
                              {currentOrder.paymentStatus === 'paid' ? 'Paid' : 'Mark as Paid'}
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
                            onClick={() => handleTableClick(table)}
                            isDisabled={
                              table.isActive && 
                              currentOrder !== undefined && 
                              currentOrder.paymentStatus === 'pending' && 
                              currentOrder.status !== 'completed'
                            }
                          />
                        </Tooltip>
                      </HStack>
                    </VStack>
                  </Box>
                );
              })}
            </SimpleGrid>
          </>
        )}
      </VStack>

      {/* Add Tables Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Tables</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Number of Tables to Add</FormLabel>
              <NumberInput
                min={1}
                max={20}
                value={newTableCount}
                onChange={(_, value) => setNewTableCount(value)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleAddTables}>
              Add Tables
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Table Modal */}
      <Modal isOpen={isTableModalOpen} onClose={onTableModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Table {selectedTable?.tableNumber}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTable && (
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Table Shape</FormLabel>
                  <HStack spacing={4}>
                    <Button
                      colorScheme={selectedTable.shape === 'square' ? 'blue' : 'gray'}
                      onClick={() => setSelectedTable({
                        ...selectedTable,
                        shape: 'square'
                      })}
                      width="100px"
                      height="90px"
                      rounded="md"
                    >
                      Square
                    </Button>
                    <Button
                      colorScheme={selectedTable.shape === 'round' ? 'blue' : 'gray'}
                      onClick={() => setSelectedTable({
                        ...selectedTable,
                        shape: 'round'
                      })}
                      width="100px"
                      height="90px"
                      rounded="full"
                    >
                      Round
                    </Button>
                    <Button
                      colorScheme={selectedTable.shape === 'rectangle' ? 'blue' : 'gray'}
                      onClick={() => setSelectedTable({
                        ...selectedTable,
                        shape: 'rectangle'
                      })}
                      width="120px"
                      height="80px"
                      rounded="md"
                    >
                      Rectangle
                    </Button>
                  </HStack>
                </FormControl>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSaveTableChanges}>
              Save Changes
            </Button>
            <Button variant="ghost" onClick={onTableModalClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog
        isOpen={isStatusChangeOpen}
        leastDestructiveRef={cancelRef}
        onClose={onStatusChangeClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {tableToToggle?.isActive ? 'Deactivate' : 'Activate'} Table {tableToToggle?.tableNumber}
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to {tableToToggle?.isActive ? 'deactivate' : 'activate'} this table?
              {tableToToggle?.isActive && 
                getTableOrder(tableToToggle.tableNumber) && 
                getTableOrder(tableToToggle.tableNumber)?.paymentStatus === 'pending' && 
                getTableOrder(tableToToggle.tableNumber)?.status !== 'completed' && (
                <Text color="red.500" mt={2}>
                  Note: This table has a pending order. Mark the order as paid before deactivating.
                </Text>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onStatusChangeClose}>
                Cancel
              </Button>
              <Button 
                colorScheme={tableToToggle?.isActive ? 'red' : 'green'} 
                onClick={confirmToggleTable} 
                ml={3}
                isDisabled={
                  tableToToggle?.isActive && 
                  getTableOrder(tableToToggle.tableNumber) !== undefined && 
                  getTableOrder(tableToToggle.tableNumber)?.paymentStatus === 'pending' &&
                  getTableOrder(tableToToggle.tableNumber)?.status !== 'completed'
                }
              >
                {tableToToggle?.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default TableManagement; 