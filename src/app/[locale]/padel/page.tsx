import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PageSchema } from '@/components/PageSchema/PageSchema';
import { BuilderSlot } from '@/components/Builder/BuilderSlot';
import {
  CtaBand,
  Faq,
  FeatureGrid,
  PageHero,
  Section,
  SectionHead,
  Steps,
} from '@/components/blocks';
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';

const PATH = '/padel';
const NS = 'padel';

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

/**
 * The padel guide.
 *
 * This is the page that exists for search rather than for conversion: "what
 * is padel", "padel rules", "padel vs tennis" and "how to start playing padel"
 * are all high-volume informational queries with no strong Russian-language
 * answer. It is written to be quotable in isolation — each answer stands on
 * its own — because that is what answer engines lift.
 */
export default async function PadelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <main>
      <BuilderSlot page={PATH} slot="top" locale={locale} />

      <PageHero ns={NS} primaryHref="/players" secondaryHref="/faq" />

      <Section labelledBy="padel-basics">
        <SectionHead
          eyebrowKey={`${NS}.basics.eyebrow`}
          titleKey={`${NS}.basics.title`}
          headingId="padel-basics"
        />
        <FeatureGrid itemsKey={`${NS}.basics.items`} />
      </Section>

      <Section tone="subtle" labelledBy="padel-start">
        <SectionHead
          eyebrowKey={`${NS}.start.eyebrow`}
          titleKey={`${NS}.start.title`}
          headingId="padel-start"
        />
        <Steps itemsKey={`${NS}.start.items`} />
      </Section>

      <Section tone="dark" labelledBy="padel-vs">
        <SectionHead
          eyebrowKey={`${NS}.vs.eyebrow`}
          titleKey={`${NS}.vs.title`}
          leadKey={`${NS}.vs.lead`}
          headingId="padel-vs"
        />
        <FeatureGrid itemsKey={`${NS}.vs.items`} />
      </Section>

      <Section labelledBy="padel-faq">
        <SectionHead titleKey={`${NS}.faq.title`} headingId="padel-faq" />
        <Faq itemsKey={`${NS}.faq.items`} />
      </Section>

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/players"
        secondaryLabelKey={`${NS}.cta.secondary`}
      />

      <PageSchema
        locale={locale}
        path={PATH}
        ns={NS}
        faqKey={`${NS}.faq.items`}
        howToKey={`${NS}.start.items`}
      />
      <BuilderSlot page={PATH} slot="bottom" locale={locale} />
    </main>
  );
}
