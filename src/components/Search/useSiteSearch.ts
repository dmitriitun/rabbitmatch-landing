'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import type { SearchResponse } from '@/lib/search/types';

/**
 * A debounced site search bound to one text field.
 *
 * The current path travels with the query, because ranking a reader's own page
 * first is a server-side decision — the server is the only side that knows what
 * else matched and by how much, so "first" has to be computed where the scores
 * are.
 *
 * State is a single answer tagged with the query that produced it, and what the
 * caller sees is derived from comparing that tag to the current query. That is
 * what makes a stale reply harmless without a cancellation dance: an answer to
 * a query nobody is asking any more simply does not match the tag, so it is
 * never rendered — and there is no effect resetting state on every keystroke.
 */

const DEBOUNCE_MS = 180;
const MIN_LENGTH = 2;

type Answer = { key: string; data: SearchResponse | null };

export function useSiteSearch(query: string): { data: SearchResponse | null; loading: boolean } {
  const locale = useLocale();
  const pathname = usePathname();
  const [answer, setAnswer] = useState<Answer | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_LENGTH;
  // Empty while the field is too short to search, which is also the key no
  // answer can ever carry.
  const key = active ? `${locale}|${pathname}|${trimmed}` : '';

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, locale, path: pathname || '/' });
        const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setAnswer({ key, data: (await res.json()) as SearchResponse });
      } catch {
        // An aborted request is the normal case here — the reader kept typing.
        if (!controller.signal.aborted) setAnswer({ key, data: null });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, locale, pathname, trimmed]);

  const current = answer && answer.key === key ? answer : null;
  return { data: active ? current?.data ?? null : null, loading: active && !current };
}
