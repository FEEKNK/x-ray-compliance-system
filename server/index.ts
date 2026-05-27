import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load the environment variables from the root directory
dotenv.config({ path: '../.env' });

import { db } from './db';
import { schedules, forms, users, config } from './db/schema';
import { eq, and } from 'drizzle-orm';

// Import route handlers
import usersRouter from './routes/users';
import formsRouter from './routes/forms';
import schedulesRouter from './routes/schedules';
import submissionsRouter from './routes/submissions';
import bundlesRouter from './routes/bundles';
import alertsRouter from './routes/alerts';
import configRouter from './routes/config';
import seedRouter from './routes/seed';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// Register API Routes
// ============================================
app.use('/api/users', usersRouter);
app.use('/api/forms', formsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/bundles', bundlesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/config', configRouter);
app.use('/api/seed', seedRouter);

// ============================================
// Existing Endpoints
// ============================================

// Basic test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
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
          <p>ระบบตรวจพบว่าคุณยังมีรายการตรวจเช็คที่ยังไม่ได้ดำเนินการผ่านไปแล้ว 1 ชั่วโมงของเวร${shiftTh} ดังนี้:</p>
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
// SLA Alert Background Job
// ============================================
setInterval(async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];
    
    // Determine which shift needs alerting based on current time
    // Morning (08:00-16:00, 3 hrs max -> Alert at >= 10:00)
    // Afternoon (16:00-00:00, 2 hrs max -> Alert at >= 18:00)
    // Night (00:00-08:00, 2 hrs max -> Alert at >= 02:00)
    let targetShift = '';
    if (currentHour >= 10 && currentHour < 16) targetShift = 'Morning';
    else if (currentHour >= 18 && currentHour < 24) targetShift = 'Afternoon';
    else if (currentHour >= 2 && currentHour < 8) targetShift = 'Night';

    if (!targetShift) return; // Not time to alert yet

    // Get all pending schedules for today and the target shift
    const pendingSchedules = await db.select()
      .from(schedules)
      .where(
        and(
          eq(schedules.date, todayStr),
          eq(schedules.shift, targetShift),
          eq(schedules.status, 'Pending')
        )
      );

    if (pendingSchedules.length === 0) return;

    // Fetch config for supervisor email
    const sysConfig = await db.select().from(config).limit(1);
    const supervisorEmail = sysConfig[0]?.supervisorEmail || process.env.SUPERVISOR_EMAIL;

    // Group by staffId
    const staffGroup: Record<string, { staffId: string, formIds: string[] }> = {};
    for (const s of pendingSchedules) {
      if (!staffGroup[s.staffId]) staffGroup[s.staffId] = { staffId: s.staffId, formIds: [] };
      staffGroup[s.staffId].formIds.push(s.formId);
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
      const subject = `⚠️ แจ้งเตือน: คิวงานคงค้าง (เวร${shiftTh})`;
      const toList = [staff.email, supervisorEmail].filter(Boolean).join(',');

      const listHtml = formTitles.map(t => `<li style="padding: 5px 0;">${t}</li>`).join('');

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
    }

  } catch (err: any) {
    if (err?.cause?.message?.includes('fetch failed') || err?.message?.includes('fetch failed')) {
      console.warn('[SLA Background Job] Network fetch failed (likely transient). Will retry next cycle.');
    } else {
      console.error('[SLA Background Job] Error:', err?.message || err);
    }
  }
}, 30 * 60 * 1000); // Check every 30 minutes

// ============================================
// Global Error Handler
// ============================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
