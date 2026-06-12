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
  lockoutHours: { Morning: 3, Afternoon: 2, Night: 2 },
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

    // Deep-patch slaHours: fill in any missing individual shift keys
    const currentSlaHours = (current.slaHours || {}) as Record<string, unknown>;
    const patchedSlaHours = { ...DEFAULT_SETTINGS.slaHours, ...currentSlaHours };
    if (JSON.stringify(patchedSlaHours) !== JSON.stringify(currentSlaHours)) {
      patched.slaHours = patchedSlaHours;
      needsPatch = true;
    }

    // Deep-patch shifts: fill in any missing individual shift keys (e.g. Night was missing)
    const currentShifts = (current.shifts || {}) as Record<string, unknown>;
    const patchedShifts = { ...DEFAULT_SETTINGS.shifts, ...currentShifts };
    if (JSON.stringify(patchedShifts) !== JSON.stringify(currentShifts)) {
      patched.shifts = patchedShifts;
      needsPatch = true;
    }

    // Deep-patch lockoutHours: fill in any missing individual shift keys
    const currentLockout = (current.lockoutHours || {}) as Record<string, unknown>;
    const patchedLockout = { ...DEFAULT_SETTINGS.lockoutHours, ...currentLockout };
    if (JSON.stringify(patchedLockout) !== JSON.stringify(currentLockout)) {
      patched.lockoutHours = patchedLockout;
      needsPatch = true;
    }

    if (!current.departments) { patched.departments = DEFAULT_SETTINGS.departments; needsPatch = true; }
    if (!current.escalationEmail) { patched.escalationEmail = DEFAULT_SETTINGS.escalationEmail; needsPatch = true; }
    if (needsPatch) {
      await db.update(config).set({ settings: patched }).where(eq(config.id, CONFIG_ID));
    }
  }
}

// GET /api/config/public — fetch non-sensitive settings for login page (no auth required)
router.get('/public', async (_req, res) => {
  try {
    await ensureConfig();
    const [row] = await db.select().from(config).where(eq(config.id, CONFIG_ID));
    const settings = row.settings as Record<string, unknown>;
    res.json({
      settings: {
        hospitalName: settings?.hospitalName || DEFAULT_SETTINGS.hospitalName,
        departments: settings?.departments || DEFAULT_SETTINGS.departments,
      },
      announcements: row.announcements,
    });
  } catch (error) {
    console.error('Error fetching public config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// GET /api/config — fetch full settings and announcements (requires auth)
router.get('/', authenticateToken, async (_req, res) => {
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
