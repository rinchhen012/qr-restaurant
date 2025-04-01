import React from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  useToast,
  Flex,
  Center,
  Divider,
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, MinusIcon } from '@chakra-ui/icons';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Add a utility function for price formatting
const formatPrice = (price: number) => {
  return `¥${price.toLocaleString()}`;
};

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, tableId }) => {
  const { state, dispatch } = useCart();
  const { socket } = useSocket();
  const toast = useToast();

  const handleRemoveItem = (menuItemId: string) => {
    dispatch({
      type: 'REMOVE_ITEM',
      payload: { menuItemId },
    });
  };

  // Add functions to update item quantity
  const handleIncreaseQuantity = (menuItemId: string, currentQuantity: number) => {
    dispatch({
      type: 'UPDATE_QUANTITY',
      payload: { menuItemId, quantity: currentQuantity + 1 },
    });
  };

  const handleDecreaseQuantity = (menuItemId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { menuItemId, quantity: currentQuantity - 1 },
      });
    } else {
      // If quantity would be 0, remove the item instead
      handleRemoveItem(menuItemId);
    }
  };

  const handlePlaceOrder = async () => {
    if (state.items.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please add items to your cart before placing an order',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const order = {
        tableNumber: parseInt(tableId),
        items: state.items.map(item => ({
          menuItem: item.menuItem._id,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
          specialInstructions: item.specialInstructions,
        })),
        totalAmount: state.total,
      };

      const response = await axios.post(`${API_URL}/api/orders`, order);

      if (socket) {
        socket.emit('new-order', response.data);
      }

      dispatch({ type: 'CLEAR_CART' });
      onClose();

      toast({
        title: 'Order Placed',
        description: 'Your order has been sent to the kitchen',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">Your Order</DrawerHeader>
        <DrawerBody>
          <VStack spacing={4} align="stretch">
            {state.items.map((item) => (
              <Box
                key={item.menuItem._id}
                borderWidth="1px"
                borderRadius="lg"
                p={4}
              >
                <HStack justify="space-between" align="start" mb={3}>
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">{item.menuItem.name}</Text>
                    {Object.entries(item.selectedOptions).map(([key, value]) => (
                      <Text key={key} fontSize="sm" color="gray.600">
                        {key}: {value}
                      </Text>
                    ))}
                    {item.specialInstructions && (
                      <Text fontSize="sm" color="gray.600">
                        Note: {item.specialInstructions}
                      </Text>
                    )}
                  </VStack>
                  <Text fontWeight="semibold">
                    {formatPrice(item.menuItem.price * item.quantity)}
                  </Text>
                </HStack>
                
                <Divider my={2} />
                
                <Flex justify="space-between" align="center">
                  {/* Quantity Controls */}
                  <HStack>
                    <IconButton
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      icon={<MinusIcon />}
                      aria-label="Decrease quantity"
                      isDisabled={item.quantity <= 1}
                      onClick={() => handleDecreaseQuantity(item.menuItem._id, item.quantity)}
                    />
                    <Center minW="40px">
                      <Text fontWeight="medium">{item.quantity}</Text>
                    </Center>
                    <IconButton
                      size="sm"
                      colorScheme="green"
                      variant="outline"
                      icon={<AddIcon />}
                      aria-label="Increase quantity"
                      onClick={() => handleIncreaseQuantity(item.menuItem._id, item.quantity)}
                    />
                  </HStack>
                  
                  {/* Delete Button */}
                  <IconButton
                    aria-label="Remove item"
                    icon={<DeleteIcon />}
                    variant="ghost"
                    colorScheme="red"
                    size="sm"
                    onClick={() => handleRemoveItem(item.menuItem._id)}
                  />
                </Flex>
              </Box>
            ))}

            {state.items.length === 0 && (
              <Text textAlign="center" color="gray.500">
                Your cart is empty
              </Text>
            )}
          </VStack>
        </DrawerBody>

        {state.items.length > 0 && (
          <DrawerFooter borderTopWidth="1px">
            <VStack width="100%" spacing={4}>
              <HStack width="100%" justify="space-between">
                <Text fontSize="xl" fontWeight="bold">
                  Total:
                </Text>
                <Text fontSize="xl" fontWeight="bold">
                  {formatPrice(state.total)}
                </Text>
              </HStack>
              <Button
                colorScheme="green"
                width="100%"
                size="lg"
                onClick={handlePlaceOrder}
              >
                Place Order
              </Button>
            </VStack>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default CartDrawer; 