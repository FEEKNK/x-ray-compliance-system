import { db } from '../db';
import { config } from '../db/schema';
import { logger } from '../logger';
import { sendEmail } from '../services/email';
import { getFullExportData } from '../utils/exportData';
import { getBangkokNow, getBangkokDateStr } from '../utils/shiftHelpers';

export const runWeeklyBackupJob = async () => {
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
       
       // Perform Backup using shared utility
       const backupData = await getFullExportData();
       const backupJson = JSON.stringify(backupData, null, 2);
       const supervisorEmail = (settings?.supervisorEmail as string | undefined) || process.env.SUPERVISOR_EMAIL;

       if (supervisorEmail) {
         await sendEmail({
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
         logger.info(`[Backup Job] ✅ Weekly backup sent to ${supervisorEmail}`);
       }

       // Update lastAutoBackupDate
       await db.update(config).set({
         settings: { ...settings, lastAutoBackupDate: todayStr }
       });
    }
  } catch (err) {
    logger.error('[Backup Job] ❌ Error:', err);
  }
};
