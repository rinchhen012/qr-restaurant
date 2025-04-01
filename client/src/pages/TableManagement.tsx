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
import { useSocket } from '../context/SocketContext';

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
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchStartPosRef = useRef<{ x: number; y: number, offsetX: number, offsetY: number } | null>(null);
  const mouseDragStartOffsetRef = useRef<{ offsetX: number, offsetY: number } | null>(null);
  const { socket } = useSocket();

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

  // Fetch orders callback
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders`);
      console.log('Fetched orders:', response.data);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }, []);

  // Fetch tables callback
  const fetchTables = useCallback(async () => {
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
  }, [toast]);

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

  // Add socket listener for table status updates
  useEffect(() => {
    if (!socket) return;

    socket.on('table-status-update', (data) => {
      if (data.type === 'activated' || data.type === 'deactivated') {
        // Update our local tables state with the new table data
        setTables(prevTables =>
          prevTables.map(table =>
            table.tableNumber === data.tableNumber
              ? {
                  ...table,
                  isActive: data.type === 'activated',
                  lastActivatedAt: data.type === 'activated' ? new Date().toISOString() : table.lastActivatedAt,
                  lastDeactivatedAt: data.type === 'deactivated' ? new Date().toISOString() : table.lastDeactivatedAt,
                }
              : table
          )
        );

        // Refresh orders and tables to get the latest data
        fetchOrders();
        fetchTables();

        // Show toast notification
        toast({
          title: data.type === 'activated' 
            ? `Table ${data.tableNumber} activated` 
            : `Table ${data.tableNumber} deactivated`,
          description: data.type === 'activated'
            ? 'Table is now active and ready for customers'
            : 'Table has been deactivated and reset',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    });

    // Listen for new orders to update the table view with latest totals
    socket.on('kitchen-update', ({ type, order }) => {
      if (type === 'new-order') {
        // Fetch the latest orders and tables to update the current total
        fetchOrders();
        fetchTables();
      }
    });

    // Listen for order status updates
    socket.on('order-status-update', ({ orderId, status }) => {
      // Update orders and tables to refresh the current total
      fetchOrders();
      fetchTables();
    });

    return () => {
      socket.off('table-status-update');
      socket.off('kitchen-update');
      socket.off('order-status-update');
    };
  }, [socket, toast, fetchOrders, fetchTables]);

  useEffect(() => {
    fetchTables();
    fetchOrders();
    fetchFloorPlans();
  }, [fetchTables, fetchOrders]);

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
      const endpoint = isActive ? 'activate' : 'deactivate';
      const response = await axios.post(`${API_URL}/api/tables/${tableNumber}/${endpoint}`);
      
      if (response.data) {
        setTables(prevTables =>
          prevTables.map(table =>
            table.tableNumber === tableNumber
              ? {
                  ...table,
                  isActive: isActive,
                  lastActivatedAt: isActive ? new Date().toISOString() : table.lastActivatedAt,
                  lastDeactivatedAt: !isActive ? new Date().toISOString() : table.lastDeactivatedAt,
                  currentOrderId: isActive ? table.currentOrderId : undefined, // Clear order reference when deactivating
                }
              : table
          )
        );

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit(isActive ? 'table-activated' : 'table-deactivated', response.data);
        }

        // Toast notifications removed
      }
    } catch (error) {
      console.error(`Error ${isActive ? 'activating' : 'deactivating'} table:`, error);
      let errorMessage = `Failed to ${isActive ? 'activate' : 'deactivate'} table`;
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
    }
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const response = await axios.put(`${API_URL}/api/orders/${orderId}/payment-status`, {
        paymentStatus: 'paid'
      });

      if (response.data) {
        // Update orders in state
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId
              ? { ...order, paymentStatus: 'paid' }
              : order
          )
        );

        // Refresh orders and tables to ensure everything is up to date
        fetchOrders();
        fetchTables();

        toast({
          title: 'Payment Status Updated',
          description: 'Order marked as paid',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
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
    // First try to find in-progress or pending orders
    const activeOrder = orders.find(order => 
      order.tableNumber === tableNumber && 
      (order.status === 'pending' || order.status === 'in-progress')
    );
    
    if (activeOrder) return activeOrder;
    
    // Do not return completed orders from previous sessions
    // Only return completed orders if they happened AFTER the table was last activated
    const table = tables.find(t => t.tableNumber === tableNumber);
    
    if (table?.isActive && table.lastActivatedAt) {
      const lastActivatedTime = new Date(table.lastActivatedAt).getTime();
      
      // Find all completed orders for this table that were created AFTER the table was activated
      const completedOrders = orders.filter(order => 
        order.tableNumber === tableNumber && 
        order.status === 'completed' &&
        new Date(order.createdAt).getTime() > lastActivatedTime
      );
      
      // Sort by creation date (most recent first)
      const sortedOrders = completedOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Return the most recent completed order from the current session
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
    
    const table = tables.find(t => t._id === tableId);
    if (table) {
      setDraggedTableData(table);
    }
    
    // Calculate offset and STORE it for mouse drag
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    mouseDragStartOffsetRef.current = { offsetX, offsetY }; // Store the offset

    // Create a simple drag ghost element
    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-1000px'; // Position off-screen
    dragGhost.style.padding = '5px 10px';
    dragGhost.style.background = 'rgba(173, 216, 230, 0.8)'; // Light blue with some transparency
    dragGhost.style.border = '1px solid blue';
    dragGhost.style.borderRadius = '4px';
    dragGhost.style.fontSize = '14px';
    dragGhost.style.fontWeight = 'bold';
    dragGhost.innerText = `Table ${table?.tableNumber || ''}`;
    document.body.appendChild(dragGhost);

    // Set the drag image using the ghost and the calculated offset
    if (e.dataTransfer) { // Check if dataTransfer exists
      e.dataTransfer.effectAllowed = 'move'; // Optional: Indicate the type of operation
      e.dataTransfer.setDragImage(dragGhost, offsetX, offsetY);
    }

    // Remove the ghost element after a short delay
    setTimeout(() => {
      if (document.body.contains(dragGhost)) {
        document.body.removeChild(dragGhost);
      }
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode || !floorPlanRef.current || !draggedTable || !mouseDragStartOffsetRef.current) return; // Check offset ref
    e.preventDefault();
    
    // Calculate position relative to the floor plan, ADJUSTING for mouse offset
    const floorPlanRect = floorPlanRef.current.getBoundingClientRect();
    const rawX = e.clientX - floorPlanRect.left - mouseDragStartOffsetRef.current.offsetX;
    const rawY = e.clientY - floorPlanRect.top - mouseDragStartOffsetRef.current.offsetY;
    
    // Apply snapping for the preview
    const snappedPosition = findClosestAlignment({ x: rawX, y: rawY }, draggedTable);
    setDragPosition(snappedPosition);
  };

  const handleDragEnd = () => {
    // Clear state including the mouse offset ref
    setDraggedTable(null);
    setDragPosition(null);
    setDraggedTableData(null);
    mouseDragStartOffsetRef.current = null; // Clear mouse offset
    // Touch state cleared in handleTouchEnd
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditMode || !draggedTable || !floorPlanRef.current || !mouseDragStartOffsetRef.current) return; // Check offset ref
    e.preventDefault();
    
    // Calculate position relative to the floor plan, ADJUSTING for mouse offset
    const floorPlanRect = floorPlanRef.current.getBoundingClientRect();
    const rawX = e.clientX - floorPlanRect.left - mouseDragStartOffsetRef.current.offsetX;
    const rawY = e.clientY - floorPlanRect.top - mouseDragStartOffsetRef.current.offsetY;
    
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
    saveTablePosition(draggedTable, { x, y });
    
    // Clear drag state
    setDraggedTable(null);
    setDragPosition(null);
    setDraggedTableData(null);
    mouseDragStartOffsetRef.current = null; // Clear mouse offset
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
      // Get the current order for this table
      const currentOrder = getTableOrder(table.tableNumber);
      const hasPendingOrder = currentOrder?.paymentStatus === 'pending' && currentOrder?.status !== 'completed';
      
      // If active with pending order, we still need the dialog to handle payment options
      if (table.isActive && hasPendingOrder) {
        setTableToToggle(table);
        onStatusChangeOpen();
      } else {
        // For all other cases (activating or deactivating without pending payment),
        // directly toggle the table without showing the alert
        handleToggleTable(table.tableNumber, !table.isActive);
      }
    } else {
      handleEditTable(table);
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

  const handleTouchStart = (e: React.TouchEvent, tableId: string) => {
    if (!isEditMode) return;

    const tableElement = e.currentTarget as HTMLElement;
    const tableRect = tableElement.getBoundingClientRect();
    const touch = e.touches[0];

    // Calculate offset within the table element
    const offsetX = touch.clientX - tableRect.left;
    const offsetY = touch.clientY - tableRect.top;
    
    // Set drag state directly for touch
    setDraggedTable(tableId);
    const table = tables.find(t => t._id === tableId);
    if (table) {
      setDraggedTableData(table);
    }

    // Record touch start position AND offset
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, offsetX, offsetY };
    
    // Set dragging flag
    setIsTouchDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isEditMode || !draggedTable || !floorPlanRef.current || !isTouchDragging || !touchStartPosRef.current) return;

    const touch = e.touches[0];
    const floorPlanRect = floorPlanRef.current.getBoundingClientRect();
    
    // Calculate position relative to the floor plan, ADJUSTING for the initial touch offset
    const rawX = touch.clientX - floorPlanRect.left - touchStartPosRef.current.offsetX;
    const rawY = touch.clientY - floorPlanRect.top - touchStartPosRef.current.offsetY;
    
    // Apply snapping for the preview (similar to handleDragOver)
    const snappedPosition = findClosestAlignment({ x: rawX, y: rawY }, draggedTable);
    setDragPosition(snappedPosition);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isEditMode || !draggedTable || !isTouchDragging) return;

    // Use the last known drag position for the drop (already offset)
    if (dragPosition) {
      // Update the table position
      const updatedTables = tables.map(table => 
        table._id === draggedTable 
          ? { ...table, position: dragPosition } 
          : table
      );
      setTables(updatedTables);
      
      // Save to backend
      saveTablePosition(draggedTable, dragPosition);
    }
    
    // Clear drag state (similar to handleDrop/handleDragEnd)
    setDraggedTable(null);
    setDragPosition(null);
    setDraggedTableData(null);
    setIsTouchDragging(false);
    touchStartPosRef.current = null;
  };

  // Kept for handling dialogs that are still shown for tables with pending payments
  const confirmToggleTable = () => {
    if (tableToToggle) {
      // This now only handles the simple activate/deactivate cases
      handleToggleTable(tableToToggle.tableNumber, !tableToToggle.isActive); // Toggle the current state
      onStatusChangeClose();
    }
  };

  // New function to handle marking paid AND deactivating
  const handleMarkPaidAndDeactivate = async () => {
    if (tableToToggle) {
      const currentOrder = getTableOrder(tableToToggle.tableNumber);
      if (currentOrder && currentOrder.paymentStatus === 'pending') {
        // Mark as paid first
        await handleMarkAsPaid(currentOrder._id);
        // Then deactivate the table
        await handleToggleTable(tableToToggle.tableNumber, false);
        // Refresh orders data to reflect changes
        await fetchOrders();
      }
      onStatusChangeClose();
    }
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
          sx={{
            touchAction: isEditMode ? 'none' : 'auto',
          }}
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
              w={draggedTableData.shape === 'rectangle' ? '180px' : '140px'}
              h={draggedTableData.shape === 'rectangle' ? '120px' : '140px'}
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
                w={table.shape === 'rectangle' ? '180px' : '140px'}
                h={table.shape === 'rectangle' ? '120px' : '140px'}
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
                onTouchStart={(e) => handleTouchStart(e, table._id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                sx={{
                  touchAction: isEditMode ? 'none' : 'auto'
                }}
                boxShadow="md"
                zIndex={draggedTable === table._id ? 0 : 1}
                opacity={draggedTable === table._id ? 0.5 : 1}
                onClick={() => isEditMode ? handleEditTable(table) : handleTableClick(table)}
                _hover={{ boxShadow: "lg", transform: "scale(1.02)" }}
                transition="all 0.2s"
                px={2}
                pt={4}
                pb={2}
              >
                <Text fontWeight="bold" fontSize="lg" color={tableTextColor}>Table {table.tableNumber}</Text>
                
                {!isEditMode && currentOrder && currentOrder.paymentStatus === 'pending' && (
                  <Badge 
                    position="absolute"
                    top="-12px"
                    right="-10px"
                    colorScheme="orange" 
                    fontSize="sm"
                    px={2}
                    py={1}
                    borderRadius="full"
                    boxShadow="sm"
                  >
                    Unpaid
                  </Badge>
                )}
                
                {!isEditMode && (
                  <VStack spacing={1} mt={1}>
                    <HStack spacing={1}>
                      <Badge
                        colorScheme={table.isActive ? 'green' : 'red'}
                        fontSize="xs"
                        px={1}
                      >
                        {table.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </HStack>
                    
                    {table.isActive && (
                      <>
                        <Text fontSize="xs" fontWeight="medium" mt={0} lineHeight="1.2">
                          {table.lastActivatedAt ? formatTime(table.lastActivatedAt) : 'Just now'}
                        </Text>

                        <Badge colorScheme="purple" fontSize="xs" px={1} mt={1}>
                          <TimeIcon mr={1} fontSize="9px" />
                          {formatDuration(activeTimers[table.tableNumber] || 0)}
                        </Badge>
                        
                        {currentOrder && (
                          <Text fontSize="xs" color={tableTextColor} fontWeight="bold" mt={1}>
                            {countOrderItems(currentOrder)} items | ¥{currentOrder.totalAmount.toLocaleString('ja-JP')}
                          </Text>
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
            {(() => {
              // Determine the state of the table and its order
              const isActive = tableToToggle?.isActive;
              const currentOrder = tableToToggle ? getTableOrder(tableToToggle.tableNumber) : undefined;
              const hasPendingOrder = currentOrder?.paymentStatus === 'pending' && currentOrder?.status !== 'completed';

              if (isActive && hasPendingOrder) {
                // Case 1: Active table with a pending order
                return (
                  <>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                      Manage Table {tableToToggle?.tableNumber}
                    </AlertDialogHeader>
                    <AlertDialogBody>
                      This table has an unpaid order. What would you like to do?
                    </AlertDialogBody>
                    <AlertDialogFooter>
                      <Button ref={cancelRef} onClick={onStatusChangeClose}>
                        Cancel
                      </Button>
                      <Button
                        colorScheme="blue"
                        onClick={() => {
                          if (currentOrder) {
                            handleMarkAsPaid(currentOrder._id);
                            onStatusChangeClose();
                          }
                        }}
                        ml={3}
                      >
                        Mark as Paid
                      </Button>
                      <Button
                        colorScheme="green"
                        onClick={handleMarkPaidAndDeactivate}
                        ml={3}
                      >
                        Mark Paid & Deactivate
                      </Button>
                    </AlertDialogFooter>
                  </>
                );
              } else if (isActive && !hasPendingOrder) {
                // Case 2: Active table without a pending order (or order is paid/completed)
                return (
                  <>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                      Deactivate Table {tableToToggle?.tableNumber}
                    </AlertDialogHeader>
                    <AlertDialogBody>
                      Are you sure you want to deactivate this table?
                    </AlertDialogBody>
                    <AlertDialogFooter>
                      <Button ref={cancelRef} onClick={onStatusChangeClose}>
                        Cancel
                      </Button>
                      <Button
                        colorScheme="red"
                        onClick={confirmToggleTable}
                        ml={3}
                      >
                        Deactivate
                      </Button>
                    </AlertDialogFooter>
                  </>
                );
              } else {
                // Case 3: Inactive table
                return (
                  <>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                      Activate Table {tableToToggle?.tableNumber}
                    </AlertDialogHeader>
                    <AlertDialogBody>
                      Are you sure you want to activate this table?
                    </AlertDialogBody>
                    <AlertDialogFooter>
                      <Button ref={cancelRef} onClick={onStatusChangeClose}>
                        Cancel
                      </Button>
                      <Button
                        colorScheme="green"
                        onClick={confirmToggleTable}
                        ml={3}
                      >
                        Activate
                      </Button>
                    </AlertDialogFooter>
                  </>
                );
              }
            })()}
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default TableManagement; 