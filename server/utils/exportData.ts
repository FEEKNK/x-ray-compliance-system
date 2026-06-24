import { db } from '../db';
import { schedules, forms, users, config, submissions, alerts, bundles } from '../db/schema';

import { gte, lte, and } from 'drizzle-orm';

/**
 * Fetch all data from the database for export/backup purposes.
 * Used by both the export-data API and the weekly backup job.
 */
export async function getFullExportData(startDate?: string, endDate?: string) {
  let scheduleFilters;
  let submissionFilters;
  let alertFilters;

  if (startDate && endDate) {
    scheduleFilters = and(gte(schedules.date, startDate), lte(schedules.date, endDate));
    submissionFilters = and(gte(submissions.submittedAt, `${startDate}T00:00:00`), lte(submissions.submittedAt, `${endDate}T23:59:59`));
    alertFilters = and(gte(alerts.timestamp, `${startDate}T00:00:00`), lte(alerts.timestamp, `${endDate}T23:59:59`));
  } else if (startDate) {
    scheduleFilters = gte(schedules.date, startDate);
    submissionFilters = gte(submissions.submittedAt, `${startDate}T00:00:00`);
    alertFilters = gte(alerts.timestamp, `${startDate}T00:00:00`);
  } else if (endDate) {
    scheduleFilters = lte(schedules.date, endDate);
    submissionFilters = lte(submissions.submittedAt, `${endDate}T23:59:59`);
    alertFilters = lte(alerts.timestamp, `${endDate}T23:59:59`);
  }

  const [allSubmissions, allSchedules, allAlerts, allUsers, allForms, allBundles, allConfig] = await Promise.all([
    submissionFilters ? db.select().from(submissions).where(submissionFilters) : db.select().from(submissions),
    scheduleFilters ? db.select().from(schedules).where(scheduleFilters) : db.select().from(schedules),
    alertFilters ? db.select().from(alerts).where(alertFilters) : db.select().from(alerts),
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
