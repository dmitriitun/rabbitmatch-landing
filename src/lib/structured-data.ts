import { absoluteUrl, links, siteName, siteUrl } from './site';
import type { Locale } from '@/i18n/config';

/**
 * Structured data helpers.
 *
 * Two audiences read this, and they want the same thing:
 *  - search engines, for rich results (FAQ accordions, app install boxes,
 *    breadcrumbs, sitelinks);
 *  - answer engines (ChatGPT, Perplexity, Google AI Overviews), which lean on
 *    explicit entity markup to decide what a site *is* and to quote it.
 *
 * So every page emits an `@graph` with a stable `@id` per entity, and content
 * pages add a `FAQPage` with answers written to be quotable in isolation.
 */

type Json = Record<string, unknown>;

export const orgId = `${siteUrl}/#organization`;
export const siteId = `${siteUrl}/#website`;
export const appId = `${siteUrl}/#app`;

export function organizationNode(locale: Locale, description: string): Json {
  const sameAs = [links.instagram, links.tiktok, links.facebook, links.telegramChannel].filter(
    Boolean,
  );

  return {
    '@type': 'Organization',
    '@id': orgId,
    name: siteName,
    url: absoluteUrl(locale),
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/images/logo.png`,
      width: 512,
      height: 512,
    },
    description,
    ...(sameAs.length ? { sameAs } : {}),
    ...(links.contactEmail
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: links.contactEmail,
              availableLanguage: ['en', 'ru'],
            },
          ],
        }
      : {}),
  };
}

export function webSiteNode(locale: Locale, name: string, description: string): Json {
  return {
    '@type': 'WebSite',
    '@id': siteId,
    url: absoluteUrl(locale),
    name,
    description,
    inLanguage: locale,
    publisher: { '@id': orgId },
  };
}

/**
 * `MobileApplication` rather than the vaguer `SoftwareApplication`: it is what
 * Google's app rich result keys off, and it lets us declare the three
 * distribution channels (App Store, Google Play, Telegram Mini App) explicitly.
 */
export function appNode(description: string): Json {
  const installUrls = [links.ios, links.android, links.telegramApp].filter(Boolean);

  return {
    '@type': 'MobileApplication',
    '@id': appId,
    name: siteName,
    description,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'iOS, Android, Web, Telegram',
    ...(installUrls.length ? { installUrl: installUrls } : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
    },
    publisher: { '@id': orgId },
  };
}

export function webPageNode(
  locale: Locale,
  path: string,
  name: string,
  description: string,
): Json {
  return {
    '@type': 'WebPage',
    '@id': `${absoluteUrl(locale, path)}#webpage`,
    url: absoluteUrl(locale, path),
    name,
    description,
    inLanguage: locale,
    isPartOf: { '@id': siteId },
    about: { '@id': orgId },
  };
}

export function breadcrumbNode(
  locale: Locale,
  trail: ReadonlyArray<{ name: string; path: string }>,
): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}

export type FaqEntry = { question: string; answer: string };

export function faqNode(entries: ReadonlyArray<FaqEntry>): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

export function howToNode(
  name: string,
  steps: ReadonlyArray<{ name: string; text: string }>,
): Json {
  return {
    '@type': 'HowTo',
    name,
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

/**
 * A knowledge-base entry.
 *
 * `Article` rather than `WebPage` for pages in the learning section: it is the
 * type answer engines quote from, it carries an author and a date — the two
 * things that decide whether a guide is treated as current — and it is what
 * makes an article eligible for the article rich result instead of a plain
 * blue link.
 */
export function articleNode(
  locale: Locale,
  path: string,
  headline: string,
  description: string,
  updated: string | null,
): Json {
  return {
    '@type': 'Article',
    '@id': `${absoluteUrl(locale, path)}#article`,
    headline,
    ...(description ? { description } : {}),
    inLanguage: locale,
    isPartOf: { '@id': siteId },
    mainEntityOfPage: { '@id': `${absoluteUrl(locale, path)}#webpage` },
    author: { '@id': orgId },
    publisher: { '@id': orgId },
    ...(updated ? { dateModified: updated } : {}),
  };
}

/**
 * The listing page of a section.
 *
 * `CollectionPage` says "this page's job is to point at other pages", which
 * keeps a section index from competing with its own articles for the query
 * they answer.
 */
export function collectionNode(
  locale: Locale,
  path: string,
  name: string,
  description: string,
  items: ReadonlyArray<{ name: string; path: string }>,
): Json {
  return {
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(locale, path)}#collection`,
    url: absoluteUrl(locale, path),
    name,
    ...(description ? { description } : {}),
    inLanguage: locale,
    isPartOf: { '@id': siteId },
    ...(items.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: items.map((item, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: item.name,
              url: absoluteUrl(locale, item.path),
            })),
          },
        }
      : {}),
  };
}

/** Wrap nodes into a single `@graph` document. */
export function graph(nodes: ReadonlyArray<Json>): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
}
