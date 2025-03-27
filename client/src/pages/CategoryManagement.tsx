import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  useToast,
  Badge,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface MenuItem {
  _id: string;
  name: string;
  category: string;
}

interface Category {
  _id: string;
  name: string;
  itemCount: number;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const menuResponse = await axios.get<MenuItem[]>(`${API_URL}/api/menu`);
      const menuItems = menuResponse.data;
      
      // Get existing categories from localStorage or initialize empty array
      const savedCategories = JSON.parse(localStorage.getItem('categories') || '[]') as string[];
      
      // Count items per category
      const categoryCount = menuItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});

      // Add any new categories from menu items to saved categories
      Object.keys(categoryCount).forEach(category => {
        if (!savedCategories.includes(category)) {
          savedCategories.push(category);
        }
      });

      // Transform into category array, including categories with 0 items
      const categoriesArray: Category[] = savedCategories.map(name => ({
        _id: name,
        name,
        itemCount: categoryCount[name] || 0,
      }));

      // Sort categories alphabetically
      categoriesArray.sort((a, b) => a.name.localeCompare(b.name));

      setCategories(categoriesArray);
      localStorage.setItem('categories', JSON.stringify(savedCategories));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch categories',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!categoryName.trim()) {
        toast({
          title: 'Error',
          description: 'Category name cannot be empty',
          status: 'error',
          duration: 2000,
          isClosable: true,
        });
        return;
      }

      if (editingCategory) {
        // Update all menu items with old category name to new category name
        const response = await axios.put(`${API_URL}/api/menu/category/${editingCategory.name}`, {
          newCategory: categoryName,
        });

        toast({
          title: 'Success',
          description: `Category "${editingCategory.name}" renamed to "${categoryName}"`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        // Add new category to localStorage
        const savedCategories = JSON.parse(localStorage.getItem('categories') || '[]') as string[];
        if (!savedCategories.includes(categoryName)) {
          savedCategories.push(categoryName);
          localStorage.setItem('categories', JSON.stringify(savedCategories));
        }

        toast({
          title: 'Success',
          description: 'Category added successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }

      fetchCategories();
      onClose();
      setCategoryName('');
      setEditingCategory(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save category',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    onOpen();
  };

  const handleDelete = async (category: Category) => {
    if (category.itemCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: `Please remove or reassign all items from "${category.name}" before deleting`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await axios.delete(`${API_URL}/api/menu/category/${encodeURIComponent(category.name)}`);
        
        // Remove category from localStorage
        const savedCategories = JSON.parse(localStorage.getItem('categories') || '[]') as string[];
        const updatedCategories = savedCategories.filter(c => c !== category.name);
        localStorage.setItem('categories', JSON.stringify(updatedCategories));
        
        toast({
          title: 'Success',
          description: 'Category deleted successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        
        fetchCategories();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete category',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={8}>
        <HStack justify="space-between" mb={6}>
          <Heading>Category Management</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="green" onClick={() => { setCategoryName(''); setEditingCategory(null); onOpen(); }}>
            Add New Category
          </Button>
        </HStack>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Category Name</Th>
              <Th>Items</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {categories.map((category) => (
              <Tr key={category._id}>
                <Td>{category.name}</Td>
                <Td>
                  <Badge colorScheme={category.itemCount > 0 ? 'green' : 'gray'}>
                    {category.itemCount} items
                  </Badge>
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Edit category"
                      icon={<EditIcon />}
                      onClick={() => handleEdit(category)}
                      size="sm"
                    />
                    <IconButton
                      aria-label="Delete category"
                      icon={<DeleteIcon />}
                      onClick={() => handleDelete(category)}
                      size="sm"
                      colorScheme="red"
                      isDisabled={category.itemCount > 0}
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCategory ? 'Edit Category' : 'Add New Category'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Category Name</FormLabel>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </FormControl>

              <Button colorScheme="blue" width="full" onClick={handleSubmit}>
                {editingCategory ? 'Update Category' : 'Add Category'}
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default CategoryManagement; 