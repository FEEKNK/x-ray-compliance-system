import { Router } from 'express';
import { db } from '../db';
import { schedules } from '../db/schema';
import { eq, inArray, and, gte, lte } from 'drizzle-orm';

const router = Router();

// GET /api/schedules — fetch schedules with optional date filtering
router.get('/', async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;
    
    let whereClause = undefined;

    if (startDate && endDate) {
      // Use exact start and end dates (YYYY-MM-DD)
      whereClause = and(gte(schedules.date, startDate as string), lte(schedules.date, endDate as string));
    } else if (month && year) {
      // Filter by specific month
      const mStr = String(month).padStart(2, '0');
      const startOfMonth = `${year}-${mStr}-01`;
      // Calculate last day of the month
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endOfMonth = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      whereClause = and(gte(schedules.date, startOfMonth), lte(schedules.date, endOfMonth));
    } else if (year) {
      // Filter by entire year
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;
      whereClause = and(gte(schedules.date, startOfYear), lte(schedules.date, endOfYear));
    } else {
      // Fallback: Rolling 3-month window to prevent DB exhaustion
      const now = new Date();
      // -45 days to +45 days gives roughly a 3-month window
      const past = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
      const future = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
      
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      const futureStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
      
      whereClause = and(gte(schedules.date, pastStr), lte(schedules.date, futureStr));
    }

    const allSchedules = await db.select().from(schedules).where(whereClause);
    res.json(allSchedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// POST /api/schedules — create schedule(s), supports single or array
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];

    const values = items.map(s => ({
      date: s.date,
      shift: s.shift,
      staffId: s.staffId,
      formId: s.formId ?? null,
      location: s.location ?? null,
      supervisorId: s.supervisorId,
      status: s.status || 'Pending',
    }));

    const created = await db.insert(schedules).values(values).returning();
    res.status(201).json(Array.isArray(body) ? created : created[0]);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id — update schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, shift, staffId, formId, location, date, supervisorId } = req.body;
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (shift !== undefined) updateData.shift = shift;
    if (staffId !== undefined) updateData.staffId = staffId;
    if (formId !== undefined) updateData.formId = formId;
    if (location !== undefined) updateData.location = location;
    if (date !== undefined) updateData.date = date;
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId;

    const [updated] = await db.update(schedules)
      .set(updateData)
      .where(eq(schedules.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Schedule not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id — delete single schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(schedules).where(eq(schedules.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// POST /api/schedules/bulk-delete — delete multiple schedules
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await db.delete(schedules).where(inArray(schedules.id, ids));
    res.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    console.error('Error bulk deleting schedules:', error);
    res.status(500).json({ error: 'Failed to bulk delete schedules' });
  }
});

export default router;
