import express from 'express';
import { db } from '../db';
import { schedules, forms, users, config, submissions, alerts, bundles } from '../db/schema';
import { logger } from '../logger';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getFullExportData } from '../utils/exportData';

const router = express.Router();

// Reset Data — wipe submissions, schedules, alerts (keep users & forms)
router.post('/reset-data', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    // Delete in FK-safe order: submissions before schedules
    await db.delete(submissions);
    await db.delete(schedules);
    await db.delete(alerts);
    await db.delete(bundles);
    res.json({ success: true, message: 'All submissions, schedules, alerts, and bundles have been cleared.' });
  } catch (error) {
    logger.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Export Data API
router.get('/export-data', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const data = await getFullExportData();
    res.json(data);
  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Import Data API
router.post('/import-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payload, options } = req.body;
    // Fallback to req.body if payload is not nested (legacy support)
    const data = payload || req.body;
    
    if (!data || !data.users || !data.forms || !data.config) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    const mode = options?.mode || 'replace_all';
    const collections = options?.collections || ['settings', 'users', 'forms', 'schedules', 'submissions'];

    if (mode === 'replace_all') {
      // 1. Delete all existing data in reverse dependency order
      await db.delete(alerts);
      await db.delete(submissions);
      await db.delete(schedules);
      await db.delete(bundles);
      await db.delete(forms);
      await db.delete(users);
      await db.delete(config);

      // 2. Insert imported data
      if (data.users?.length) await db.insert(users).values(data.users);
      if (data.forms?.length) await db.insert(forms).values(data.forms);
      if (data.bundles?.length) await db.insert(bundles).values(data.bundles);
      if (data.schedules?.length) await db.insert(schedules).values(data.schedules);
      if (data.submissions?.length) await db.insert(submissions).values(data.submissions);
      if (data.alerts?.length) await db.insert(alerts).values(data.alerts);
      if (data.config?.length) await db.insert(config).values(data.config);
    } else if (mode === 'merge') {
      // Upsert selected collections
      if (collections.includes('settings') && data.config?.length) {
        for (const c of data.config) {
          await db.insert(config).values(c).onConflictDoUpdate({ target: config.id, set: c });
        }
      }
      if (collections.includes('users') && data.users?.length) {
        for (const u of data.users) {
          await db.insert(users).values(u).onConflictDoUpdate({ target: users.id, set: u });
        }
      }
      if (collections.includes('forms') && data.forms?.length) {
        for (const f of data.forms) {
          await db.insert(forms).values(f).onConflictDoUpdate({ target: forms.id, set: f });
        }
        if (data.bundles?.length) {
          for (const b of data.bundles) {
            await db.insert(bundles).values(b).onConflictDoUpdate({ target: bundles.id, set: b });
          }
        }
      }
      if (collections.includes('schedules') && data.schedules?.length) {
        for (const s of data.schedules) {
          await db.insert(schedules).values(s).onConflictDoUpdate({ target: schedules.id, set: s });
        }
      }
      if (collections.includes('submissions') && data.submissions?.length) {
        for (const sub of data.submissions) {
          await db.insert(submissions).values(sub).onConflictDoUpdate({ target: submissions.id, set: sub });
        }
      }
    }

    res.json({ success: true, message: 'Database imported successfully' });
  } catch (error) {
    logger.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

export default router;
