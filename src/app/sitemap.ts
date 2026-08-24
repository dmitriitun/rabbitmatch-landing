import type { MetadataRoute } from 'next';
import { locales, localeHreflang } from '@/i18n/config';
import { absoluteUrl, legalSlugs, routeOrder, routes } from '@/lib/site';

/**
 * Sitemap covering both locales.
 *
 * Every entry carries an `alternates.languages` map, which is the sitemap
 * equivalent of the `hreflang` tags in the page head — Google wants the
 * signal in at least one place, and the sitemap is the one it re-reads
 * without re-crawling the page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const languagesFor = (path: string) =>
    Object.fromEntries(locales.map((l) => [localeHreflang[l], absoluteUrl(l, path)]));

  for (const key of routeOrder) {
    const path = routes[key];
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: now,
        changeFrequency: key === 'home' ? 'weekly' : 'monthly',
        priority: key === 'home' ? 1 : 0.8,
        alternates: { languages: languagesFor(path) },
      });
    }
  }

  for (const slug of legalSlugs) {
    const path = `/legal/${slug}`;
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
        alternates: { languages: languagesFor(path) },
      });
    }
  }

  return entries;
}
