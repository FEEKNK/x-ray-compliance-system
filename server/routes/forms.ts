import { Router } from 'express';
import { db } from '../db';
import { forms } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/forms — fetch all forms
router.get('/', async (_req, res) => {
  try {
    const allForms = await db.select().from(forms);
    // Map DB columns to frontend expected shape
    const mapped = allForms.map(f => ({
      id: f.id,
      title: f.title,
      description: f.description,
      questions: f.questions as unknown[],
      isActive: f.isActive,
      createdAt: f.createdAt,
      shifts: f.shifts as string[] | null,
      department: f.department,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// POST /api/forms — create a new form
router.post('/', async (req, res) => {
  try {
    const { title, description, questions, isActive, shifts, department } = req.body;
    const [newForm] = await db.insert(forms).values({
      title,
      description,
      questions,
      isActive: isActive ?? true,
      shifts: shifts ?? null,
      department: department ?? null,
    }).returning();
    res.status(201).json({
      ...newForm,
      questions: newForm.questions as unknown[],
      shifts: newForm.shifts as string[] | null,
    });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// PUT /api/forms/:id — update form
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, questions, isActive, shifts, department } = req.body;
    const [updated] = await db.update(forms)
      .set({ title, description, questions, isActive, shifts, department })
      .where(eq(forms.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Form not found' });
    res.json({
      ...updated,
      questions: updated.questions as unknown[],
      shifts: updated.shifts as string[] | null,
    });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// DELETE /api/forms/:id — delete form
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(forms).where(eq(forms.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

export default router;
