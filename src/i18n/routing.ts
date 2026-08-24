import { defineRouting } from 'next-intl/routing';
import { defaultLocale, localeCookieName, locales } from './config';

/**
 * Locale lives in the URL (`/en/...`, `/ru/...`) rather than in a cookie.
 *
 * Why: with a cookie-only locale both languages share one URL, so search
 * engines can only ever index a single version of every page and `hreflang`
 * has nothing to point at. Prefixed paths also make every page statically
 * renderable — locale comes from `params`, not from `cookies()` — which is
 * what lets the whole site be served from the ISR cache instead of being
 * re-rendered on each hit.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeCookie: {
    name: localeCookieName,
    sameSite: 'lax',
  },
  // We emit `<link rel="alternate" hreflang>` from `generateMetadata`, which
  // is the variant Google documents for HTML pages. The header would be
  // redundant.
  alternateLinks: false,
});
