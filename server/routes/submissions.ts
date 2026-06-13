import { Router } from 'express';
import { db } from '../db';
import { submissions, schedules } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/submissions — fetch paginated submissions
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    let whereClause = undefined;

    if (month && year) {
      // Filter by specific month
      const { and, gte, lte } = await import('drizzle-orm');
      const mStr = String(month).padStart(2, '0');
      const startOfMonth = `${year}-${mStr}-01T00:00:00.000Z`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endOfMonth = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
      whereClause = and(gte(submissions.submittedAt, startOfMonth), lte(submissions.submittedAt, endOfMonth));
    } else if (year) {
      // Filter by entire year
      const { and, gte, lte } = await import('drizzle-orm');
      const startOfYear = `${year}-01-01T00:00:00.000Z`;
      const endOfYear = `${year}-12-31T23:59:59.999Z`;
      whereClause = and(gte(submissions.submittedAt, startOfYear), lte(submissions.submittedAt, endOfYear));
    }

    const page = parseInt(req.query.page as string) || 1;
    // If filtering by date, fetch a large limit by default unless explicitly specified
    const limit = parseInt(req.query.limit as string) || (whereClause ? 10000 : 50);
    const offset = (page - 1) * limit;

    const allSubmissions = await db.select()
      .from(submissions)
      .where(whereClause)
      .orderBy(desc(submissions.submittedAt))
      .limit(limit)
      .offset(offset);

    const totalCount = whereClause ? await db.$count(submissions, whereClause) : await db.$count(submissions);

    const mapped = allSubmissions.map(s => ({
      id: s.id,
      scheduleId: s.scheduleId,
      staffId: s.staffId,
      formId: s.formId,
      submittedAt: s.submittedAt,
      data: s.data as Record<string, unknown>,
      photos: s.photos as string[],
    }));
    
    res.json({
      data: mapped,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/submissions/schedule/:scheduleId — fetch by schedule ID
router.get('/schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const existing = await db.select().from(submissions).where(eq(submissions.scheduleId, scheduleId)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const s = existing[0];
    res.json({
      id: s.id,
      scheduleId: s.scheduleId,
      staffId: s.staffId,
      formId: s.formId,
      submittedAt: s.submittedAt,
      data: s.data as Record<string, unknown>,
      photos: s.photos as string[],
    });
  } catch (error) {
    console.error('Error fetching submission by schedule ID:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// POST /api/submissions — create submission + mark schedule as completed
router.post('/', async (req, res) => {
  try {
    const { scheduleId, staffId, formId, data, photos } = req.body;

    const isAdhoc = scheduleId && String(scheduleId).startsWith('manual-');
    const dbScheduleId = isAdhoc ? null : (scheduleId || null);

    let newSubmission: any;

    if (dbScheduleId) {
      const existing = await db.select().from(submissions).where(eq(submissions.scheduleId, dbScheduleId)).limit(1);
      if (existing.length > 0) {
        const [updated] = await db.update(submissions)
          .set({ data, photos: photos || [], submittedAt: new Date().toISOString() })
          .where(eq(submissions.id, existing[0].id))
          .returning();
        newSubmission = updated;
      }
    }

    if (!newSubmission) {
      const [inserted] = await db.insert(submissions).values({
        scheduleId: dbScheduleId,
        staffId,
        formId,
        data,
        photos: photos || [],
      }).returning();
      newSubmission = inserted;
    }

    // Mark the related schedule as Completed if scheduleId exists and is not a manual/ad-hoc one
    if (dbScheduleId) {
      await db.update(schedules)
        .set({ status: 'Completed' })
        .where(eq(schedules.id, dbScheduleId))
        .catch(() => { /* schedule might not exist */ });
    }

    if (!newSubmission) {
      throw new Error('Failed to create or update submission');
    }

    res.status(201).json({
      ...newSubmission,
      data: newSubmission.data as Record<string, unknown>,
      photos: newSubmission.photos as string[],
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// DELETE /api/submissions/:id — delete a submission and reset schedule to Pending
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the submission first to get the scheduleId
    const [existing] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    if (!existing) {
      throw new Error('NOT_FOUND');
    }

    // Delete the submission
    await db.delete(submissions).where(eq(submissions.id, id));

    // Reset the related schedule back to Pending (if it has a real scheduleId)
    if (existing.scheduleId) {
      await db.update(schedules)
        .set({ status: 'Pending' })
        .where(eq(schedules.id, existing.scheduleId))
        .catch(() => { /* schedule might not exist */ });
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Submission not found' });
    }
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

export default router;

