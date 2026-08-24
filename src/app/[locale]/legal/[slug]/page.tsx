import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EditableText } from '@/components/EditableText/EditableText';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { isLocale, locales } from '@/i18n/config';
import { alternatesFor, legalSlugs, siteName, type LegalSlug } from '@/lib/site';
import { breadcrumbNode, graph, webPageNode } from '@/lib/structured-data';
import styles from './legal.module.css';

function isSlug(value: string): value is LegalSlug {
  return (legalSlugs as readonly string[]).includes(value);
}

export function generateStaticParams(): Array<{ locale: string; slug: LegalSlug }> {
  return locales.flatMap((locale) => legalSlugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isSlug(slug)) return {};

  const t = await getTranslations({ locale, namespace: 'legal' });
  return {
    title: t(`${slug}.title`),
    alternates: alternatesFor(locale, `/legal/${slug}`),
    // Legal boilerplate is near-duplicate across many sites and adds nothing
    // to the index, but it must stay crawlable so link equity flows and so
    // the pages remain reachable for compliance review.
    robots: { index: false, follow: true },
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!isSlug(slug)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('legal');
  const title = t(`${slug}.title`);

  const schema = graph([
    webPageNode(locale, `/legal/${slug}`, title, `${title} — ${siteName}`),
    breadcrumbNode(locale, [
      { name: siteName, path: '/' },
      { name: title, path: `/legal/${slug}` },
    ]),
  ]);

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <h1 className={styles.title} data-rm-key={`legal.${slug}.title`}>
          {title}
        </h1>
        <EditableText tKey={`legal.${slug}.body`} as="div" multiline className={styles.body} />
      </article>
      <JsonLd data={schema} />
    </main>
  );
}
