import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { SocketProvider } from '../context/SocketContext';
import { CartProvider } from '../context/CartContext';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ChakraProvider>
      <SocketProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </SocketProvider>
    </ChakraProvider>
  );
}; 