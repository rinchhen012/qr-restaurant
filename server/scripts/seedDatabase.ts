import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MenuItem } from '../models/MenuItem';
import { sampleMenuItems } from '../data/sampleMenu';

dotenv.config();

const seedDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-restaurant';
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items');

    // Insert sample menu items
    await MenuItem.insertMany(sampleMenuItems);
    console.log('Sample menu items inserted successfully');

    await mongoose.disconnect();
    console.log('Database seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase(); 