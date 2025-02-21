import { z } from 'zod';

export const orderSchema = z.object({
  body: z.object({
    tableNumber: z.number().int().positive('Table number must be positive'),
    items: z.array(
      z.object({
        menuItem: z.string().min(1, 'Menu item ID is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
        selectedOptions: z.record(z.string()).optional(),
        specialInstructions: z.string().optional(),
      })
    ).min(1, 'At least one item is required'),
    totalAmount: z.number().positive('Total amount must be positive'),
  }),
});

export const orderStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
  body: z.object({
    status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']),
  }),
});

export const specialRequestSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Order ID is required'),
  }),
  body: z.object({
    request: z.string().min(1, 'Request is required'),
  }),
}); 