import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localeHreflang, type Locale } from '@/i18n/config';
import { absoluteUrl, alternatesFor, siteName } from './site';

/**
 * Metadata for a content page.
 *
 * Title and description come from `<namespace>.meta` in the message
 * catalogue, so they are translated and editable alongside the page copy
 * rather than hard-coded per route. The `alternates` block is what keeps the
 * EN and RU versions of the same page from competing in the index.
 */
export async function pageMetadata({
  locale,
  path,
  ns,
}: {
  locale: Locale;
  path: string;
  ns: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `${ns}.meta` });
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      title: `${title} — ${siteName}`,
      description,
      url: absoluteUrl(locale, path),
      siteName,
      locale: localeHreflang[locale].replace('-', '_'),
      type: 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — ${siteName}`,
      description,
    },
  };
}
