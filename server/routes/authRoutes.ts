import express from 'express';
import { login } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema } from '../schemas/authSchema';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/login', validateRequest(loginSchema), login);

// Test endpoint to verify authentication
router.get('/test', authenticateToken, (req, res) => {
  res.json({ message: 'Authentication successful', user: req.user });
});

export default router; 