import { Router } from 'express';
import { db } from '../db';
import { users, forms, schedules, bundles, config } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// POST /api/seed — seed database from db.json
router.post('/', async (_req, res) => {
  try {
    // Read db.json from the src/data directory
    const dbJsonPath = path.resolve(__dirname, '../../src/data/db.json');
    if (!fs.existsSync(dbJsonPath)) {
      return res.status(404).json({ error: 'db.json not found at ' + dbJsonPath });
    }

    const raw = fs.readFileSync(dbJsonPath, 'utf-8');
    const data = JSON.parse(raw);

    const results: Record<string, number> = {};

    // 1. Seed Users
    if (data.users && data.users.length > 0) {
      // Clear existing users first
      await db.delete(users);
      for (const user of data.users) {
        await db.insert(users).values({
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          department: user.department,
          email: user.email,
          role: user.role,
        }).onConflictDoNothing();
      }
      results.users = data.users.length;
    }

    // 2. Seed Forms
    if (data.forms && data.forms.length > 0) {
      await db.delete(forms);
      for (const form of data.forms) {
        await db.insert(forms).values({
          id: form.id,
          title: form.title,
          description: form.description,
          questions: form.questions,
          isActive: form.isActive ?? true,
          shifts: form.shifts ?? null,
          department: form.department ?? null,
        }).onConflictDoNothing();
      }
      results.forms = data.forms.length;
    }

    // 3. Seed Bundles
    if (data.bundles && data.bundles.length > 0) {
      await db.delete(bundles);
      for (const bundle of data.bundles) {
        await db.insert(bundles).values({
          id: bundle.id,
          name: bundle.name,
          department: bundle.department,
          formIds: bundle.formIds,
        }).onConflictDoNothing();
      }
      results.bundles = data.bundles.length;
    }

    // 4. Seed Schedules
    if (data.schedules && data.schedules.length > 0) {
      await db.delete(schedules);
      for (const schedule of data.schedules) {
        await db.insert(schedules).values({
          id: schedule.id,
          date: schedule.date,
          shift: schedule.shift,
          staffId: schedule.staffId,
          formId: schedule.formId ?? null,
          location: schedule.location ?? null,
          supervisorId: schedule.supervisorId,
          status: schedule.status || 'Pending',
        }).onConflictDoNothing();
      }
      results.schedules = data.schedules.length;
    }

    // 5. Seed Config
    const existing = await db.select().from(config).where(eq(config.id, 'main'));
    if (existing.length === 0) {
      await db.insert(config).values({
        id: 'main',
        settings: {
          hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
          supervisorEmail: "supervisor@hospital.com",
          shifts: {
            Morning: "08:00 - 16:00",
            Afternoon: "16:00 - 00:00",
            Night: "00:00 - 08:00"
          }
        },
        announcements: [
          "New JCI Standards for medical imaging have been updated in the system.",
          "Biomedical Engineering maintenance window starts at 22:00 tonight."
        ],
      });
      results.config = 1;
    }

    res.json({
      success: true,
      message: 'Database seeded successfully',
      seeded: results,
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
