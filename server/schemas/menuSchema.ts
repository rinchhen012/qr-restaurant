import { z } from 'zod';

const menuItemBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  image: z.string().optional(),
  options: z.array(
    z.object({
      name: z.string().min(1, 'Option name is required'),
      choices: z.array(z.string().min(1, 'Choice is required')).min(1, 'At least one choice is required'),
    })
  ).optional(),
});

export const menuItemSchema = z.object({
  body: menuItemBodySchema,
});

export const updateMenuItemSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Menu item ID is required'),
  }),
  body: menuItemBodySchema.partial(),
});

export const menuItemIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Menu item ID is required'),
  }),
}); 