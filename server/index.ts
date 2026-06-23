import express from 'express';
import { logger } from './logger';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the environment variables from the root directory
dotenv.config({ path: '../.env' });

logger.info('[Startup] Loading database schema...');

import { authenticateToken, requireAdmin } from './middleware/auth';

logger.info('[Startup] Setting up Express app...');

// Import route handlers
import usersRouter from './routes/users';
import formsRouter from './routes/forms';
import schedulesRouter from './routes/schedules';
import submissionsRouter from './routes/submissions';
import bundlesRouter from './routes/bundles';
import alertsRouter from './routes/alerts';
import configRouter from './routes/config';
import seedRouter from './routes/seed';
import authRouter from './routes/auth';
import emailRouter from './routes/email';
import dataRouter from './routes/data';

// Import background jobs
import { runSLAJob } from './jobs/slaJob';
import { runWeeklyBackupJob } from './jobs/weeklyBackup';

import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// ============================================
// Register API Routes
// ============================================
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/forms', authenticateToken, formsRouter);
app.use('/api/schedules', authenticateToken, schedulesRouter);
app.use('/api/submissions', authenticateToken, submissionsRouter);
app.use('/api/bundles', authenticateToken, bundlesRouter);
app.use('/api/alerts', authenticateToken, alertsRouter);
app.use('/api/config', configRouter);
app.use('/api/seed', authenticateToken, requireAdmin, seedRouter);
app.use('/api', emailRouter);
app.use('/api', dataRouter);

// Basic health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Endpoint to trigger SLA job immediately (called by frontend when settings are saved)
app.post('/api/trigger-sla', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    logger.info('[API] Manual SLA trigger requested');
    await runSLAJob();
    res.json({ success: true, message: 'SLA job triggered immediately' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// Background Jobs
// ============================================
setInterval(runSLAJob, 1 * 60 * 1000);        // Run SLA check every 1 minute
setInterval(runWeeklyBackupJob, 5 * 60 * 1000); // Check for weekly backup every 5 minutes

// ============================================
// Fallback for unknown API routes (404)
// ============================================
app.all('/api/{*path}', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ============================================
// Serve Frontend in Production
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================
// Global Error Handler
// ============================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('[Global Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Startup
// ============================================
try {
  if (!process.env.DATABASE_URL) {
    logger.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is missing!');
    process.exit(1);
  }
  
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is required in production!');
      process.exit(1);
    }
    logger.warn('⚠️ WARNING: JWT_SECRET environment variable is missing, using fallback (dev only).');
  }

  app.listen(PORT, () => {
    logger.info(`✅ Server is running on port ${PORT}`);
  });
} catch (e) {
  logger.error('❌ CRITICAL ERROR during startup:', e);
  process.exit(1);
}
