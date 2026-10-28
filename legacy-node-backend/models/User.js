import { createModelAdapter } from '@/lib/prisma-adapter';
import bcrypt from 'bcryptjs';

export const matchPassword = async (enteredPassword, storedHash) => {
  if (!enteredPassword || !storedHash) return false;
  try {
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
      return await bcrypt.compare(enteredPassword, storedHash);
    }
    return enteredPassword === storedHash;
  } catch (err) {
    console.error('matchPassword error:', err);
    return false;
  }
};

const User = createModelAdapter('user');

export default User;
