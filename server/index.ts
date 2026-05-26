import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load the environment variables from the root directory
dotenv.config({ path: '../.env' });

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
      from: `"X-Ray Test" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: '🔔 Test Email - X-Ray Compliance System (From UI)',
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
      from: `"X-Ray Alert System" <${process.env.GMAIL_USER}>`,
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
          <small style="color: #999;">อีเมลฉบับนี้ถูกส่งอัตโนมัติจาก X-Ray Compliance System</small>
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
