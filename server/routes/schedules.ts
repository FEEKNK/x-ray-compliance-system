import { Router } from 'express';
import { db } from '../db';
import { schedules } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

const router = Router();

// GET /api/schedules — fetch all schedules
router.get('/', async (_req, res) => {
  try {
    const allSchedules = await db.select().from(schedules);
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
