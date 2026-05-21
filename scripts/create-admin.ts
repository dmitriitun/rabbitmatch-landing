/**
 * Create or update an admin user.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password>
 *
 * Requires DATABASE_URL to be set (loaded from .env / .env.local automatically).
 * Idempotent: if the email already exists, the password and is_admin flag are updated.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from '../src/lib/db';

async function main(): Promise<void> {
  const [, , emailArg, passwordArg] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to .env.local and try again.');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Invalid email: ${emailArg}`);
    process.exit(1);
  }
  if (passwordArg.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(passwordArg, 12);

  await query(
    `
    INSERT INTO users (email, password_hash, role, is_admin, created_at, updated_at)
    VALUES ($1, $2, 'admin', TRUE, NOW(), NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role          = 'admin',
      is_admin      = TRUE,
      updated_at    = NOW()
    `,
    [email, hash],
  );

  console.log(`Admin user ready: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
