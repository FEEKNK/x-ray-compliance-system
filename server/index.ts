import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the environment variables from the root directory
dotenv.config({ path: '../.env' });

console.log('[Startup] Loading database schema...');

import { db } from './db';
import { schedules, forms, users, config, submissions, alerts, bundles } from './db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authenticateToken, requireAdmin } from './middleware/auth';
import { getTransporter, escapeHtml } from './services/email';

/**
 * Get current time in Bangkok timezone (UTC+7) — stable across environments.
 */
function getBangkokNow(): Date {
  const utcMs = Date.now();
  return new Date(utcMs + 7 * 60 * 60 * 1000);
}

function getBangkokDateStr(d?: Date): string {
  const now = d ?? getBangkokNow();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

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
app.use('/api/seed', authenticateToken, requireAdmin, seedRouter);

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
app.post('/api/test-sla-now', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const now = getBangkokNow();
    const todayStr = getBangkokDateStr(now);

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

      const shiftTh = group.shift === 'Morning' ? 'เช้า' : group.shift === 'Afternoon' ? 'บ่าย' : group.shift === 'NightBeforeMorning' ? 'ดึกก่อนเช้า' : 'ดึก';
      const toList = [staff.email, supervisorEmail].filter(Boolean).join(',');
      const listHtml = formTitles.length > 0
        ? formTitles.map(t => `<li style="padding:5px 0;">${escapeHtml(t)}</li>`).join('')
        : '<li style="padding:5px 0;">(ไม่มีแบบฟอร์มระบุ)</li>';

      const safeStaffName = escapeHtml(staff.name);
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
            <p>เรียน คุณ ${safeStaffName}</p>
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
app.post('/api/reset-data', authenticateToken, requireAdmin, async (_req, res) => {
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

// Transporter is now imported from './services/email'

// Test Email endpoint
app.post('/api/test-email', authenticateToken, async (req, res) => {
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
app.post('/api/send-reminder-email', authenticateToken, async (req, res) => {
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

    const shiftTh = shift === 'Morning' ? 'เช้า' : shift === 'Afternoon' ? 'บ่าย' : shift === 'NightBeforeMorning' ? 'ดึกก่อนเช้า' : 'ดึก';
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
          <p>เรียน คุณ ${escapeHtml(staffName || 'พนักงาน')}</p>
          <p>ระบบตรวจพบว่าคุณยังมีรายการตรวจเช็คที่ยังไม่ได้ดำเนินการผ่านไปแล้ว ${slaText} ของเวร${shiftTh} ดังนี้:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 15px 0;">
            <strong>รายการ:</strong> ${escapeHtml(formTitle)}
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
app.get('/api/export-data', authenticateToken, requireAdmin, async (_req, res) => {
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
app.post('/api/import-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payload, options } = req.body;
    // Fallback to req.body if payload is not nested (legacy support)
    const data = payload || req.body;
    
    if (!data || !data.users || !data.forms || !data.config) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    const mode = options?.mode || 'replace_all';
    const collections = options?.collections || ['settings', 'users', 'forms', 'schedules', 'submissions'];

    if (mode === 'replace_all') {
      // 1. Delete all existing data in reverse dependency order
      await db.delete(alerts);
      await db.delete(submissions);
      await db.delete(schedules);
      await db.delete(bundles);
      await db.delete(forms);
      await db.delete(users);
      await db.delete(config);

      // 2. Insert imported data
      if (data.users?.length) await db.insert(users).values(data.users);
      if (data.forms?.length) await db.insert(forms).values(data.forms);
      if (data.bundles?.length) await db.insert(bundles).values(data.bundles);
      if (data.schedules?.length) await db.insert(schedules).values(data.schedules);
      if (data.submissions?.length) await db.insert(submissions).values(data.submissions);
      if (data.alerts?.length) await db.insert(alerts).values(data.alerts);
      if (data.config?.length) await db.insert(config).values(data.config);
    } else if (mode === 'merge') {
      // Upsert selected collections
      if (collections.includes('settings') && data.config?.length) {
        for (const c of data.config) {
          await db.insert(config).values(c).onConflictDoUpdate({ target: config.id, set: c });
        }
      }
      if (collections.includes('users') && data.users?.length) {
        for (const u of data.users) {
          await db.insert(users).values(u).onConflictDoUpdate({ target: users.id, set: u });
        }
      }
      if (collections.includes('forms') && data.forms?.length) {
        for (const f of data.forms) {
          await db.insert(forms).values(f).onConflictDoUpdate({ target: forms.id, set: f });
        }
        if (data.bundles?.length) {
          for (const b of data.bundles) {
            await db.insert(bundles).values(b).onConflictDoUpdate({ target: bundles.id, set: b });
          }
        }
      }
      if (collections.includes('schedules') && data.schedules?.length) {
        for (const s of data.schedules) {
          await db.insert(schedules).values(s).onConflictDoUpdate({ target: schedules.id, set: s });
        }
      }
      if (collections.includes('submissions') && data.submissions?.length) {
        for (const sub of data.submissions) {
          await db.insert(submissions).values(sub).onConflictDoUpdate({ target: submissions.id, set: sub });
        }
      }
    }

    res.json({ success: true, message: 'Database imported successfully' });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

// ============================================
// SLA Alert Background Job Logic
// ============================================
function parseShiftStartHour(timeRangeStr: string | undefined, defaultHour: number): number {
  if (!timeRangeStr) return defaultHour;
  const match = timeRangeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return defaultHour;
  const hr = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  return hr + (min / 60);
}

const runSLAJob = async () => {
  try {
    // Ensure we check SLA against Thailand Timezone (UTC+7)
    const now = getBangkokNow();
    
    const currentHour = now.getUTCHours();
    const currentDecimalHour = currentHour + (now.getUTCMinutes() / 60);
    const todayStr = getBangkokDateStr(now);
    
    console.log(`[SLA Job] ⏰ Running at ${currentHour}:${String(now.getUTCMinutes()).padStart(2,'0')} BKK (${currentDecimalHour.toFixed(2)} decimal) | Date: ${todayStr}`);
    
    // Fetch config first to get SLA hours and emails
    const sysConfig = await db.select().from(config).limit(1);
    const settings = sysConfig[0]?.settings as Record<string, unknown> | undefined;
    const supervisorEmail = (settings?.supervisorEmail as string | undefined) || process.env.SUPERVISOR_EMAIL;
    const escalationEmail = (settings?.escalationEmail as string | undefined);
    const slaHoursCfg = (settings?.slaHours as { Morning?: number, Afternoon?: number, Night?: number, NightBeforeMorning?: number }) || {};
    const shiftsConfig = settings?.shifts as { Morning?: string, Afternoon?: string, Night?: string, NightBeforeMorning?: string } | undefined;

    const shiftsList = [
      { name: 'Morning', start: parseShiftStartHour(shiftsConfig?.Morning, 8), sla: slaHoursCfg.Morning ?? 1.5 },
      { name: 'Afternoon', start: parseShiftStartHour(shiftsConfig?.Afternoon, 16), sla: slaHoursCfg.Afternoon ?? 1.5 },
      { name: 'Night', start: parseShiftStartHour(shiftsConfig?.Night, 0), sla: slaHoursCfg.Night ?? 1.5 },
      { name: 'NightBeforeMorning', start: parseShiftStartHour(shiftsConfig?.NightBeforeMorning, 4), sla: slaHoursCfg.NightBeforeMorning ?? 1.5 }
    ].sort((a, b) => a.start - b.start);

    for (let i = 0; i < shiftsList.length; i++) {
      const current = shiftsList[i];
      const next = shiftsList[(i + 1) % shiftsList.length];
      
      let end = next.start;
      if (end <= current.start) {
        end += 24; // wraps around midnight
      }
      (current as any).end = end;
      (current as any).limit = current.start + current.sla;
    }

    const shiftsMap = new Map(shiftsList.map(s => [s.name, s]));
    const transporter = getTransporter();

    // ==========================================
    // 1. STAFF SLA REMINDER (During Shift)
    // ==========================================
    const staffPending = await db.select().from(schedules).where(
      and(eq(schedules.status, 'Pending'), eq(schedules.slaAlertSent, false))
    );
    
    const staffToAlert: typeof staffPending = [];
    for (const sched of staffPending) {
       const s = shiftsMap.get(sched.shift);
       if (!s) continue;
       
       const schedDate = new Date(`${sched.date}T00:00:00.000Z`);
       const deadlineTime = schedDate.getTime() + ((s as any).limit * 60 * 60 * 1000);
       const endTime = schedDate.getTime() + ((s as any).end * 60 * 60 * 1000);
       
       if (now.getTime() >= deadlineTime && now.getTime() < endTime) {
          staffToAlert.push(sched);
       }
    }

    if (staffToAlert.length > 0) {
      console.log(`[SLA Job] 📋 Pending schedules for STAFF SLA: ${staffToAlert.length} found`);
      const staffGroup: Record<string, { staffId: string, formIds: string[], scheduleIds: string[], shift: string }> = {};
      for (const s of staffToAlert) {
        if (!staffGroup[s.staffId]) staffGroup[s.staffId] = { staffId: s.staffId, formIds: [], scheduleIds: [], shift: s.shift };
        if (s.formId) staffGroup[s.staffId].formIds.push(s.formId);
        staffGroup[s.staffId].scheduleIds.push(s.id);
      }

      const allStaffIds = [...new Set(Object.values(staffGroup).map(g => g.staffId))];
      const allFormIds = [...new Set(Object.values(staffGroup).flatMap(g => g.formIds))];
      const allStaff = allStaffIds.length > 0 ? await db.select().from(users).where(inArray(users.id, allStaffIds)) : [];
      const allFormsData = allFormIds.length > 0 ? await db.select().from(forms).where(inArray(forms.id, allFormIds)) : [];
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      const formMap = new Map(allFormsData.map(f => [f.id, f]));

      for (const group of Object.values(staffGroup)) {
        const staff = staffMap.get(group.staffId);
        if (!staff) continue;

        const formTitles = group.formIds.map(fId => formMap.get(fId)?.title || 'Unknown Form');
        const shiftTh = group.shift === 'Morning' ? 'เช้า' : group.shift === 'Afternoon' ? 'บ่าย' : group.shift === 'NightBeforeMorning' ? 'ดึกก่อนเช้า' : 'ดึก';
        
        const listHtml = formTitles.map(t => `<li style="padding: 5px 0;">${escapeHtml(t)}</li>`).join('');
        
        await transporter.sendMail({
          from: `"Imaging Alert System" <${process.env.GMAIL_USER}>`,
          to: staff.email,
          subject: `⚠️ แจ้งเตือน: คิวงานคงค้าง (เวร${shiftTh})`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2 style="color: #d9534f;">⚠️ แจ้งเตือนรายการตรวจเช็คคงค้าง</h2>
              <p>เรียน คุณ ${escapeHtml(staff.name)}</p>
              <p>ระบบตรวจพบว่าคุณมีรายการตรวจเช็คที่ <strong>เลยกำหนดเวลา (SLA)</strong> ของเวร${shiftTh} จำนวน ${formTitles.length} รายการ ดังนี้:</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 15px 0;">
                <ul style="margin: 0; padding-left: 20px;">
                  ${listHtml}
                </ul>
              </div>
              <p>กรุณาเข้าสู่ระบบเพื่อดำเนินการตรวจสอบโดยด่วน ก่อนหมดเวลาเวร</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <small style="color: #999;">อีเมลฉบับนี้ถูกส่งอัตโนมัติจาก Imaging Compliance System (Staff Reminder)</small>
            </div>
          `,
        });

        await db.update(schedules)
          .set({ slaAlertSent: true })
          .where(inArray(schedules.id, group.scheduleIds));
        console.log(`[SLA Job] ✅ Staff Reminder sent to ${staff.email} for schedules: ${group.scheduleIds.join(', ')}`);
      }
    }

    // ==========================================
    // 2. SUPERVISOR SHIFT-END SUMMARY
    // ==========================================
    // Send only to supervisor (and escalation) when the shift is completely OVER
    const supervisorPending = await db.select().from(schedules).where(
      and(eq(schedules.status, 'Pending'), eq(schedules.supervisorAlertSent, false))
    );
    
    const supToAlert: typeof supervisorPending = [];
    for (const sched of supervisorPending) {
       const s = shiftsMap.get(sched.shift);
       if (!s) continue;
       
       const schedDate = new Date(`${sched.date}T00:00:00.000Z`);
       const endTime = schedDate.getTime() + ((s as any).end * 60 * 60 * 1000);
       
       if (now.getTime() >= endTime) {
          supToAlert.push(sched);
       }
    }

    if (supToAlert.length > 0 && supervisorEmail) {
      console.log(`[SLA Job] 📋 Shift-End Overdue tasks: ${supToAlert.length} found`);
      
      // Group by shift to send one summary per shift
      const shiftGroups: Record<string, typeof supervisorPending> = {};
      for (const s of supToAlert) {
        if (!shiftGroups[s.shift]) shiftGroups[s.shift] = [];
        shiftGroups[s.shift].push(s);
      }

      for (const [shiftName, scheds] of Object.entries(shiftGroups)) {
        const allStaffIds = [...new Set(scheds.map(s => s.staffId))];
        const allFormIds = [...new Set(scheds.map(s => s.formId).filter(Boolean) as string[])];
        const allStaff = allStaffIds.length > 0 ? await db.select().from(users).where(inArray(users.id, allStaffIds)) : [];
        const allFormsData = allFormIds.length > 0 ? await db.select().from(forms).where(inArray(forms.id, allFormIds)) : [];
        const staffMap = new Map(allStaff.map(s => [s.id, s]));
        const formMap = new Map(allFormsData.map(f => [f.id, f]));

        const shiftTh = shiftName === 'Morning' ? 'เช้า' : shiftName === 'Afternoon' ? 'บ่าย' : shiftName === 'NightBeforeMorning' ? 'ดึกก่อนเช้า' : 'ดึก';
        
        let reportHtml = '';
        for (const sched of scheds) {
          const staff = staffMap.get(sched.staffId);
          const form = sched.formId ? formMap.get(sched.formId) : null;
          const staffName = staff ? escapeHtml(staff.name) : 'Unknown Staff';
          const formTitle = form ? escapeHtml(form.title) : 'Unknown Form';
          reportHtml += `<li style="padding: 5px 0;"><strong>${staffName}</strong> - ลืมทำ: ${formTitle}</li>`;
        }

        const recipients = [supervisorEmail];
        if (escalationEmail) recipients.push(escalationEmail); // If they missed the entire shift, escalate it.
        const toList = recipients.join(',');

        await transporter.sendMail({
          from: `"Imaging Alert System" <${process.env.GMAIL_USER}>`,
          to: toList,
          subject: `🚨 สรุปงานคงค้าง: สิ้นสุดเวร${shiftTh}`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2 style="color: #d9534f;">🚨 รายงานสรุปงานคงค้าง (สิ้นสุดเวร)</h2>
              <p>เรียน หัวหน้างาน</p>
              <p>ระบบขอรายงานสรุปรายการตรวจเช็คของ <strong>เวร${shiftTh}</strong> ที่สิ้นสุดลงแล้ว แต่ยังมีพนักงานที่ <strong>ไม่ได้ดำเนินการ</strong> จนหมดเวลาเวร จำนวน ${scheds.length} รายการ ดังนี้:</p>
              <div style="background-color: #fcf8e3; padding: 15px; border-left: 4px solid #f0ad4e; margin: 15px 0;">
                <ul style="margin: 0; padding-left: 20px;">
                  ${reportHtml}
                </ul>
              </div>
              <p>โปรดพิจารณาติดตามหรือตรวจสอบเพิ่มเติม</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <small style="color: #999;">อีเมลฉบับนี้ถูกส่งอัตโนมัติจาก Imaging Compliance System (Shift-End Summary)</small>
            </div>
          `,
        });

        const schedIds = scheds.map(s => s.id);
        await db.update(schedules)
          .set({ supervisorAlertSent: true })
          .where(inArray(schedules.id, schedIds));
        console.log(`[SLA Job] ✅ Shift-End Summary sent to ${toList} for ${scheds.length} schedules.`);
      }
    }

  } catch (err: unknown) {
    console.error('[SLA Job] ❌ Error in background job:', err instanceof Error ? err.message : String(err));
  }
};

// Run the job every 1 minute
setInterval(runSLAJob, 1 * 60 * 1000);

// ============================================
// Weekly Backup Background Job
// ============================================
const runWeeklyBackupJob = async () => {
  try {
    const now = getBangkokNow();
    
    // Check if it's Sunday (0) and hour is 2 AM and minute is 0-5.
    if (now.getUTCDay() === 0 && now.getUTCHours() === 2 && now.getUTCMinutes() < 5) {
       const todayStr = getBangkokDateStr(now);
       
       const sysConfig = await db.select().from(config).limit(1);
       const settings = sysConfig[0]?.settings as Record<string, unknown> | undefined;
       if (!settings?.autoBackupEnabled) return;
       
       const lastBackupDate = settings?.lastAutoBackupDate as string | undefined;
       if (lastBackupDate === todayStr) return; // Already backed up today
       
       // Perform Backup
       const allSubmissions = await db.select().from(submissions);
       const allSchedules = await db.select().from(schedules);
       const allAlerts = await db.select().from(alerts);
       const allUsers = await db.select().from(users);
       const allForms = await db.select().from(forms);
       const allBundles = await db.select().from(bundles);
       const allConfig = await db.select().from(config);
       
       const backupData = {
         exportedAt: new Date().toISOString(),
         submissions: allSubmissions,
         schedules: allSchedules,
         alerts: allAlerts,
         users: allUsers,
         forms: allForms,
         bundles: allBundles,
         config: allConfig
       };

       const backupJson = JSON.stringify(backupData, null, 2);
       const supervisorEmail = (settings?.supervisorEmail as string | undefined) || process.env.SUPERVISOR_EMAIL;

       if (supervisorEmail) {
         const transporter = getTransporter();
         await transporter.sendMail({
           from: `"Imaging Backup System" <${process.env.GMAIL_USER}>`,
           to: supervisorEmail,
           subject: `📦 Weekly System Backup (${todayStr})`,
           html: `<p>Please find attached the weekly automated database backup for the Imaging Compliance System.</p>`,
           attachments: [
             {
               filename: `xray_backup_${todayStr}.json`,
               content: backupJson
             }
           ]
         });
         console.log(`[Backup Job] ✅ Weekly backup sent to ${supervisorEmail}`);
       }

       // Update lastAutoBackupDate
       await db.update(config).set({
         settings: { ...settings, lastAutoBackupDate: todayStr }
       });
    }
  } catch (err) {
    console.error('[Backup Job] ❌ Error:', err);
  }
};

setInterval(runWeeklyBackupJob, 5 * 60 * 1000);

// Endpoint to trigger SLA job immediately (called by frontend when settings are saved)
app.post('/api/trigger-sla', authenticateToken, requireAdmin, async (req, res) => {
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
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is required in production!');
      process.exit(1);
    }
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing, using fallback (dev only).');
  }

  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
} catch (e) {
  console.error('❌ CRITICAL ERROR during startup:', e);
  process.exit(1);
}
