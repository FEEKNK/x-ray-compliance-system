import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    
    if (!userId || !pin) {
      return res.status(400).json({ error: 'Missing userId or pin' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pinHash) {
      // For backward compatibility before seed is updated
      if (pin === user.employeeId) {
        // Automatically hash and save if missing
        const pinHash = await bcrypt.hash(pin, 10);
        await db.update(users).set({ pinHash }).where(eq(users.id, user.id));
      } else {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    } else {
      const isValid = await bcrypt.compare(pin, user.pinHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, employeeId: user.employeeId },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Set HttpOnly cookie
    res.cookie('xray_jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    // Return sanitized user (without token)
    res.json({
      user: {
        id: user.id,
        name: user.name,
        department: user.department,
        role: user.role,
        email: user.email,
        // Exclude employeeId and pinHash for security
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('xray_jwt_token');
  res.json({ success: true });
});

export default router;
