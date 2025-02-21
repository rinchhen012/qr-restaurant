import express from 'express';
import {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateCategory,
  deleteCategory,
} from '../controllers/menuController';
import { validateRequest } from '../middleware/validateRequest';
import { menuItemSchema, updateMenuItemSchema, menuItemIdSchema } from '../schemas/menuSchema';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllMenuItems);

// Protected routes - require authentication
router.post('/', authenticateToken, validateRequest(menuItemSchema), createMenuItem);
router.put('/:id', authenticateToken, validateRequest(updateMenuItemSchema), updateMenuItem);
router.delete('/:id', authenticateToken, validateRequest(menuItemIdSchema), deleteMenuItem);
router.put('/category/:category', authenticateToken, updateCategory);
router.delete('/category/:category', authenticateToken, deleteCategory);

export default router; 