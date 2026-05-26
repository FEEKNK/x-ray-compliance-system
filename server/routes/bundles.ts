import { Router } from 'express';
import { db } from '../db';
import { bundles } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/bundles — fetch all bundles
router.get('/', async (_req, res) => {
  try {
    const allBundles = await db.select().from(bundles);
    const mapped = allBundles.map(b => ({
      id: b.id,
      name: b.name,
      department: b.department,
      formIds: b.formIds as string[],
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching bundles:', error);
    res.status(500).json({ error: 'Failed to fetch bundles' });
  }
});

// POST /api/bundles — create a new bundle
router.post('/', async (req, res) => {
  try {
    const { name, department, formIds } = req.body;
    const [newBundle] = await db.insert(bundles).values({
      name,
      department,
      formIds,
    }).returning();
    res.status(201).json({
      ...newBundle,
      formIds: newBundle.formIds as string[],
    });
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({ error: 'Failed to create bundle' });
  }
});

// PUT /api/bundles/:id — update bundle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, formIds } = req.body;
    const [updated] = await db.update(bundles)
      .set({ name, department, formIds })
      .where(eq(bundles.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Bundle not found' });
    res.json({
      ...updated,
      formIds: updated.formIds as string[],
    });
  } catch (error) {
    console.error('Error updating bundle:', error);
    res.status(500).json({ error: 'Failed to update bundle' });
  }
});

// DELETE /api/bundles/:id — delete bundle
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(bundles).where(eq(bundles.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Bundle not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({ error: 'Failed to delete bundle' });
  }
});

export default router;
