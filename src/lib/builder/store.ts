import 'server-only';
import { query } from '@/lib/db';
import type { Locale } from '@/i18n/config';
import { normalizeDoc } from './normalize';
import { emptyDoc, type BuilderDoc } from './types';

/**
 * Storage for builder documents.
 *
 * Same shape as `lib/content.ts`: cache the *parsed* document per key, fall
 * back to an empty document when the database is unreachable so a build
 * without a live `DATABASE_URL` still succeeds, and expose an explicit
 * invalidation the save route calls.
 */

type CacheEntry = { at: number; doc: BuilderDoc };

const TTL_MS = Number(process.env.CONTENT_CACHE_TTL_MS ?? 60_000);

declare global {
  var __rmBuilderCache: Map<string, CacheEntry> | undefined;
}

function cache(): Map<string, CacheEntry> {
  if (!global.__rmBuilderCache) global.__rmBuilderCache = new Map();
  return global.__rmBuilderCache;
}

function cacheKey(page: string, locale: string): string {
  return `${locale}::${page}`;
}

export function invalidateBuilderCache(page?: string, locale?: string): void {
  const store = cache();
  if (page && locale) store.delete(cacheKey(page, locale));
  else store.clear();
}

export async function loadBuilderDoc(page: string, locale: Locale): Promise<BuilderDoc> {
  const store = cache();
  const key = cacheKey(page, locale);
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.doc;

  try {
    const { rows } = await query<{ doc: unknown }>(
      'SELECT doc FROM page_layouts WHERE page = $1 AND locale = $2',
      [page, locale],
    );
    // `jsonb` comes back already parsed by node-postgres.
    const doc = rows.length ? normalizeDoc(rows[0].doc) : emptyDoc();
    store.set(key, { at: now, doc });
    return doc;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[builder] failed to load layout, rendering nothing', err);
    }
    return emptyDoc();
  }
}

export async function saveBuilderDoc(
  page: string,
  locale: Locale,
  doc: BuilderDoc,
  updatedBy: number,
): Promise<void> {
  await query(
    `
    INSERT INTO page_layouts (page, locale, doc, updated_by, updated_at)
    VALUES ($1, $2, $3::jsonb, $4, NOW())
    ON CONFLICT (page, locale)
    DO UPDATE SET doc = EXCLUDED.doc, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    `,
    [page, locale, JSON.stringify(doc), updatedBy],
  );
  invalidateBuilderCache(page, locale);
}
