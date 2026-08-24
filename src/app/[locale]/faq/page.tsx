import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { CtaBand, Faq, PageHero, Section, SectionHead } from '@/components/blocks';
import { list, type FaqItem } from '@/components/blocks/content';
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';
import {
  breadcrumbNode,
  faqNode,
  graph,
  webPageNode,
} from '@/lib/structured-data';

const PATH = '/faq';
const NS = 'faqPage';

/**
 * The FAQ page aggregates the per-audience questions rather than restating
 * them. Each answer therefore lives in exactly one place in the catalogue —
 * edit it on the players page and it changes here too.
 */
const GROUPS = [
  { id: 'players', itemsKey: 'players.faq.items' },
  { id: 'organizers', itemsKey: 'organizers.faq.items' },
  { id: 'coaches', itemsKey: 'coaches.faq.items' },
  { id: 'venues', itemsKey: 'venues.faq.items' },
  { id: 'padel', itemsKey: 'padel.faq.items' },
] as const;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata({ locale, path: PATH, ns: NS });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const tMeta = await getTranslations(`${NS}.meta`);

  const allItems: FaqItem[] = (
    await Promise.all(GROUPS.map((group) => list<FaqItem>(group.itemsKey)))
  ).flat();

  const schema = graph([
    webPageNode(locale, PATH, tMeta('title'), tMeta('description')),
    breadcrumbNode(locale, [
      { name: 'RabbitMatch', path: '/' },
      { name: tMeta('title'), path: PATH },
    ]),
    faqNode(allItems),
  ]);

  return (
    <main>
      <PageHero ns={NS} primaryHref="/#download" secondaryHref="/#contact" />

      {GROUPS.map((group, i) => (
        <Section
          key={group.id}
          id={group.id}
          tone={i % 2 === 1 ? 'subtle' : 'default'}
          labelledBy={`faq-${group.id}`}
        >
          <SectionHead
            titleKey={`${NS}.groups.${group.id}`}
            headingId={`faq-${group.id}`}
          />
          <Faq itemsKey={group.itemsKey} />
        </Section>
      ))}

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/#contact"
        secondaryLabelKey={`${NS}.cta.secondary`}
      />

      <JsonLd data={schema} />
    </main>
  );
}
