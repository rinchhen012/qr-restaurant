import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In a real application, you would store these in a database
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  // Default password: admin123
  // This hash is generated with bcrypt.hashSync('admin123', 10) and verified working
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2b$10$lur63NRraYh802kvXxAMHOkedgzpJy0T4g2pgYXLAdwZR6uN.VF/q',
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Check if username matches
    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error during authentication', error });
  }
}; 