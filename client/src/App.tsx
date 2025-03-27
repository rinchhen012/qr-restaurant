import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AppProvider } from './providers/AppProvider';
import { AuthProvider } from './context/AuthContext';
import CustomerMenu from './pages/CustomerMenu';
import KitchenDisplay from './pages/KitchenDisplay';
import AdminDashboard from './pages/AdminDashboard';
import CategoryManagement from './pages/CategoryManagement';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { 
  Box, 
  Container, 
  Flex, 
  Button, 
  Heading, 
  HStack, 
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { useAuth } from './context/AuthContext';
import { ExternalLinkIcon } from '@chakra-ui/icons';

// Configure future flags
const router = {
  future: {
    v7_startTransition: true,
  },
};

const KitchenLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box>
      {children}
    </Box>
  );
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <Box bg="gray.800" color="white" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Heading size="md">Restaurant Admin</Heading>
            <HStack spacing={4}>
              <Button
                as={Link}
                to="/admin/menu"
                variant={location.pathname === '/admin/menu' ? 'solid' : 'ghost'}
                colorScheme="blue"
              >
                Menu Items
              </Button>
              <Button
                as={Link}
                to="/admin/categories"
                variant={location.pathname === '/admin/categories' ? 'solid' : 'ghost'}
                colorScheme="blue"
              >
                Categories
              </Button>
              <Button
                as={Link}
                to="/kitchen"
                variant={location.pathname === '/kitchen' ? 'solid' : 'ghost'}
                colorScheme="orange"
              >
                Kitchen Display
              </Button>
              <Button
                as={Link}
                to="/table/1"
                variant="ghost"
                colorScheme="green"
                leftIcon={<ExternalLinkIcon />}
                target="_blank"
              >
                Preview Menu
              </Button>
              <Button
                onClick={onOpen}
                variant="ghost"
                colorScheme="red"
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

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router future={router.future}>
        <AuthProvider>
          <Routes>
            <Route path="/table/:tableId" element={<CustomerMenu />} />
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute>
                  <KitchenLayout>
                    <KitchenDisplay />
                  </KitchenLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin/menu"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <CategoryManagement />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/table/1" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </AppProvider>
  );
};

export default App;
