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
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
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
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">{item.menuItem.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      Quantity: {item.quantity}
                    </Text>
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
                  <HStack>
                    <Text fontWeight="semibold">
                      {formatPrice(item.menuItem.price * item.quantity)}
                    </Text>
                    <IconButton
                      aria-label="Remove item"
                      icon={<DeleteIcon />}
                      variant="ghost"
                      colorScheme="red"
                      size="sm"
                      onClick={() => handleRemoveItem(item.menuItem._id)}
                    />
                  </HStack>
                </HStack>
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