import express from 'express';
import { 
  activateTable, 
  deactivateTable, 
  getTableStatus, 
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  updateTablePosition,
  deleteTable
} from '../controllers/tableController';

const router = express.Router();

// Table management routes
router.get('/', getAllTables);
router.get('/:id', getTableById);
router.post('/', createTable);
router.put('/:id', updateTable);
router.put('/:id/position', updateTablePosition);
router.delete('/:id', deleteTable);

// Table activation/deactivation routes
router.post('/:tableNumber/activate', activateTable);
router.post('/:tableNumber/deactivate', deactivateTable);
router.get('/:tableNumber/status', getTableStatus);

export default router; 