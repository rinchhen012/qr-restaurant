import { Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem';

export const getAllMenuItems = async (req: Request, res: Response) => {
  try {
    const menuItems = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu items', error });
  }
};

export const createMenuItem = async (req: Request, res: Response) => {
  try {
    const menuItem = new MenuItem(req.body);
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ message: 'Error creating menu item', error });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(menuItem);
  } catch (error) {
    res.status(400).json({ message: 'Error updating menu item', error });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting menu item', error });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { newCategory } = req.body;
    const oldCategory = req.params.category;

    // Update all menu items with the old category to the new category
    const result = await MenuItem.updateMany(
      { category: oldCategory },
      { $set: { category: newCategory } }
    );

    res.json({
      message: 'Category updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating category', error });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = req.params.category;

    // Check if category has any items
    const itemsInCategory = await MenuItem.countDocuments({ category });
    if (itemsInCategory > 0) {
      return res.status(400).json({
        message: 'Cannot delete category that contains items',
        itemCount: itemsInCategory,
      });
    }

    // Since categories are derived from menu items and we've verified
    // there are no items in this category, we can just return success
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error });
  }
}; 