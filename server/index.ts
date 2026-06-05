import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the environment variables from the root directory
dotenv.config({ path: '../.env' });

console.log('[Startup] Loading database schema...');

import { db } from './db';
import { schedules, forms, users, config, submissions, alerts, bundles } from './db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authenticateToken } from './middleware/auth';

console.log('[Startup] Setting up Express app...');

// Import route handlers
import usersRouter from './routes/users';
import formsRouter from './routes/forms';
import schedulesRouter from './routes/schedules';
import submissionsRouter from './routes/submissions';
import bundlesRouter from './routes/bundles';
import alertsRouter from './routes/alerts';
import configRouter from './routes/config';
import seedRouter from './routes/seed';
import authRouter from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// ============================================
// Register API Routes
// ============================================
import cookieParser from 'cookie-parser';
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/forms', authenticateToken, formsRouter);
app.use('/api/schedules', authenticateToken, schedulesRouter);
app.use('/api/submissions', authenticateToken, submissionsRouter);
app.use('/api/bundles', authenticateToken, bundlesRouter);
app.use('/api/alerts', authenticateToken, alertsRouter);
app.use('/api/config', configRouter);
app.use('/api/seed', authenticateToken, seedRouter);

// ============================================
// Existing Endpoints
// ============================================

// Basic test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// ============================================
// Test SLA Alert Now — force-send alert for all pending schedules today
// ============================================
app.post('/api/test-sla-now', authenticateToken, async (_req, res) => {
  try {
    const thTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const now = new Date(thTimeString);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Fetch config for emails
    const sysConfig = await db.select().from(config).limit(1);
    const settings = sysConfig[0]?.settings as Record<string, unknown> | undefined;
    const supervisorEmail = (settings?.supervisorEmail as string | undefined) || process.env.SUPERVISOR_EMAIL;

    // Get ALL pending schedules today (any shift, ignore slaAlertSent)
    const pendingSchedules = await db.select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, todayStr),
          eq(schedules.status, 'Pending')
        )
      );

    if (pendingSchedules.length === 0) {
      return res.json({ success: false, message: `ไม่มีตารางงาน Pending วันนี้ (${todayStr}) เลยครับ` });
    }

    // Group by staffId
    const staffGroup: Record<string, { staffId: string, shift: string, formIds: string[], scheduleIds: string[] }> = {};
    for (const s of pendingSchedules) {
      if (!staffGroup[s.staffId]) staffGroup[s.staffId] = { staffId: s.staffId, shift: s.shift, formIds: [], scheduleIds: [] };
      if (s.formId) staffGroup[s.staffId].formIds.push(s.formId);
      staffGroup[s.staffId].scheduleIds.push(s.id);
    }

    const transporter = getTransporter();
    const results: string[] = [];

    for (const group of Object.values(staffGroup)) {
      const staffRes = await db.select().from(users).where(eq(users.id, group.staffId)).limit(1);
      const staff = staffRes[0];
      if (!staff) continue;

      const formTitles = await Promise.all(group.formIds.map(async fId => {
        const fRes = await db.select().from(forms).where(eq(forms.id, fId)).limit(1);
        return fRes[0]?.title || 'Unknown Form';
      }));

      const shiftTh = group.shift === 'Morning' ? 'เช้า' : group.shift === 'Afternoon' ? 'บ่าย' : 'ดึก';
      const toList = [staff.email, supervisorEmail].filter(Boolean).join(',');
      const listHtml = formTitles.length > 0
        ? formTitles.map(t => `<li style="padding:5px 0;">${t}</li>`).join('')
        : '<li style="padding:5px 0;">(ไม่มีแบบฟอร์มระบุ)</li>';

      console.log(`[Test SLA] 👤 Staff: ${staff.name} | email in DB: "${staff.email}" | Supervisor: "${supervisorEmail}"`);
      console.log(`[Test SLA] 📤 Final toList: "${toList}"`);

      await transporter.sendMail({
        from: `"Imaging Alert System (TEST)" <${process.env.GMAIL_USER}>`,
        to: toList,
        subject: `🧪 [ทดสอบ] แจ้งเตือนคิวงานคงค้าง เวร${shiftTh} — ${staff.name}`,
        html: `
          <div style="font-family:sans-serif;color:#333;border:2px dashed #f0ad4e;padding:16px;border-radius:8px;">
            <p style="color:#f0ad4e;font-weight:bold;margin:0 0 8px;">🧪 นี่คืออีเมลทดสอบระบบ (Test Mode)</p>
            <h2 style="color:#d9534f;">⚠️ แจ้งเตือนรายการตรวจเช็คคงค้าง</h2>
            <p>เรียน คุณ ${staff.name}</p>
            <p>ระบบตรวจพบว่าคุณมีรายการตรวจเช็คที่ <strong>ยังไม่ได้ดำเนินการ</strong> ของเวร${shiftTh} จำนวน ${formTitles.length || '?'} รายการ ดังนี้:</p>
            <div style="background:#f9f9f9;padding:15px;border-left:4px solid #d9534f;margin:15px 0;">
              <ul style="margin:0;padding-left:20px;">${listHtml}</ul>
            </div>
            <p>กรุณาเข้าสู่ระบบเพื่อดำเนินการตรวจสอบโดยด่วน</p>
            <hr style="border:0;border-top:1px solid #eee;margin:20px 0;"/>
            <small style="color:#999;">อีเมลฉบับนี้ถูกส่งจากปุ่ม "ทดสอบส่งแจ้งเตือน" ใน Imaging Compliance System</small>
          </div>
        `,
      });

      results.push(`✅ ส่งถึง ${staff.name} (${toList})`);
      console.log(`[Test SLA] ✅ Sent to ${staff.name} — ${toList}`);
    }

    res.json({ success: true, sent: results, total: results.length });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Test SLA] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Reset Data — wipe submissions, schedules, alerts (keep users & forms)
// ============================================
app.post('/api/reset-data', authenticateToken, async (_req, res) => {
  try {
    // Delete in FK-safe order: submissions before schedules
    await db.delete(submissions);
    await db.delete(schedules);
    await db.delete(alerts);
    await db.delete(bundles);
    res.json({ success: true, message: 'All submissions, schedules, alerts, and bundles have been cleared.' });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Create Nodemailer transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Test Email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const targetEmail = req.body.email || process.env.SUPERVISOR_EMAIL;
    if (!targetEmail) throw new Error('No target email provided');

    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Imaging Test" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: '🔔 Test Email - Imaging Compliance System (From UI)',
      html: `<h1>ทดสอบส่งอีเมล</h1><p>ระบบส่งอีเมลจากปุ่มในหน้าจอทำงานได้ปกติครับ ✅</p><p>ส่งถึง: ${targetEmail}</p>`,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send Reminder Email endpoint
app.post('/api/send-reminder-email', async (req, res) => {
  try {
    const { staffEmail, staffName, supervisorEmail, formTitle, shift } = req.body;

    // Read SLA hours dynamically from DB config
    const sysConfig = await db.select().from(config).limit(1);
    const cfgSettings = sysConfig[0]?.settings as Record<string, unknown> | undefined;
    const slaHoursCfg = (cfgSettings?.slaHours as { Morning?: number, Afternoon?: number, Night?: number }) || {};
    const slaLimit = shift === 'Morning'
      ? (slaHoursCfg.Morning ?? 3)
      : shift === 'Afternoon'
        ? (slaHoursCfg.Afternoon ?? 2)
        : (slaHoursCfg.Night ?? 2);
    const slaText = slaLimit === 1 ? '1 ชั่วโมง' : `${slaLimit} ชั่วโมง`;

    const shiftTh = shift === 'Morning' ? 'เช้า' : shift === 'Afternoon' ? 'บ่าย' : 'ดึก';
    const subject = `⚠️ แจ้งเตือน: กรุณาตรวจเช็ค ${formTitle} (เวร${shiftTh})`;
    
    const toList = [staffEmail, supervisorEmail].filter(Boolean).join(',');
    if (!toList) throw new Error('No recipients provided');

    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Imaging Alert System" <${process.env.GMAIL_USER}>`,
      to: toList,
      subject,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #d9534f;">⚠️ แจ้งเตือนคิวงานคงค้าง</h2>
          <p>เรียน คุณ ${staffName || 'พนักงาน'}</p>
          <p>ระบบตรวจพบว่าคุณยังมีรายการตรวจเช็คที่ยังไม่ได้ดำเนินการผ่านไปแล้ว ${slaText} ของเวร${shiftTh} ดังนี้:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 15px 0;">
            <strong>รายการ:</strong> ${formTitle}
          </div>
          <p>กรุณาเข้าสู่ระบบเพื่อดำเนินการตรวจสอบและบันทึกข้อมูลโดยด่วน</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <small style="color: #999;">อีเมลฉบับนี้ถูกส่งอัตโนมัติจาก Imaging Compliance System</small>
        </div>
      `,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Error sending reminder email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Export Data API
// ============================================
app.get('/api/export-data', authenticateToken, async (_req, res) => {
  try {
    const allSubmissions = await db.select().from(submissions);
    const allSchedules = await db.select().from(schedules);
    const allAlerts = await db.select().from(alerts);
    const allUsers = await db.select().from(users);
    const allForms = await db.select().from(forms);
    const allBundles = await db.select().from(bundles);
    const allConfig = await db.select().from(config);
    
    res.json({
      exportedAt: new Date().toISOString(),
      submissions: allSubmissions,
      schedules: allSchedules,
      alerts: allAlerts,
      users: allUsers,
      forms: allForms,
      bundles: allBundles,
      config: allConfig
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ============================================
// Import Data API
// ============================================
app.post('/api/import-data', authenticateToken, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.users || !payload.forms || !payload.config) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    // 1. Delete all existing data in reverse dependency order
    await db.delete(alerts);
    await db.delete(submissions);
    await db.delete(schedules);
    await db.delete(bundles);
    await db.delete(forms);
    await db.delete(users);
    await db.delete(config);

    // 2. Insert imported data
    if (payload.users?.length) await db.insert(users).values(payload.users);
    if (payload.forms?.length) await db.insert(forms).values(payload.forms);
    if (payload.bundles?.length) await db.insert(bundles).values(payload.bundles);
    if (payload.schedules?.length) await db.insert(schedules).values(payload.schedules);
    if (payload.submissions?.length) await db.insert(submissions).values(payload.submissions);
    if (payload.alerts?.length) await db.insert(alerts).values(payload.alerts);
    if (payload.config?.length) await db.insert(config).values(payload.config);

    res.json({ success: true, message: 'Database imported successfully' });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

// ============================================
// SLA Alert Background Job Logic
// ============================================
const runSLAJob = async () => {
  try {
    // Ensure we check SLA against Thailand Timezone (UTC+7)
    const thTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
    const now = new Date(thTimeString);
    
    const currentHour = now.getHours();
    const currentDecimalHour = currentHour + (now.getMinutes() / 60);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    console.log(`[SLA Job] ⏰ Running at ${now.toLocaleTimeString('th-TH')} (${currentDecimalHour.toFixed(2)} decimal) | Date: ${todayStr}`);
    
    // Fetch config first to get SLA hours and emails
    const sysConfig = await db.select().from(config).limit(1);
    const settings = sysConfig[0]?.settings as Record<string, unknown> | undefined;
    const supervisorEmail = (settings?.supervisorEmail as string | undefined) || process.env.SUPERVISOR_EMAIL;
    const escalationEmail = (settings?.escalationEmail as string | undefined);
    const slaHours = (settings?.slaHours as { Morning: number, Afternoon: number, Night: number }) || { Morning: 1.5, Afternoon: 1.5, Night: 1.5 };
    console.log(`[SLA Job] 📧 Supervisor: ${supervisorEmail} | SLA: Morning=${slaHours.Morning}h, Afternoon=${slaHours.Afternoon}h, Night=${slaHours.Night}h`);

    // Helper: parse start hour from shift string like "08:00 - 16:00"
    const parseShiftStartHour = (shiftStr: string | undefined, fallback: number): number => {
      if (!shiftStr) return fallback;
      const match = shiftStr.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return fallback;
      return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
    };

    // Read shift start times from DB config (falls back to 8, 16, 0 if not set)
    const shiftsConfig = settings?.shifts as { Morning?: string, Afternoon?: string, Night?: string } | undefined;
    const mStart = parseShiftStartHour(shiftsConfig?.Morning, 8);
    const aStart = parseShiftStartHour(shiftsConfig?.Afternoon, 16);
    const nStart = parseShiftStartHour(shiftsConfig?.Night, 0);

    // End of each shift = start of the next shift
    const mEnd = aStart;
    const aEnd = 24; // Midnight boundary
    const nEnd = mStart;

    const mLimit = mStart + slaHours.Morning;
    const aLimit = aStart + slaHours.Afternoon;
    const nLimit = nStart + slaHours.Night;

    let targetShift = '';
    let isEscalated = false;

    if (currentDecimalHour >= mLimit && currentDecimalHour < mEnd) {
      targetShift = 'Morning';
      if (currentDecimalHour >= mLimit + 2) isEscalated = true;
    } else if (currentDecimalHour >= aLimit && currentDecimalHour < aEnd) {
      targetShift = 'Afternoon';
      if (currentDecimalHour >= aLimit + 2) isEscalated = true;
    } else if (nStart === 0) {
      // Night shift is purely post-midnight (00:00 → mStart)
      // SLA alert fires only within [nLimit, nEnd)
      if (currentDecimalHour >= nLimit && currentDecimalHour < nEnd) {
        targetShift = 'Night';
        if (currentDecimalHour >= nLimit + 2) isEscalated = true;
      }
    } else {
      // Night shift crosses midnight (nStart→24, then 0→nEnd)
      const inNightWindow = (currentDecimalHour >= nStart && currentDecimalHour < 24) ||
                            (currentDecimalHour >= 0 && currentDecimalHour < nEnd);
      if (inNightWindow) {
        const hoursPastLimit = currentDecimalHour >= nLimit
          ? currentDecimalHour - nLimit
          : (24 - nLimit) + currentDecimalHour;
        if (hoursPastLimit >= 0) {
          targetShift = 'Night';
          if (hoursPastLimit >= 2) isEscalated = true;
        }
      }
    }

    console.log(`[SLA Job] 🔍 Shift windows: Morning=${mStart.toFixed(2)}-${mEnd.toFixed(2)} (SLA@${mLimit.toFixed(2)}), Afternoon=${aStart.toFixed(2)}-${aEnd} (SLA@${aLimit.toFixed(2)}), Night=${nStart.toFixed(2)} (SLA@${nLimit.toFixed(2)})`);
    console.log(`[SLA Job] 🎯 Detected shift: ${targetShift || 'NONE (not in alert window)'}${isEscalated ? ' [ESCALATED]' : ''}`);

    if (!targetShift) return; // Not time to alert yet

    // Get all pending schedules for today and the target shift
    const pendingSchedules = await db.select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, todayStr),
          eq(schedules.shift, targetShift),
          eq(schedules.status, 'Pending'),
          eq(schedules.slaAlertSent, false)
        )
      );

    console.log(`[SLA Job] 📋 Pending schedules for ${targetShift}: ${pendingSchedules.length} found`);
    if (pendingSchedules.length === 0) return;

    // Group by staffId (include schedules without formId so they still trigger alerts)
    const staffGroup: Record<string, { staffId: string, formIds: string[], scheduleIds: string[] }> = {};
    for (const s of pendingSchedules) {
      if (!staffGroup[s.staffId]) staffGroup[s.staffId] = { staffId: s.staffId, formIds: [], scheduleIds: [] };
      if (s.formId) staffGroup[s.staffId].formIds.push(s.formId);
      staffGroup[s.staffId].scheduleIds.push(s.id);
    }

    const transporter = getTransporter();

    // Send consolidated email per staff
    for (const group of Object.values(staffGroup)) {
      const staffRes = await db.select().from(users).where(eq(users.id, group.staffId)).limit(1);
      const staff = staffRes[0];
      if (!staff) continue;

      const formTitles = await Promise.all(group.formIds.map(async fId => {
        const fRes = await db.select().from(forms).where(eq(forms.id, fId)).limit(1);
        return fRes[0]?.title || 'Unknown Form';
      }));

      const shiftTh = targetShift === 'Morning' ? 'เช้า' : targetShift === 'Afternoon' ? 'บ่าย' : 'ดึก';
      const subject = `⚠️ แจ้งเตือน: คิวงานคงค้าง (เวร${shiftTh})${isEscalated ? ' [ESCALATED]' : ''}`;
      
      const recipients = [staff.email, supervisorEmail];
      if (isEscalated && escalationEmail) {
        recipients.push(escalationEmail);
      }
      const toList = recipients.filter(Boolean).join(',');

      const listHtml = formTitles.map(t => `<li style="padding: 5px 0;">${t}</li>`).join('');

      console.log(`[SLA Job] 📤 Sending to: ${toList} | Forms: ${formTitles.join(', ') || '(no form)'}`);

      await transporter.sendMail({
        from: `"Imaging Alert System" <${process.env.GMAIL_USER}>`,
        to: toList,
        subject,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #d9534f;">⚠️ แจ้งเตือนรายการตรวจเช็คคงค้าง</h2>
            <p>เรียน คุณ ${staff.name}</p>
            <p>ระบบตรวจพบว่าคุณมีรายการตรวจเช็คที่ <strong>ยังไม่ได้ดำเนินการผ่านกำหนดเวลา</strong> ของเวร${shiftTh} จำนวน ${formTitles.length} รายการ ดังนี้:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 15px 0;">
              <ul style="margin: 0; padding-left: 20px;">
                ${listHtml}
              </ul>
            </div>
            <p>กรุณาเข้าสู่ระบบเพื่อดำเนินการตรวจสอบโดยด่วน</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <small style="color: #999;">อีเมลฉบับนี้ถูกส่งอัตโนมัติจาก Imaging Compliance System (Consolidated Alert)</small>
          </div>
        `,
      });

      // Update SLA sent status to prevent duplicate emails
      await db.update(schedules)
        .set({ slaAlertSent: true })
        .where(inArray(schedules.id, group.scheduleIds));
      console.log(`[SLA Job] ✅ Email sent & slaAlertSent=true for schedules: ${group.scheduleIds.join(', ')}`);
    }

  } catch (err: unknown) {
    console.error('[SLA Job] ❌ Error in background job:', err instanceof Error ? err.message : String(err));
  }
};

// Run the job every 1 minute
setInterval(runSLAJob, 1 * 60 * 1000);

// Endpoint to trigger SLA job immediately (called by frontend when settings are saved)
app.post('/api/trigger-sla', authenticateToken, async (req, res) => {
  try {
    console.log('[API] Manual SLA trigger requested');
    await runSLAJob();
    res.json({ success: true, message: 'SLA job triggered immediately' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});


// ============================================
// Fallback for unknown API routes (404)
// ============================================
app.all('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// ============================================
// Serve Frontend in Production
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================
// Global Error Handler
// ============================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

try {
  if (!process.env.DATABASE_URL) {
    console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is missing!');
    process.exit(1);
  }
  
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing, using fallback.');
  }

  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
} catch (e) {
  console.error('❌ CRITICAL ERROR during startup:', e);
  process.exit(1);
}
