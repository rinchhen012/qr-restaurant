import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    selectedOptions: {
      type: Map,
      of: String,
    },
    specialInstructions: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  specialRequests: [{
    type: String,
  }],
  totalAmount: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

export const Order = mongoose.model('Order', orderSchema); 