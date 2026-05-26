import { Router } from 'express';
import { db } from '../db';
import { submissions, schedules } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/submissions — fetch all submissions
router.get('/', async (_req, res) => {
  try {
    const allSubmissions = await db.select().from(submissions);
    const mapped = allSubmissions.map(s => ({
      id: s.id,
      scheduleId: s.scheduleId,
      staffId: s.staffId,
      formId: s.formId,
      submittedAt: s.submittedAt,
      data: s.data as Record<string, unknown>,
      photos: s.photos as string[],
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// POST /api/submissions — create submission + mark schedule as completed
router.post('/', async (req, res) => {
  try {
    const { scheduleId, staffId, formId, data, photos } = req.body;

    const isAdhoc = scheduleId && String(scheduleId).startsWith('manual-');
    const dbScheduleId = isAdhoc ? null : (scheduleId || null);

    let newSubmission;

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

export default router;
