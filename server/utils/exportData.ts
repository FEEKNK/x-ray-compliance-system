import { db } from '../db';
import { schedules, forms, users, config, submissions, alerts, bundles } from '../db/schema';

/**
 * Fetch all data from the database for export/backup purposes.
 * Used by both the export-data API and the weekly backup job.
 */
export async function getFullExportData() {
  const [allSubmissions, allSchedules, allAlerts, allUsers, allForms, allBundles, allConfig] = await Promise.all([
    db.select().from(submissions),
    db.select().from(schedules),
    db.select().from(alerts),
    db.select().from(users),
    db.select().from(forms),
    db.select().from(bundles),
    db.select().from(config),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    submissions: allSubmissions,
    schedules: allSchedules,
    alerts: allAlerts,
    users: allUsers,
    forms: allForms,
    bundles: allBundles,
    config: allConfig,
  };
}
