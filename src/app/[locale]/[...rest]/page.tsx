import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { NodePage } from '@/components/SiteTree/NodePage';
import { isLocale, localeHreflang, type Locale } from '@/i18n/config';
import { absoluteUrl, alternatesFor, siteName } from '@/lib/site';
import {
  articleNode,
  breadcrumbNode,
  collectionNode,
  graph,
  webPageNode,
} from '@/lib/structured-data';
import { loadTree } from '@/lib/tree/store';
import { findByPath, nodeSummary, nodeTitle, SLUG_RE, trailTo } from '@/lib/tree/types';

/**
 * Everything inside a locale that is not a route in `app/`.
 *
 * Two jobs, and the second one is new. It still renders the branded 404 —
 * without this route `/ru/nope` matches nothing and Next falls back to the
 * *root* `not-found.tsx`, outside the locale layout, so the visitor gets an
 * unbranded, untranslated page. And it now resolves the site tree: sections an
 * admin created and their sub-pages live here, at whatever depth they were
 * given, which is why they need a catch-all rather than a route per page.
 *
 * Order of precedence is Next's and it is the one we want: a static segment
 * beats a dynamic one, so `/players` and `/legal/terms` keep their own pages
 * and never reach this file. `RESERVED_SLUGS` keeps an admin from creating a
 * top-level node that would be shadowed by one of them.
 */

/**
 * Rendered on demand, then cached for five minutes.
 *
 * The set of pages here is not known at build time — it is a database table —
 * so there is no `generateStaticParams` to prerender from. ISR gets the same
 * result for the traffic that matters: the first visitor after a change pays
 * for the render, everyone else is served from the cache. Publishing from the
 * builder calls `revalidatePath`, so an edit does not wait out the window.
 */
export const revalidate = 300;

type Params = { locale: string; rest?: string[] };

/** URL segments → the path a tree node is stored under. */
function toPath(rest: string[] | undefined): string | null {
  if (!rest?.length || rest.length > 8) return null;
  for (const segment of rest) {
    // A tree slug is `[a-z0-9-]`. Anything else cannot be a node, so it is a
    // 404 without a database round trip — which is most of what hits here.
    if (!SLUG_RE.test(segment)) return null;
  }
  return `/${rest.join('/')}`;
}

async function resolve(params: Params) {
  const path = toPath(params.rest);
  if (!path || !isLocale(params.locale)) return null;

  const tree = await loadTree();
  const node = findByPath(tree, path);
  if (!node) return null;

  return { node, trail: trailTo(tree, path), locale: params.locale as Locale, path };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const found = await resolve(await params);
  if (!found) return { robots: { index: false, follow: false } };

  const { node, locale, path } = found;
  const title = nodeTitle(node, locale);
  const description = nodeSummary(node, locale);

  return {
    title,
    ...(description ? { description } : {}),
    alternates: alternatesFor(locale, path),
    openGraph: {
      title: `${title} — ${siteName}`,
      description,
      url: absoluteUrl(locale, path),
      siteName,
      locale: localeHreflang[locale].replace('-', '_'),
      type: node.kind === 'article' ? 'article' : 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — ${siteName}`,
      description,
    },
  };
}

export default async function TreePage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const found = await resolve(resolved);

  // Not a tree page: render the locale-aware 404 the way this route always has.
  if (!found) notFound();

  const { node, trail, locale, path } = found;
  setRequestLocale(locale);

  const title = nodeTitle(node, locale);
  const description = nodeSummary(node, locale);

  const nodes = [
    webPageNode(locale, path, title, description),
    breadcrumbNode(locale, [
      { name: siteName, path: '/' },
      ...trail.map((step) => ({ name: nodeTitle(step, locale), path: step.path })),
    ]),
    node.kind === 'article' && node.children.length === 0
      ? articleNode(locale, path, title, description, node.updatedAt)
      : collectionNode(
          locale,
          path,
          title,
          description,
          node.children.map((child) => ({ name: nodeTitle(child, locale), path: child.path })),
        ),
  ];

  return (
    <>
      <NodePage node={node} trail={trail} locale={locale} />
      <JsonLd data={graph(nodes)} />
      {/*
        Which node this page is, for the tree manager: opening it from a
        section page should select that section rather than the root. Hidden
        and empty — it is a marker, not content.
      */}
      <span hidden data-rm-node-id={node.id} />
    </>
  );
}
