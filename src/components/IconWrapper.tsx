import React, { forwardRef } from 'react';
import { IconType } from 'react-icons';
import { Icon } from '@chakra-ui/react';

// This component wraps react-icons to make them work with Chakra UI
export const ChakraIcon = forwardRef<HTMLSpanElement, { icon: IconType; [key: string]: any }>(
  ({ icon, ...props }, ref) => {
    return <Icon as={icon} ref={ref} {...props} />;
  }
);

ChakraIcon.displayName = 'ChakraIcon'; 