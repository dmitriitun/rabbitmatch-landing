import 'server-only';
import { getTranslations } from 'next-intl/server';

/**
 * Read a value out of the message catalogue by its full dotted key.
 *
 * The block components are driven by content, not by props: a page says
 * "render `players.features`" and the array of `{ icon, title, text }` objects
 * lives in `messages/*.json`, where it is translatable and editable through
 * the admin CMS. `getTranslations` is namespace-scoped, so these helpers split
 * the full key and hand back the leaf.
 */

function split(fullKey: string): { namespace?: string; leaf: string } {
  const at = fullKey.lastIndexOf('.');
  if (at === -1) return { leaf: fullKey };
  return { namespace: fullKey.slice(0, at), leaf: fullKey.slice(at + 1) };
}

/** Resolve a string key. Returns `''` when the key is absent. */
export async function text(fullKey: string): Promise<string> {
  const { namespace, leaf } = split(fullKey);
  const t = await getTranslations(namespace);
  try {
    return t(leaf);
  } catch {
    return '';
  }
}

/** Resolve a structured key (array or object). Returns `[]` when absent. */
export async function list<T>(fullKey: string): Promise<T[]> {
  const { namespace, leaf } = split(fullKey);
  const t = await getTranslations(namespace);
  try {
    const value = t.raw(leaf);
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

export type FeatureItem = { icon?: string; title: string; text: string };
export type StepItem = { title: string; text: string };
export type StatItem = { value: string; label: string };
export type FaqItem = { question: string; answer: string };
