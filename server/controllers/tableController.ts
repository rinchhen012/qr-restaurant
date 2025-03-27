import { Request, Response } from 'express';
import { Table } from '../models/Table';
import { Order } from '../models/Order';

export const getAllTables = async (req: Request, res: Response) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Error fetching tables', error });
  }
};

export const activateTable = async (req: Request, res: Response) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });

    if (!table) {
      // Create new table if it doesn't exist
      const newTable = await Table.create({
        tableNumber: parseInt(tableNumber),
        isActive: true,
        lastActivatedAt: new Date()
      });
      return res.json(newTable);
    }

    if (table.isActive) {
      return res.status(400).json({ message: 'Table is already active' });
    }

    // Check if there are any unpaid orders for this table
    const unpaidOrder = await Order.findOne({
      tableNumber: parseInt(tableNumber),
      paymentStatus: 'pending'
    });

    if (unpaidOrder) {
      return res.status(400).json({ message: 'Table has unpaid orders' });
    }

    table.isActive = true;
    table.lastActivatedAt = new Date();
    await table.save();

    res.json(table);
  } catch (error) {
    console.error('Error activating table:', error);
    res.status(500).json({ message: 'Error activating table', error });
  }
};

export const deactivateTable = async (req: Request, res: Response) => {
  try {
    const { tableNumber } = req.params;
    const table = await Table.findOne({ tableNumber: parseInt(tableNumber) });

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    if (!table.isActive) {
      return res.status(400).json({ message: 'Table is already inactive' });
    }

    // Check if there are any unpaid orders
    const unpaidOrder = await Order.findOne({
      tableNumber: parseInt(tableNumber),
      paymentStatus: 'pending'
    });

    if (unpaidOrder) {
      return res.status(400).json({ message: 'Cannot deactivate table with unpaid orders' });
    }

    table.isActive = false;
    table.lastDeactivatedAt = new Date();
    await table.save();

    res.json(table);
  } catch (error) {
    console.error('Error deactivating table:', error);
    res.status(500).json({ message: 'Error deactivating table', error });
  }
};

export const getTableStatus = async (req: Request, res: Response) => {
  try {
    const { tableNumber } = req.params;
    let table = await Table.findOne({ tableNumber: parseInt(tableNumber) });

    if (!table) {
      // Create new table if it doesn't exist
      table = await Table.create({
        tableNumber: parseInt(tableNumber),
        isActive: false
      });
    }

    res.json(table);
  } catch (error) {
    console.error('Error getting table status:', error);
    res.status(500).json({ message: 'Error getting table status', error });
  }
}; 