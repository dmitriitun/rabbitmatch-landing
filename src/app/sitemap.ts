import type { MetadataRoute } from 'next';
import { locales, localeHreflang } from '@/i18n/config';
import { absoluteUrl, legalSlugs, routeOrder, routes } from '@/lib/site';
import { loadTree } from '@/lib/tree/store';
import { flatten } from '@/lib/tree/types';

/**
 * Sitemap covering both locales.
 *
 * Every entry carries an `alternates.languages` map, which is the sitemap
 * equivalent of the `hreflang` tags in the page head — Google wants the
 * signal in at least one place, and the sitemap is the one it re-reads
 * without re-crawling the page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  /*
    Pages from the site tree. They are the only URLs on this site that no
    static list knows about — the routes above come from `lib/site.ts`, these
    come from a table — so a section that is not read from the database here
    is a section that is never crawled at all.

    An article is given a `lastModified` of its own edit rather than of this
    build: it is the signal that decides whether a guide is re-crawled after
    it changes, and pinning it to the deploy would make every page look equally
    stale a week later.
  */
  for (const node of flatten(await loadTree())) {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(locale, node.path),
        lastModified: node.updatedAt ? new Date(node.updatedAt) : now,
        changeFrequency: node.kind === 'article' ? 'monthly' : 'weekly',
        priority: node.kind === 'article' ? 0.6 : 0.7,
        alternates: { languages: languagesFor(node.path) },
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
