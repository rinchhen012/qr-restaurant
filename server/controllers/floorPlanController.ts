import { Request, Response } from 'express';
import { FloorPlan } from '../models/FloorPlan';
import { Table } from '../models/Table';

export const getAllFloorPlans = async (req: Request, res: Response) => {
  try {
    const floorPlans = await FloorPlan.find().populate('tables');
    res.json(floorPlans);
  } catch (error) {
    console.error('Error fetching floor plans:', error);
    res.status(500).json({ message: 'Error fetching floor plans', error });
  }
};

export const getFloorPlanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const floorPlan = await FloorPlan.findById(id).populate('tables');
    
    if (!floorPlan) {
      return res.status(404).json({ message: 'Floor plan not found' });
    }
    
    res.json(floorPlan);
  } catch (error) {
    console.error('Error fetching floor plan:', error);
    res.status(500).json({ message: 'Error fetching floor plan', error });
  }
};

export const getDefaultFloorPlan = async (req: Request, res: Response) => {
  try {
    let floorPlan = await FloorPlan.findOne({ isDefault: true }).populate('tables');
    
    // If no default floor plan exists, create one
    if (!floorPlan) {
      const tables = await Table.find();
      
      floorPlan = await FloorPlan.create({
        name: 'Default Floor Plan',
        tables: tables.map(table => table._id),
        isDefault: true
      });
      
      floorPlan = await FloorPlan.findById(floorPlan._id).populate('tables');
    }
    
    res.json(floorPlan);
  } catch (error) {
    console.error('Error fetching default floor plan:', error);
    res.status(500).json({ message: 'Error fetching default floor plan', error });
  }
};

export const createFloorPlan = async (req: Request, res: Response) => {
  try {
    const { name, tables, isDefault } = req.body;
    
    // Validate table IDs
    if (tables && tables.length > 0) {
      for (const tableId of tables) {
        const tableExists = await Table.exists({ _id: tableId });
        if (!tableExists) {
          return res.status(400).json({ message: `Table with ID ${tableId} does not exist` });
        }
      }
    }
    
    const newFloorPlan = await FloorPlan.create({
      name,
      tables: tables || [],
      isDefault: isDefault || false
    });
    
    const populatedFloorPlan = await FloorPlan.findById(newFloorPlan._id).populate('tables');
    
    res.status(201).json(populatedFloorPlan);
  } catch (error) {
    console.error('Error creating floor plan:', error);
    res.status(500).json({ message: 'Error creating floor plan', error });
  }
};

export const updateFloorPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tables, isDefault } = req.body;
    
    const floorPlan = await FloorPlan.findById(id);
    if (!floorPlan) {
      return res.status(404).json({ message: 'Floor plan not found' });
    }
    
    // Validate table IDs if provided
    if (tables && tables.length > 0) {
      // Extract IDs if full table objects were sent
      const tableIds = tables.map((table: any) => 
        typeof table === 'string' ? table : table._id
      );
      
      // Validate that all tables exist
      for (const tableId of tableIds) {
        const tableExists = await Table.exists({ _id: tableId });
        if (!tableExists) {
          return res.status(400).json({ message: `Table with ID ${tableId} does not exist` });
        }
      }
      
      floorPlan.tables = tableIds;
    }
    
    if (name) floorPlan.name = name;
    if (isDefault !== undefined) floorPlan.isDefault = isDefault;
    
    await floorPlan.save();
    
    const updatedFloorPlan = await FloorPlan.findById(id).populate('tables');
    
    res.json(updatedFloorPlan);
  } catch (error) {
    console.error('Error updating floor plan:', error);
    res.status(500).json({ message: 'Error updating floor plan', error });
  }
};

export const deleteFloorPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const floorPlan = await FloorPlan.findById(id);
    if (!floorPlan) {
      return res.status(404).json({ message: 'Floor plan not found' });
    }
    
    // Don't allow deletion of the default floor plan
    if (floorPlan.isDefault) {
      return res.status(400).json({ message: 'Cannot delete the default floor plan' });
    }
    
    await FloorPlan.findByIdAndDelete(id);
    
    res.json({ message: 'Floor plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting floor plan:', error);
    res.status(500).json({ message: 'Error deleting floor plan', error });
  }
}; 