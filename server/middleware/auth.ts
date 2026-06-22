import express from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  role: string;
  employeeId: string;
}

interface AuthenticatedRequest extends express.Request {
  user?: JwtPayload;
}

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_secret_for_development_only';

export const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies?.xray_jwt_token;
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  jwt.verify(token, getJwtSecret(), (err: unknown, user: unknown) => {
    if (err) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.user = user as JwtPayload;
    next();
  });
};

/**
 * Middleware to require ADMIN role.
 * Must be used AFTER authenticateToken.
 */
export const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const user = req.user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
