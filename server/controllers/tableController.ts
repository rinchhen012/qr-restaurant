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

export const getTableById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const table = await Table.findById(id);
    
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    res.json(table);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ message: 'Error fetching table', error });
  }
};

export const createTable = async (req: Request, res: Response) => {
  try {
    const { tableNumber, isActive, position, shape } = req.body;
    
    // Check if table with this number already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ message: 'Table with this number already exists' });
    }
    
    const newTable = await Table.create({
      tableNumber,
      isActive: isActive || false,
      position: position || { x: 50, y: 50 },
      shape: shape || 'square',
      lastActivatedAt: isActive ? new Date() : undefined
    });
    
    res.status(201).json(newTable);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ message: 'Error creating table', error });
  }
};

export const updateTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shape, tableNumber } = req.body;
    
    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // If table number is being changed, check for uniqueness
    if (tableNumber && tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({ tableNumber });
      if (existingTable) {
        return res.status(400).json({ message: 'Table with this number already exists' });
      }
      table.tableNumber = tableNumber;
    }
    
    if (shape) table.shape = shape;
    
    await table.save();
    
    res.json(table);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ message: 'Error updating table', error });
  }
};

export const updateTablePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position } = req.body;
    
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return res.status(400).json({ message: 'Valid position with x and y coordinates is required' });
    }
    
    const table = await Table.findByIdAndUpdate(
      id,
      { position },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    res.json(table);
  } catch (error) {
    console.error('Error updating table position:', error);
    res.status(500).json({ message: 'Error updating table position', error });
  }
};

export const deleteTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check for active orders
    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    const activeOrder = await Order.findOne({
      tableNumber: table.tableNumber,
      paymentStatus: 'pending'
    });
    
    if (activeOrder) {
      return res.status(400).json({ 
        message: 'Cannot delete table with active orders. Please complete or cancel the orders first.' 
      });
    }
    
    await Table.findByIdAndDelete(id);
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ message: 'Error deleting table', error });
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