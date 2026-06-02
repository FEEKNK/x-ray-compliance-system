import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set');
console.log('SUPERVISOR_EMAIL:', process.env.SUPERVISOR_EMAIL);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

try {
  const info = await transporter.sendMail({
    from: `"X-Ray Test" <${process.env.GMAIL_USER}>`,
    to: process.env.SUPERVISOR_EMAIL,
    subject: '🔔 Test Email - X-Ray Compliance System',
    html: '<h1>ทดสอบส่งอีเมล</h1><p>ระบบส่งอีเมลทำงานได้ปกติครับ ✅</p>',
  });
  console.log('✅ Email sent! Message ID:', info.messageId);
} catch (err) {
  console.error('❌ Email failed:', err);
}
