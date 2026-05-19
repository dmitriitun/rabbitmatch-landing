import 'server-only';
import { Pool, type PoolClient } from 'pg';

declare global {
  var __rmPgPool: Pool | undefined;
  var __rmMigrationsApplied: boolean | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const useSsl =
    process.env.PGSSL === '1' ||
    /sslmode=require/i.test(connectionString) ||
    process.env.NODE_ENV === 'production';

  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!global.__rmPgPool) {
    global.__rmPgPool = createPool();
  }
  return global.__rmPgPool;
}

export async function query<T = unknown>(
  text: string,
  params?: ReadonlyArray<unknown>,
): Promise<{ rows: T[]; rowCount: number | null }> {
  await ensureMigrated();
  const pool = getPool();
  const res = await pool.query(text, params as unknown[] | undefined);
  return { rows: res.rows as T[], rowCount: res.rowCount };
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureMigrated();
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

const MIGRATIONS: ReadonlyArray<{ id: string; sql: string }> = [
  {
    id: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS content_overrides (
        id BIGSERIAL PRIMARY KEY,
        locale TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (locale, key)
      );

      CREATE TABLE IF NOT EXISTS contact_requests (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        locale TEXT,
        source TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx
        ON contact_requests (created_at DESC);
    `,
  },
];

async function applyMigrations(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const migration of MIGRATIONS) {
    const existing = await pool.query<{ id: string }>(
      'SELECT id FROM schema_migrations WHERE id = $1',
      [migration.id],
    );
    if (existing.rowCount && existing.rowCount > 0) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrated(): Promise<void> {
  if (global.__rmMigrationsApplied) return;
  if (!migrationPromise) {
    migrationPromise = applyMigrations()
      .then(() => {
        global.__rmMigrationsApplied = true;
      })
      .catch((err) => {
        migrationPromise = null;
        throw err;
      });
  }
  await migrationPromise;
}
