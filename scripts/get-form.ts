import { db } from '../server/db/index';
import * as schema from '../server/db/schema';

async function main() {
  const forms = await db.select().from(schema.forms).limit(1);
  console.log(JSON.stringify(forms, null, 2));
}

main().catch(console.error);
