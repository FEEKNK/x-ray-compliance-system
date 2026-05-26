import { Router } from 'express';
import { db } from '../db';
import { alerts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/alerts — fetch all alerts (latest first, limit 50)
router.get('/', async (_req, res) => {
  try {
    const allAlerts = await db.select().from(alerts).orderBy(desc(alerts.timestamp)).limit(50);
    res.json(allAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/alerts — create a new alert
router.post('/', async (req, res) => {
  try {
    const { type, message, staffId, formId } = req.body;
    const [newAlert] = await db.insert(alerts).values({
      type,
      message,
      staffId: staffId || null,
      formId: formId || null,
    }).returning();
    res.status(201).json(newAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// PATCH /api/alerts/:id/read — mark alert as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Alert not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

export default router;
