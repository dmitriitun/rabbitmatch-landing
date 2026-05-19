import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, localeCookieName, locales, type Locale } from './config';

function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ordered = header
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';');
      const q = qPart && qPart.startsWith('q=') ? parseFloat(qPart.slice(2)) : 1;
      return { tag: tag.toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ordered) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  let locale: Locale;
  if (isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    locale = pickFromAcceptLanguage(headerStore.get('accept-language')) ?? defaultLocale;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return { locale, messages };
});

export { locales, defaultLocale };
