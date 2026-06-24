import { db } from '../server/db';
import { schedules } from '../server/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  const staffPending = await db.select().from(schedules).where(
    and(
      eq(schedules.status, 'Pending'),
      eq(schedules.slaAlertSent, false),
      isNotNull(schedules.formId)
    )
  );
  
  console.log('Pending schedules:', staffPending.length);
  if (staffPending.length > 0) {
    console.log(staffPending);
  }
  process.exit(0);
}

main().catch(console.error);
