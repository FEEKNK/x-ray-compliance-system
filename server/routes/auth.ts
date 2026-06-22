import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { loginId, pin } = req.body;
    
    if (!loginId || !pin) {
      return res.status(400).json({ error: 'Missing loginId or pin' });
    }

    const [user] = await db.select().from(users).where(
      or(eq(users.employeeId, loginId), eq(users.email, loginId))
    ).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pinHash) {
      if (pin !== user.employeeId) {
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
        employeeId: user.employeeId,
        requirePasswordChange: user.requirePasswordChange,
        // Exclude pinHash for security
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

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify old password
    if (user.pinHash && oldPassword) {
      const isValid = await bcrypt.compare(oldPassword, user.pinHash);
      if (!isValid) return res.status(401).json({ error: 'Invalid old password' });
    } else if (!user.pinHash && oldPassword !== user.employeeId) {
       return res.status(401).json({ error: 'Invalid old password' });
    }

    // Hash new password
    const pinHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ pinHash, requirePasswordChange: false }).where(eq(users.id, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
