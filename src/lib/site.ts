import { locales, localeHreflang, type Locale } from '@/i18n/config';

/**
 * Treat a blank env var as absent.
 *
 * `.env.local` ships with the optional keys present but empty, and `??` only
 * falls back on `null`/`undefined` — so without this an empty
 * `NEXT_PUBLIC_APP_URL` becomes `new URL('')` and fails the build, and empty
 * store links render as enabled anchors pointing at the current page.
 *
 * Note the literal `process.env.NEXT_PUBLIC_*` reads below: the bundler only
 * inlines public env vars for client code when the property is written out
 * statically, so a `process.env[name]` lookup would silently be `undefined` in
 * the browser.
 */
function blank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Canonical origin. Everything SEO-related derives from this one value. */
export const siteUrl = (
  blank(process.env.NEXT_PUBLIC_APP_URL) ?? 'https://rabbitmatch.pro'
).replace(/\/$/, '');

export const siteName = 'RabbitMatch';

/**
 * Every indexable route, without the locale prefix. Adding a page here wires
 * it into the sitemap and the hreflang cluster at the same time — there is no
 * second list to keep in sync.
 */
export const routes = {
  home: '/',
  players: '/players',
  organizers: '/organizers',
  coaches: '/coaches',
  venues: '/venues',
  padel: '/padel',
  pricing: '/pricing',
  faq: '/faq',
} as const;

export type RouteKey = keyof typeof routes;

/** Ordered for the sitemap and for the footer's site-map column. */
export const routeOrder: RouteKey[] = [
  'home',
  'players',
  'organizers',
  'coaches',
  'venues',
  'padel',
  'pricing',
  'faq',
];

export const legalSlugs = [
  'terms',
  'privacy',
  'cookies',
  'eula',
  'subscription',
  'refund',
  'booking',
] as const;

export type LegalSlug = (typeof legalSlugs)[number];

/** Absolute URL for a locale + path, e.g. `https://rabbitmatch.pro/ru/players`. */
export function absoluteUrl(locale: Locale, path = '/'): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}/${locale}${clean}`;
}

/**
 * `alternates` block for `generateMetadata`: a self-referencing canonical plus
 * one `hreflang` per locale and an `x-default`. Without this the RU and EN
 * versions of a page compete with each other in the index.
 */
export function alternatesFor(locale: Locale, path = '/') {
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[localeHreflang[l]] = absoluteUrl(l, path);
  }
  languages['x-default'] = absoluteUrl('en', path);

  return {
    canonical: absoluteUrl(locale, path),
    languages,
  };
}

/** Store and channel links, read once so components don't repeat the lookups. */
export const links = {
  ios: blank(process.env.NEXT_PUBLIC_IOS_URL),
  android: blank(process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL),
  web: blank(process.env.NEXT_PUBLIC_APP_URL),
  telegramApp: blank(process.env.NEXT_PUBLIC_TELEGRAM_APP_URL),
  telegramChannel: blank(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL),
  telegramSupport: blank(process.env.NEXT_PUBLIC_SUPPORT_BOT_URL),
  contactTelegram: blank(process.env.NEXT_PUBLIC_CONTACT_TELEGRAM),
  contactEmail: blank(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  instagram: blank(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
  tiktok: blank(process.env.NEXT_PUBLIC_TIKTOK_URL),
  facebook: blank(process.env.NEXT_PUBLIC_FACEBOOK_URL),
} as const;
