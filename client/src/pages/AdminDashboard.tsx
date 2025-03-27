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
  Textarea,
  Select,
  VStack,
  HStack,
  useToast,
  Image,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  options?: {
    name: string;
    choices: string[];
  }[];
}

// Add a utility function for price formatting
const formatPrice = (price: number) => {
  return `¥${price.toLocaleString()}`;
};

const AdminDashboard: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    options: [{ name: '', choices: [''] }],
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/menu`);
      setMenuItems(response.data);
      
      // Get categories from menu items
      const menuCategories = Array.from(
        new Set(response.data.map((item: MenuItem) => item.category))
      ) as string[];
      
      // Get categories from localStorage
      const savedCategories = JSON.parse(localStorage.getItem('categories') || '[]') as string[];
      
      // Combine both sets of categories and remove duplicates
      const allCategories = Array.from(new Set([...menuCategories, ...savedCategories])).sort();
      
      setCategories(allCategories);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch menu items',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      let finalCategory = formData.category;
      
      // If a new category is being added
      if (formData.category === 'new' && newCategory.trim()) {
        finalCategory = newCategory.trim();
        
        // Add new category to localStorage
        const savedCategories = JSON.parse(localStorage.getItem('categories') || '[]') as string[];
        if (!savedCategories.includes(finalCategory)) {
          savedCategories.push(finalCategory);
          localStorage.setItem('categories', JSON.stringify(savedCategories));
        }
      }

      // Validate required fields
      if (!formData.name.trim() || !formData.description.trim() || !formData.price || !finalCategory) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Format the data according to server requirements
      interface MenuItemData {
        name: string;
        description: string;
        price: number;
        category: string;
        image?: string;
        available: boolean;
        options?: {
          name: string;
          choices: string[];
        }[];
      }

      const itemData: MenuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: finalCategory,
        available: true,
        options: formData.options
          .filter(opt => opt.name.trim() && opt.choices.length > 0 && opt.choices.some(choice => choice.trim()))
          .map(opt => ({
            name: opt.name.trim(),
            choices: opt.choices.filter(choice => choice.trim())
          }))
      };

      // Only include image if it's provided
      if (formData.image.trim()) {
        itemData.image = formData.image.trim();
      }

      // Only include options if there are valid ones
      if (!itemData.options || itemData.options.length === 0) {
        delete itemData.options;
      }

      if (editingItem) {
        await axios.put(`${API_URL}/api/menu/${editingItem._id}`, itemData);
        toast({
          title: 'Success',
          description: 'Menu item updated successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        await axios.post(`${API_URL}/api/menu`, itemData);
        toast({
          title: 'Success',
          description: 'Menu item added successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }

      fetchMenuItems();
      onClose();
      resetForm();
      setNewCategory('');
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save menu item',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image || '',
      options: item.options || [{ name: '', choices: [''] }],
    });
    onOpen();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`${API_URL}/api/menu/${id}`);
        toast({
          title: 'Success',
          description: 'Menu item deleted successfully',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        fetchMenuItems();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete menu item',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      options: [{ name: '', choices: [''] }],
    });
    setEditingItem(null);
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { name: '', choices: [''] }],
    });
  };

  const addChoice = (optionIndex: number) => {
    const newOptions = [...formData.options];
    newOptions[optionIndex].choices.push('');
    setFormData({ ...formData, options: newOptions });
  };

  const handleOptionChange = (optionIndex: number, field: 'name' | 'choices', value: string, choiceIndex?: number) => {
    const newOptions = [...formData.options];
    if (field === 'name') {
      newOptions[optionIndex].name = value;
    } else if (typeof choiceIndex === 'number') {
      newOptions[optionIndex].choices[choiceIndex] = value;
    }
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={8}>
        <HStack justify="space-between" mb={6}>
          <Heading>Menu Management</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="green" onClick={() => { resetForm(); onOpen(); }}>
            Add New Item
          </Button>
        </HStack>

        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Image</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Price</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {menuItems.map((item) => (
              <Tr key={item._id}>
                <Td>
                  {item.image && (
                    <Image src={item.image} alt={item.name} boxSize="50px" objectFit="cover" />
                  )}
                </Td>
                <Td>{item.name}</Td>
                <Td>{item.category}</Td>
                <Td>{formatPrice(item.price)}</Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Edit item"
                      icon={<EditIcon />}
                      onClick={() => handleEdit(item)}
                      size="sm"
                    />
                    <IconButton
                      aria-label="Delete item"
                      icon={<DeleteIcon />}
                      onClick={() => handleDelete(item._id)}
                      size="sm"
                      colorScheme="red"
                    />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Item name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Item description"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Price (¥)</FormLabel>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  step="1"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Category</FormLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Select category"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="new">+ Add New Category</option>
                </Select>
              </FormControl>

              {formData.category === 'new' && (
                <FormControl>
                  <FormLabel>New Category Name</FormLabel>
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category name"
                  />
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Image URL</FormLabel>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Image URL"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Options</FormLabel>
                {formData.options.map((option, optionIndex) => (
                  <Box key={optionIndex} p={4} borderWidth={1} borderRadius="md" mb={4}>
                    <Input
                      value={option.name}
                      onChange={(e) => handleOptionChange(optionIndex, 'name', e.target.value)}
                      placeholder="Option name (e.g., Size, Spice Level)"
                      mb={2}
                    />
                    {option.choices.map((choice, choiceIndex) => (
                      <Input
                        key={choiceIndex}
                        value={choice}
                        onChange={(e) => handleOptionChange(optionIndex, 'choices', e.target.value, choiceIndex)}
                        placeholder="Choice value"
                        mb={2}
                      />
                    ))}
                    <Button size="sm" onClick={() => addChoice(optionIndex)} mb={2}>
                      Add Choice
                    </Button>
                  </Box>
                ))}
                <Button onClick={addOption}>Add Option</Button>
              </FormControl>

              <Button colorScheme="blue" width="full" onClick={handleSubmit}>
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default AdminDashboard; 