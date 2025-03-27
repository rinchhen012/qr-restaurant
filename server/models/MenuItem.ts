import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
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

const menuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String, required: false },
  available: { type: Boolean, default: true },
  options: [{
    name: { type: String, required: true },
    choices: [{ type: String, required: true }]
  }]
}, {
  timestamps: true,
});

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema); 