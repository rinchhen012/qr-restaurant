import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  tableNumber: number;
  items: {
    menuItem: mongoose.Types.ObjectId;
    quantity: number;
    selectedOptions: Record<string, string>;
    specialInstructions?: string;
  }[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  specialRequests: string[];
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  tableNumber: { type: Number, required: true },
  items: [{
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
    selectedOptions: { type: Map, of: String, required: true },
    specialInstructions: String
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  specialRequests: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Order = mongoose.model<IOrder>('Order', orderSchema); 