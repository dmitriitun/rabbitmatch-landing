import 'server-only';
import { query } from './db';
import type { Locale } from '@/i18n/config';

type OverrideRow = { key: string; value: string };

type MessagesNode = Record<string, unknown>;

type CacheEntry = { at: number; merged: MessagesNode };

/**
 * Cache the *merged* catalogue per locale, not the raw override rows.
 *
 * The previous version cached rows and then ran
 * `JSON.parse(JSON.stringify(base))` on the full ~115 KB catalogue for every
 * render — the single largest source of short-lived garbage in the process,
 * and the main reason resident memory sat around 370 MB. Now the clone happens
 * at most once per TTL per locale.
 */
const OVERRIDES_TTL_MS = Number(process.env.CONTENT_CACHE_TTL_MS ?? 60_000);

declare global {
  var __rmContentCache: Map<string, CacheEntry> | undefined;
}

function contentCache(): Map<string, CacheEntry> {
  if (!global.__rmContentCache) {
    global.__rmContentCache = new Map();
  }
  return global.__rmContentCache;
}

/** Drop cached content so the next render re-reads from the DB. */
export function invalidateContentCache(locale?: Locale): void {
  const cache = contentCache();
  if (locale) {
    cache.delete(locale);
  } else {
    cache.clear();
  }
}

/**
 * Apply a single override of the form { 'a.b.c': 'value' } onto a deep object.
 * Creates intermediate objects as needed. Skips application if a non-leaf
 * path collides with an existing leaf (the override is malformed).
 */
function applyOverride(target: MessagesNode, path: string, value: string): void {
  const parts = path.split('.');
  if (parts.length === 0 || parts.some((p) => !p)) return;
  let current: MessagesNode = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = current[key];
    if (next === undefined || next === null) {
      const created: MessagesNode = {};
      current[key] = created;
      current = created;
    } else if (typeof next === 'object' && !Array.isArray(next)) {
      current = next as MessagesNode;
    } else {
      return;
    }
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Load all content overrides for a locale and merge them into the base
 * messages object. Falls back to the base messages if the DB is unreachable.
 */
export async function loadOverridesAndMerge(
  locale: Locale,
  base: MessagesNode,
): Promise<MessagesNode> {
  const cache = contentCache();
  const now = Date.now();
  const hit = cache.get(locale);
  if (hit && now - hit.at < OVERRIDES_TTL_MS) {
    return hit.merged;
  }

  try {
    const { rows } = await query<OverrideRow>(
      'SELECT key, value FROM content_overrides WHERE locale = $1',
      [locale],
    );

    // No overrides is the common case — hand back the base object untouched
    // so there is nothing to clone and nothing extra to retain.
    const merged = rows.length === 0 ? base : (JSON.parse(JSON.stringify(base)) as MessagesNode);
    for (const row of rows) {
      applyOverride(merged, row.key, row.value);
    }

    cache.set(locale, { at: now, merged });
    return merged;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[content] failed to load overrides, falling back to JSON', err);
    }
    return base;
  }
}
