import express from 'express';
import { db } from '../db';
import { schedules, forms, users, config } from '../db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { logger } from '../logger';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getTransporter, escapeHtml, isValidEmail } from '../services/email';
import { getShiftThaiName } from '../utils/shiftHelpers';

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

const router = express.Router();

// Test SLA Alert Now — force-send alert for all pending schedules today
router.post('/test-sla-now', authenticateToken, requireAdmin, async (_req, res) => {
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
          eq(schedules.status, 'Pending'),
          isNotNull(schedules.formId)
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

    await Promise.all(Object.values(staffGroup).map(async (group) => {
      const staffRes = await db.select().from(users).where(eq(users.id, group.staffId)).limit(1);
      const staff = staffRes[0];
      if (!staff) return;

      const formTitles = await Promise.all(group.formIds.map(async fId => {
        const fRes = await db.select().from(forms).where(eq(forms.id, fId)).limit(1);
        return fRes[0]?.title || 'Unknown Form';
      }));

      const shiftTh = getShiftThaiName(group.shift);
      const toList = [staff.email, supervisorEmail].filter(Boolean).filter(isValidEmail).join(',');
      
      if (!toList) return;

      const listHtml = formTitles.length > 0
        ? formTitles.map(t => `<li style="padding:5px 0;">${escapeHtml(t)}</li>`).join('')
        : '<li style="padding:5px 0;">(ไม่มีแบบฟอร์มระบุ)</li>';

      const safeStaffName = escapeHtml(staff.name);
      logger.info(`[Test SLA] 👤 Staff: ${staff.name} | email in DB: "${staff.email}" | Supervisor: "${supervisorEmail}"`);
      logger.info(`[Test SLA] 📤 Final toList: "${toList}"`);

      try {
        await transporter.sendMail({
          from: `"Imaging Alert System (TEST)" <${process.env.GMAIL_USER || 'no-reply@hospital.com'}>`,
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
        logger.info(`[Test SLA] ✅ Sent to ${staff.name} — ${toList}`);
      } catch (e) {
        logger.error(`[Test SLA] ❌ Error sending to ${staff.name}:`, e);
      }
    }));

    res.json({ success: true, sent: results, total: results.length });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('[Test SLA] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Email endpoint
router.post('/test-email', authenticateToken, async (req, res) => {
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
    logger.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send Reminder Email endpoint
router.post('/send-reminder-email', authenticateToken, async (req, res) => {
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

    const shiftTh = getShiftThaiName(shift);
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
    logger.error('Error sending reminder email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
