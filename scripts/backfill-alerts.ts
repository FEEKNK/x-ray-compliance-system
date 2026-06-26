import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const allSubmissions = await db.select().from(schema.submissions);
  const allForms = await db.select().from(schema.forms);
  const allStaff = await db.select().from(schema.users);
  
  let newAlerts = 0;

  for (const sub of allSubmissions) {
    const form = allForms.find(f => f.id === sub.formId);
    const staff = allStaff.find(s => s.id === sub.staffId);
    if (!form || !staff) continue;

    let hasFailures = false;
    const safeData = typeof sub.data === 'object' && sub.data !== null ? sub.data : {};
    const safeQuestions = Array.isArray(form.questions) ? form.questions : [];

    Object.entries(safeData).forEach(([key, value]) => {
      const question = safeQuestions.find((q: any) => q.id === key);
      
      if (value === 'Fail' || value === 'Alert') {
        hasFailures = true;
      } else if (question?.alertOnFail) {
        if (typeof value === 'string' && question.failOptions?.includes(value)) {
          hasFailures = true;
        } else if (Array.isArray(value)) {
          const failedVals = value.filter(v => typeof v === 'string' && question.failOptions?.includes(v));
          if (failedVals.length > 0) hasFailures = true;
        }
      }
      
      if (question?.alertOnCustomInput && question.allowCustomInput) {
        const options = question.options || [];
        if (typeof value === 'string' && !options.includes(value) && value.trim() !== '') {
          hasFailures = true;
        } else if (Array.isArray(value)) {
          const customVals = value.filter(v => typeof v === 'string' && !options.includes(v) && v.trim() !== '');
          if (customVals.length > 0) hasFailures = true;
        }
      }
    });

    if (hasFailures) {
      // Check if alert already exists for this submission to avoid duplicates
      // We don't have submissionId in alerts, but we can check formId and staffId and time within a minute
      const existingAlert = await db.select().from(schema.alerts)
        .where(eq(schema.alerts.formId, form.id))
        .limit(10);
      
      const isDuplicate = existingAlert.some(a => 
        a.staffId === staff.id && 
        new Date(a.timestamp).getTime() - new Date(sub.submittedAt).getTime() < 60000 &&
        new Date(a.timestamp).getTime() - new Date(sub.submittedAt).getTime() > -60000
      );

      if (!isDuplicate) {
        await db.insert(schema.alerts).values({
          type: 'Critical Failure',
          message: `พบปัญหาจากการตรวจสอบ: ${form.title} โดย ${staff.name}`,
          staffId: staff.id,
          formId: form.id,
          timestamp: sub.submittedAt, // match submission time
        });
        newAlerts++;
        console.log(`Created alert for ${form.title} by ${staff.name}`);
      }
    }
  }

  console.log(`Backfilled ${newAlerts} alerts.`);
}

main().catch(console.error);
