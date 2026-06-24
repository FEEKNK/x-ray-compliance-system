import { db } from '../server/db';
import { schedules } from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const todayStr = '2026-06-24';
  const todaySchedules = await db.select().from(schedules).where(eq(schedules.date, todayStr));
  
  console.log(`Schedules for ${todayStr}:`, todaySchedules.length);
  if (todaySchedules.length > 0) {
    console.log(todaySchedules);
  } else {
    console.log('No schedules found for today.');
  }
  process.exit(0);
}

main().catch(console.error);
