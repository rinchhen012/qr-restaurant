import express from 'express';
import {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  addSpecialRequest,
  getOrdersByStatus,
  updatePaymentStatus,
  getOrderById,
} from '../controllers/orderController';
import { validateRequest } from '../middleware/validateRequest';
import { orderSchema, orderStatusSchema, specialRequestSchema, paymentStatusSchema } from '../schemas/orderSchema';

const router = express.Router();

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/status/:status', getOrdersByStatus);
router.post('/', validateRequest(orderSchema), createOrder);
router.put('/:id/status', validateRequest(orderStatusSchema), updateOrderStatus);
router.put('/:id/special-request', validateRequest(specialRequestSchema), addSpecialRequest);
router.put('/:id/payment-status', validateRequest(paymentStatusSchema), updatePaymentStatus);

export default router; 