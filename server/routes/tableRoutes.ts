import express from 'express';
import { activateTable, deactivateTable, getTableStatus, getAllTables } from '../controllers/tableController';

const router = express.Router();

router.get('/', getAllTables);
router.post('/:tableNumber/activate', activateTable);
router.post('/:tableNumber/deactivate', deactivateTable);
router.get('/:tableNumber/status', getTableStatus);

export default router; 