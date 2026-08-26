'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { AUTH_HINT_COOKIE } from '@/lib/auth-shared';

/**
 * Reports one page view per navigation.
 *
 * Counting during render was the alternative and it does not work on this
 * site: pages are prerendered and served from the ISR cache, so the render
 * that would do the counting mostly never runs. A beacon counts the event
 * that actually happened — someone opened the page — and leaves the pages
 * static.
 *
 * `next/navigation`'s `usePathname` is used rather than the locale-aware one:
 * the server strips the locale prefix itself, and the raw path is also what
 * the beacon should report if a locale is ever added.
 */

/** Long enough that a prefetch, a bounce or a mis-tap does not count. */
const DELAY_MS = 400;

function isStaff(): boolean {
  if (typeof document === 'undefined') return false;
  // The readable hint cookie means a signed-in session, and every account on
  // this site is staff. Their own visits are not traffic, and on a quiet week
  // they would be most of it.
  return document.cookie.split('; ').some((c) => c.startsWith(`${AUTH_HINT_COOKIE}=`));
}

export function PageViewTracker() {
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (!pathname || isStaff()) return;

    const timer = setTimeout(() => {
      void fetch('/api/analytics/hit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // `keepalive` so a view still lands when the click that triggered it
        // is also the click that navigates away.
        keepalive: true,
        body: JSON.stringify({
          path: pathname,
          locale,
          referrer: document.referrer || null,
        }),
      }).catch(() => {
        /* analytics is never worth an error in a visitor's console */
      });
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [locale, pathname]);

  return null;
}
