import React, { useState } from 'react';
import {
  Box,
  Image,
  Text,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Stack,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Flex,
  useColorModeValue,
  AspectRatio,
} from '@chakra-ui/react';
import { useCart } from '../context/CartContext';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  options?: {
    name: string;
    choices: string[];
  }[];
}

interface MenuItemCardProps {
  item: MenuItem;
}

// Add a utility function for price formatting
const formatPrice = (price: number) => {
  return `¥${price.toLocaleString()}`;
};

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const disclosure = useDisclosure();
  const { dispatch } = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const handleAddToCart = () => {
    // Check if all required options are selected
    if (item.options && item.options.length > 0) {
      const missingOptions = item.options.filter(
        option => !selectedOptions[option.name]
      );

      if (missingOptions.length > 0) {
        toast({
          title: 'Required Options',
          description: `Please select ${missingOptions.map(opt => opt.name).join(', ')}`,
          status: 'error',
          duration: 3000,
          isClosable: true,
          position: 'top',
        });
        return;
      }
    }

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        menuItem: item,
        quantity,
        selectedOptions,
        specialInstructions,
      },
    });
    disclosure.onClose();
    setQuantity(1);
    setSelectedOptions({});
    setSpecialInstructions('');
    
    toast({
      title: 'Added to Cart',
      description: `${quantity}x ${item.name} added to your order`,
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'top',
    });
  };

  return (
    <>
      <Flex
        onClick={disclosure.onOpen}
        cursor="pointer"
        py={4}
        role="group"
        alignItems="center"
        _hover={{ bg: 'gray.50' }}
        transition="background 0.2s"
      >
        {/* Item Details */}
        <Box flex="1" pr={4}>
          <Text fontSize="lg" fontWeight="semibold" mb={1}>
            {item.name}
          </Text>
          <Text fontSize="sm" color={mutedColor} mb={2} noOfLines={2}>
            {item.description}
          </Text>
          <Text fontWeight="bold" fontSize="lg">
            {formatPrice(item.price)}
          </Text>
        </Box>

        {/* Item Image */}
        {item.image && (
          <AspectRatio ratio={1} width="100px" flexShrink={0}>
            <Image
              src={item.image}
              alt={item.name}
              objectFit="cover"
              borderRadius="lg"
            />
          </AspectRatio>
        )}
      </Flex>

      <Modal 
        isOpen={disclosure.isOpen} 
        onClose={disclosure.onClose} 
        size="full"
        motionPreset="slideInBottom"
      >
        <ModalOverlay />
        <ModalContent margin={0}>
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            borderBottomWidth="1px"
            py={4}
            pr={12}
          >
            {item.name}
          </ModalHeader>
          <ModalCloseButton size="lg" />
          <ModalBody px={4} pb={24}>
            <Stack spacing={6}>
              {item.image && (
                <AspectRatio ratio={16/9}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    objectFit="cover"
                    borderRadius="xl"
                  />
                </AspectRatio>
              )}
              
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={2}>
                  Description
                </Text>
                <Text fontSize="md" color={mutedColor}>
                  {item.description}
                </Text>
              </Box>
              
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  Quantity
                </Text>
                <NumberInput
                  value={quantity}
                  min={1}
                  max={10}
                  onChange={(_, valueNumber) => setQuantity(valueNumber)}
                  size="lg"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>

              {item.options?.map((option) => (
                <Box key={option.name}>
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    {option.name}
                  </Text>
                  <Select
                    placeholder={`Select ${option.name.toLowerCase()}`}
                    onChange={(e) =>
                      setSelectedOptions({
                        ...selectedOptions,
                        [option.name]: e.target.value,
                      })
                    }
                    size="lg"
                  >
                    {option.choices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </Select>
                </Box>
              ))}

              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  Special Instructions
                </Text>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special requests or allergies?"
                  size="lg"
                  rows={3}
                />
              </Box>
            </Stack>
          </ModalBody>

          <Box
            position="fixed"
            bottom={0}
            left={0}
            right={0}
            p={4}
            bg={bgColor}
            borderTopWidth="1px"
            borderColor={borderColor}
            shadow="lg"
          >
            <Button
              colorScheme="blue"
              size="lg"
              width="100%"
              onClick={handleAddToCart}
              height="60px"
              fontSize="lg"
            >
              Add to Cart • {formatPrice(item.price * quantity)}
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    </>
  );
};

export default MenuItemCard; 