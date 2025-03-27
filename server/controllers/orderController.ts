import { Request, Response } from 'express';
import { Order } from '../models/Order';

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'items.menuItem',
        model: 'MenuItem',
        select: 'name price'
      })
      .sort({ createdAt: -1 });

    // Filter out any orders with invalid menu items
    const validOrders = orders.map(order => {
      const validItems = order.items.filter(item => item.menuItem);
      return {
        ...order.toObject(),
        items: validItems
      };
    }).filter(order => order.items.length > 0);

    res.json(validOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const order = new Order(req.body);
    await order.save();
    const populatedOrder = await order.populate('items.menuItem');
    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order status', error });
  }
};

export const addSpecialRequest = async (req: Request, res: Response) => {
  try {
    const { request } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $push: { specialRequests: request } },
      { new: true }
    ).populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error adding special request', error });
  }
};

export const getOrdersByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const orders = await Order.find({ status })
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders by status', error });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    ).populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error updating payment status', error });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.menuItem');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error });
  }
}; 