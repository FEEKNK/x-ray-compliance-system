import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const allAlerts = await db.select().from(schema.alerts).orderBy(desc(schema.alerts.timestamp)).limit(5);
  console.log("Latest alerts:", allAlerts);
}

main().catch(console.error);
