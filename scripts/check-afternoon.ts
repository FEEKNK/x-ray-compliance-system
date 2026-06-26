import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const yesterday = '2026-06-25';
  
  const schedules = await db.select().from(schema.schedules)
    .where(and(
      eq(schema.schedules.date, yesterday),
      eq(schema.schedules.shift, 'Afternoon')
    ));

  console.log(`Found ${schedules.length} schedules for Afternoon shift on ${yesterday}.`);
  
  let pendingCount = 0;
  let completedCount = 0;
  
  schedules.forEach(s => {
    if (s.status === 'Pending') pendingCount++;
    if (s.status === 'Completed') completedCount++;
  });

  console.log(`- Pending: ${pendingCount}`);
  console.log(`- Completed: ${completedCount}`);
}

main().catch(console.error);
