// Creates (or resets the password of) the SUPERADMIN account — the only way
// to create the very first account, since there's no public sign-up page.
// Always sets role: SUPERADMIN (the only code path that ever creates one —
// SUPERADMIN accounts are never created via the API). Once you have one
// account, you can log in and create ADMIN/CUSTOMER accounts from Settings > Accounts.
//
// Usage: node scripts/create-superadmin.mjs <email> <password> ["Full Name"]
// Requires a fresh `npm run build` if the Prisma schema changed since the last build.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../dist/src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const [, , email, password, name] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-superadmin.mjs <email> <password> ["Full Name"]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const passwordHash = await bcrypt.hash(password, 12);
const normalizedEmail = email.trim().toLowerCase();

const user = await db.user.upsert({
  where: { email: normalizedEmail },
  update: { passwordHash, name: name?.trim() || undefined, role: 'SUPERADMIN' },
  create: { email: normalizedEmail, passwordHash, name: name?.trim() || null, role: 'SUPERADMIN' },
});

console.log(`Account ready: ${user.email} (id: ${user.id}, role: ${user.role})`);
await db.$disconnect();
