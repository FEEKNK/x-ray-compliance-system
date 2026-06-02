import { db } from '../server/db';
import { users } from '../server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Hashing existing user PINs...');
  const allUsers = await db.select().from(users).where(isNull(users.pinHash));
  
  for (const user of allUsers) {
    const pinHash = await bcrypt.hash(user.employeeId, 10);
    await db.update(users).set({ pinHash }).where(eq(users.id, user.id));
    console.log(`Updated user ${user.employeeId}`);
  }
  console.log('Done!');
  process.exit(0);
}

main().catch(console.error);
