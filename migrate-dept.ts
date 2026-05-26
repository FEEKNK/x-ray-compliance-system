import { db } from './server/db/index.js';
import { users, bundles, forms } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

async function run() {
  console.log('Migrating X-RAY to IMAGING...');
  const res1 = await db.update(users).set({ department: 'IMAGING' }).where(eq(users.department, 'X-RAY'));
  console.log('Users updated', res1);
  const res2 = await db.update(bundles).set({ department: 'IMAGING' }).where(eq(bundles.department, 'X-RAY'));
  console.log('Bundles updated', res2);
  const res3 = await db.update(forms).set({ department: 'IMAGING' }).where(eq(forms.department, 'X-RAY'));
  console.log('Forms updated', res3);
  console.log('Migration complete');
  process.exit(0);
}
run();
