import { db } from './server/db';
import { config } from './server/db/schema';

async function main() {
  const result = await db.select().from(config);
  console.log("Config in DB:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
