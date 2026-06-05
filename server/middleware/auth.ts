import express from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends express.Request {
  user?: unknown;
}

export const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies?.xray_jwt_token;
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development_only', (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.user = user;
    next();
  });
};
