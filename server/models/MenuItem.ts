import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  options: [{
    name: {
      type: String,
      required: true,
    },
    choices: [{
      type: String,
      required: true,
    }],
  }],
}, {
  timestamps: true,
});

export const MenuItem = mongoose.model('MenuItem', menuItemSchema); 