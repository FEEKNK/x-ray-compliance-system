interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailOptions) {
  if (process.env.ENABLE_EMAIL === 'false') {
    console.log(`[GAS Email] ⚠️ Email sending is temporarily disabled (ENABLE_EMAIL=false). Skipping email to ${Array.isArray(to) ? to.join(',') : to}`);
    return { status: 'disabled', message: 'Email sending is temporarily disabled' };
  }

  const gasUrl = process.env.GAS_EMAIL_URL;
  if (!gasUrl || gasUrl.includes('YOUR_SCRIPT_ID')) {
    throw new Error('GAS_EMAIL_URL is not configured properly in .env');
  }

  const toStr = Array.isArray(to) ? to.join(',') : to;
  const payload = JSON.stringify({ to: toStr, subject, html, attachments });

  try {
    // GAS web apps ตอบกลับด้วย 302 redirect
    // fetch มาตรฐานจะเปลี่ยน POST เป็น GET ตอน follow redirect ทำให้ข้อมูลหาย
    // วิธีแก้: ใช้ redirect:'manual' แล้วตาม redirect เองพร้อมส่ง POST ซ้ำ
    let response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      redirect: 'manual',
    });

    // ถ้าได้ redirect (302/307) ให้ POST ตามไปที่ URL ใหม่
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        response = await fetch(redirectUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          redirect: 'follow',
        });
      }
    }

    // อ่านผลลัพธ์ — GAS อาจตอบเป็น text หรือ JSON
    const text = await response.text();
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(text);
    } catch {
      // GAS อาจตอบ HTML แทน JSON ในบางกรณี — ถือว่าสำเร็จถ้า status OK
      if (response.ok) {
        return { status: 'success', raw: text };
      }
    }

    if (result.status === 'error') {
      throw new Error((result.message as string) || 'Unknown error from GAS');
    }

    return result;
  } catch (error) {
    console.error('[GAS Email] ❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Basic email format validation
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  // Simple regex for format: something@something.something
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}
