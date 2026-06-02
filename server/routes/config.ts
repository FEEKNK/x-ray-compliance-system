import { Router } from 'express';
import { db } from '../db';
import { config } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const CONFIG_ID = 'main';

const DEFAULT_SETTINGS = {
  hospitalName: "โรงพยาบาลกรุงเทพสิริโรจน์",
  supervisorEmail: "supervisor@hospital.com",
  escalationEmail: "director@hospital.com",
  departments: ["IMAGING", "MRI"],
  slaHours: { Morning: 3, Afternoon: 2, Night: 2 },
  shifts: {
    Morning: "08:00 - 16:00",
    Afternoon: "16:00 - 00:00",
    Night: "00:00 - 08:00"
  }
};

// Helper to ensure config row exists and has all required fields
async function ensureConfig() {
  const existing = await db.select().from(config).where(eq(config.id, CONFIG_ID));
  if (existing.length === 0) {
    await db.insert(config).values({
      id: CONFIG_ID,
      settings: DEFAULT_SETTINGS,
      announcements: [
        "New JCI Standards for medical imaging have been updated in the system.",
        "Biomedical Engineering maintenance window starts at 22:00 tonight."
      ],
    });
  } else {
    // Patch any missing nested fields in old rows
    const current = (existing[0].settings || {}) as Record<string, unknown>;
    let needsPatch = false;
    const patched = { ...DEFAULT_SETTINGS, ...current };
    if (!current.slaHours) { patched.slaHours = DEFAULT_SETTINGS.slaHours; needsPatch = true; }
    if (!current.shifts) { patched.shifts = DEFAULT_SETTINGS.shifts; needsPatch = true; }
    if (!current.departments) { patched.departments = DEFAULT_SETTINGS.departments; needsPatch = true; }
    if (!current.escalationEmail) { patched.escalationEmail = DEFAULT_SETTINGS.escalationEmail; needsPatch = true; }
    if (needsPatch) {
      await db.update(config).set({ settings: patched }).where(eq(config.id, CONFIG_ID));
    }
  }
}

// GET /api/config — fetch settings and announcements
router.get('/', async (_req, res) => {
  try {
    await ensureConfig();
    const [row] = await db.select().from(config).where(eq(config.id, CONFIG_ID));
    res.json({
      settings: row.settings,
      announcements: row.announcements,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT /api/config — update settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    await ensureConfig();
    const { settings } = req.body;
    const [updated] = await db.update(config)
      .set({ settings })
      .where(eq(config.id, CONFIG_ID))
      .returning();
    res.json({ settings: updated.settings, announcements: updated.announcements });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// POST /api/config/announcements — add an announcement
router.post('/announcements', authenticateToken, async (req, res) => {
  try {
    await ensureConfig();
    const { text } = req.body;
    const [row] = await db.select().from(config).where(eq(config.id, CONFIG_ID));
    const currentAnnouncements = (row.announcements as string[]) || [];
    const updated = [text, ...currentAnnouncements].slice(0, 5);
    
    const [result] = await db.update(config)
      .set({ announcements: updated })
      .where(eq(config.id, CONFIG_ID))
      .returning();
    
    res.json({ announcements: result.announcements });
  } catch (error) {
    console.error('Error adding announcement:', error);
    res.status(500).json({ error: 'Failed to add announcement' });
  }
});

export default router;
