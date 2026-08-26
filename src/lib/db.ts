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
    // A landing page needs very few concurrent DB connections, especially with
    // the content-overrides cache. Keep the pool small to reduce idle memory
    // and load on the Postgres service.
    max: Number(process.env.PGPOOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
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
  {
    id: '0002_is_admin',
    sql: `
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

      UPDATE users SET is_admin = TRUE WHERE role = 'admin' AND is_admin = FALSE;
    `,
  },
  {
    id: '0003_cookie_consents',
    sql: `
      CREATE TABLE IF NOT EXISTS cookie_consents (
        id BIGSERIAL PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        choice TEXT NOT NULL,
        locale TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS cookie_consents_visitor_id_idx
        ON cookie_consents (visitor_id);
      CREATE INDEX IF NOT EXISTS cookie_consents_created_at_idx
        ON cookie_consents (created_at DESC);
    `,
  },
  {
    // Site chat bridged to Telegram. One thread per visitor; each thread maps
    // to a forum topic in the support supergroup so several moderators can
    // work in parallel without the conversations interleaving.
    id: '0004_chat',
    sql: `
      CREATE TABLE IF NOT EXISTS chat_threads (
        id BIGSERIAL PRIMARY KEY,
        -- Server-issued opaque token. The browser presents it to read and
        -- append to its own thread, so it must never be guessable.
        token TEXT UNIQUE NOT NULL,
        name TEXT,
        contact TEXT,
        locale TEXT,
        page TEXT,
        ip TEXT,
        user_agent TEXT,
        telegram_chat_id TEXT,
        telegram_topic_id BIGINT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS chat_threads_topic_idx
        ON chat_threads (telegram_chat_id, telegram_topic_id);
      CREATE INDEX IF NOT EXISTS chat_threads_last_message_idx
        ON chat_threads (last_message_at DESC);

      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        thread_id BIGINT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
        -- 'in'  = written by the site visitor
        -- 'out' = written by a moderator in Telegram
        direction TEXT NOT NULL,
        body TEXT NOT NULL,
        author_name TEXT,
        telegram_message_id BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS chat_messages_thread_idx
        ON chat_messages (thread_id, id);
      CREATE INDEX IF NOT EXISTS chat_messages_tg_msg_idx
        ON chat_messages (telegram_message_id);
    `,
  },
  {
    // Page builder. One document per (page, locale) holding the sections an
    // admin composed on top of the hand-written page, plus the media those
    // sections point at.
    id: '0005_page_builder',
    sql: `
      CREATE TABLE IF NOT EXISTS page_layouts (
        id BIGSERIAL PRIMARY KEY,
        -- Route path without the locale prefix: '/', '/players', ...
        page TEXT NOT NULL,
        locale TEXT NOT NULL,
        doc JSONB NOT NULL DEFAULT '{"version":1,"sections":[]}'::jsonb,
        updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (page, locale)
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        -- SHA-256 of the bytes. Content-addressed, so re-uploading the same
        -- file is idempotent and the URL can be cached forever.
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        bytes BYTEA NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        filename TEXT,
        alt TEXT,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS media_assets_created_at_idx
        ON media_assets (created_at DESC);
    `,
  },
  {
    /*
      Site tree: admin-created menu items, their sub-pages and the folders in
      between.

      One row per page, `parent_id` giving the hierarchy and no depth limit —
      a section holds groups, a group holds groups, and so on, exactly like a
      forum. `path` is the materialised full path ('/learn/rules/scoring') so
      that resolving a URL is one indexed lookup instead of a walk up the
      tree; it is rewritten for the whole subtree whenever a slug moves.

      Titles live in a JSONB map keyed by locale rather than in a row per
      language, because the *structure* is shared between languages and only
      the label differs. A missing translation falls back to the other locale
      instead of hiding the page from half the site.

      The page body itself is not here: every node is edited with the page
      builder, so its content is a normal `page_layouts` row keyed by the same
      path.
    */
    id: '0006_site_tree',
    sql: `
      CREATE TABLE IF NOT EXISTS site_nodes (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES site_nodes(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        -- 'category' lists what is inside it; 'article' is a leaf with a body.
        kind TEXT NOT NULL DEFAULT 'category',
        titles JSONB NOT NULL DEFAULT '{}'::jsonb,
        summaries JSONB NOT NULL DEFAULT '{}'::jsonb,
        position INTEGER NOT NULL DEFAULT 0,
        -- Top-level nodes only: show this item in the header menu.
        in_nav BOOLEAN NOT NULL DEFAULT FALSE,
        hidden BOOLEAN NOT NULL DEFAULT FALSE,
        -- Whether the group starts expanded in the section tree.
        open_by_default BOOLEAN NOT NULL DEFAULT TRUE,
        views BIGINT NOT NULL DEFAULT 0,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS site_nodes_parent_idx
        ON site_nodes (parent_id, position, id);
      CREATE UNIQUE INDEX IF NOT EXISTS site_nodes_sibling_slug_idx
        ON site_nodes (COALESCE(parent_id, 0), slug);

      -- The learning section exists from the first boot, so the header has
      -- something to point at and the admin starts by filling it rather than
      -- by inventing it. Everything about it is editable, including the slug.
      INSERT INTO site_nodes (parent_id, slug, path, kind, titles, summaries, position, in_nav)
      SELECT NULL, 'learn', '/learn', 'category',
             '{"en":"Academy","ru":"Академия"}'::jsonb,
             '{"en":"Guides, rules and answers for players, coaches and clubs.","ru":"Гайды, правила и разборы для игроков, тренеров и клубов."}'::jsonb,
             10, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM site_nodes WHERE path = '/learn');
    `,
  },
  {
    /*
      Cookieless traffic log.

      `visitor` is a hash of IP + user agent + the day + the app secret. It
      identifies a browser for the length of one day and cannot be reversed
      into an address, so there is no identifier stored on the visitor's
      device and nothing here needs a consent banner to be lawful. The cost is
      that "unique visitors" resets at midnight UTC, which is the trade every
      cookieless analytics tool makes.

      Rows are raw hits rather than pre-aggregated counters: the admin panel
      wants "top pages last 30 days" and "referrers", neither of which can be
      recovered from a counter. Retention is bounded by a prune (see
      `lib/analytics.ts`) so the table cannot grow without limit.
    */
    id: '0007_page_views',
    sql: `
      CREATE TABLE IF NOT EXISTS page_views (
        id BIGSERIAL PRIMARY KEY,
        -- Route without the locale prefix, so both languages aggregate together.
        path TEXT NOT NULL,
        locale TEXT,
        visitor TEXT NOT NULL,
        referrer_host TEXT,
        node_id BIGINT REFERENCES site_nodes(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS page_views_created_idx
        ON page_views (created_at DESC);
      CREATE INDEX IF NOT EXISTS page_views_path_idx
        ON page_views (path, created_at DESC);
      CREATE INDEX IF NOT EXISTS page_views_visitor_idx
        ON page_views (visitor, created_at DESC);
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
