import 'server-only';
import { query } from './db';
import type { Locale } from '@/i18n/config';

type OverrideRow = { key: string; value: string };

type MessagesNode = Record<string, unknown>;

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
  try {
    const { rows } = await query<OverrideRow>(
      'SELECT key, value FROM content_overrides WHERE locale = $1',
      [locale],
    );
    if (rows.length === 0) return base;

    const merged: MessagesNode = JSON.parse(JSON.stringify(base));
    for (const row of rows) {
      applyOverride(merged, row.key, row.value);
    }
    return merged;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[content] failed to load overrides, falling back to JSON', err);
    }
    return base;
  }
}
