export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeCookieName = 'NEXT_LOCALE';

/** Human labels used by the language switcher and hreflang tags. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};

/** BCP-47 tags emitted in `hreflang` / `og:locale`. */
export const localeHreflang: Record<Locale, string> = {
  en: 'en',
  ru: 'ru-RU',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Namespaces that client components actually read. Everything else — most
 * notably `legal`, which alone is ~85% of the RU catalogue — stays on the
 * server and never reaches the browser. Server components use
 * `getTranslations`, which reads the full catalogue from the request config,
 * so nothing is lost by narrowing this list.
 */
export const clientNamespaces = [
  'nav',
  'login',
  'footer',
  'cookieBanner',
  'contact',
  'contactModal',
  'chat',
  'common',
] as const;
