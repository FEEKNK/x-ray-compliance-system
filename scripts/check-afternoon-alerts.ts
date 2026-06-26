import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const yesterday = '2026-06-25';
  
  const schedules = await db.select().from(schema.schedules)
    .where(and(
      eq(schema.schedules.date, yesterday),
      eq(schema.schedules.shift, 'Afternoon'),
      eq(schema.schedules.status, 'Pending')
    ));

  console.log(`Found ${schedules.length} PENDING schedules for Afternoon shift on ${yesterday}.`);
  
  schedules.forEach(s => {
    console.log(`- Schedule ID: ${s.id}, Form ID: ${s.formId}, supervisorAlertSent: ${s.supervisorAlertSent}`);
  });
}

main().catch(console.error);
