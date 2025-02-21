import bcrypt from 'bcryptjs';

const password = 'admin123';
const storedHash = '$2b$10$ZG9uFDk2b4S8GNQHxHUOj.y1YkqQhUzrJPHJYBn9sA0hBNwYEJNMC';

// Generate a new hash
const newHash = bcrypt.hashSync(password, 10);
console.log('New hash:', newHash);

// Test the stored hash
const isValidStored = bcrypt.compareSync(password, storedHash);
console.log('Stored hash valid:', isValidStored);

// Test the new hash
const isValidNew = bcrypt.compareSync(password, newHash);
console.log('New hash valid:', isValidNew); 