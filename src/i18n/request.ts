import { getRequestConfig } from 'next-intl/server';
import { loadMessages } from '@/lib/messages';
import { routing } from './routing';
import { defaultLocale, isLocale, type Locale } from './config';

/**
 * Locale is resolved from the URL segment only. Nothing here touches
 * `cookies()` or `headers()` — that is deliberate: a single dynamic Request
 * API call in the render path opts every page out of static/ISR rendering and
 * forces a full React render on every hit, bots included.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    // Timezone is fixed so server and client formatting agree without the
    // client having to report one.
    timeZone: 'Europe/Moscow',
    now: undefined,
  };
});

export { routing };
