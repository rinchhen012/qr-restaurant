import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import authRoutes from './routes/authRoutes';
import tableRoutes from './routes/tableRoutes';
import floorPlanRoutes from './routes/floorPlanRoutes';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/floorplans', floorPlanRoutes);

// Protected admin routes
app.use('/api/menu', authenticateToken, menuRoutes); // Protect POST, PUT, DELETE
app.use('/api/orders/status', authenticateToken, orderRoutes); // Protect order status updates

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle connection error
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('new-order', (order) => {
    try {
      io.emit('kitchen-update', { type: 'new-order', order });
    } catch (error) {
      console.error('Error handling new order:', error);
    }
  });

  socket.on('order-status-update', ({ orderId, status }) => {
    try {
      io.emit('order-status-update', { orderId, status });
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  });

  socket.on('customer-request', (request) => {
    try {
      io.emit('kitchen-notification', request);
    } catch (error) {
      console.error('Error handling customer request:', error);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected (${socket.id}):`, reason);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-restaurant';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    console.log('Server will continue running without MongoDB connection');
  }); 