import express from 'express';
import {
  getAllFloorPlans,
  getFloorPlanById,
  getDefaultFloorPlan,
  createFloorPlan,
  updateFloorPlan,
  deleteFloorPlan
} from '../controllers/floorPlanController';

const router = express.Router();

router.get('/', getAllFloorPlans);
router.get('/default', getDefaultFloorPlan);
router.get('/:id', getFloorPlanById);
router.post('/', createFloorPlan);
router.put('/:id', updateFloorPlan);
router.delete('/:id', deleteFloorPlan);

export default router; 