import { db } from '../server/db/index';
import { alerts } from '../server/db/schema';
import { lt } from 'drizzle-orm';

async function main() {
  console.log('Starting alert purge...');
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDateStr = threeDaysAgo.toISOString();

    console.log(`Deleting alerts older than: ${cutoffDateStr}`);

    // Assuming timestamp is stored as string in ISO format
    const deleted = await db.delete(alerts)
      .where(lt(alerts.timestamp, cutoffDateStr))
      .returning();

    console.log(`Successfully deleted ${deleted.length} old alerts.`);
  } catch (error) {
    console.error('Error deleting alerts:', error);
  }
}

main().catch(console.error);
