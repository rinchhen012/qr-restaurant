import React from 'react';
import { Box, Container, Flex, Button, Heading, HStack, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure } from '@chakra-ui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ExternalLinkIcon, TimeIcon } from '@chakra-ui/icons';

interface KitchenLayoutProps {
  children: React.ReactNode;
}

const KitchenLayout: React.FC<KitchenLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    navigate('/admin/login');
  };

  return (
    <Box>
      <Box bg="orange.600" color="white" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Heading size="md">Kitchen Display</Heading>
            <HStack spacing={4}>
              <Button
                as={Link}
                to="/admin/tables"
                variant={location.pathname === '/admin/tables' ? 'solid' : 'ghost'}
                colorScheme="whiteAlpha"
                leftIcon={<TimeIcon />}
                size="md"
                fontWeight="bold"
              >
                Manage Tables
              </Button>
              <Button
                as={Link}
                to="/admin/menu"
                variant={location.pathname === '/admin/menu' ? 'solid' : 'ghost'}
                colorScheme="whiteAlpha"
              >
                Menu Items
              </Button>
              <Button
                as={Link}
                to="/admin/categories"
                variant={location.pathname === '/admin/categories' ? 'solid' : 'ghost'}
                colorScheme="whiteAlpha"
              >
                Categories
              </Button>
              <Button
                onClick={onOpen}
                variant="ghost"
                colorScheme="whiteAlpha"
              >
                Logout
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>
      <Box py={8}>
        <Container maxW="container.xl">
          {children}
        </Container>
      </Box>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Sign Out
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to sign out? Any unsaved changes will be lost.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={() => { onClose(); handleLogout(); }} ml={3}>
                Sign Out
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default KitchenLayout; 