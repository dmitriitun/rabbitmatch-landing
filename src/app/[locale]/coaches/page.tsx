import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PageSchema } from '@/components/PageSchema/PageSchema';
import {
  CtaBand,
  Faq,
  FeatureGrid,
  PageHero,
  Section,
  SectionHead,
  Split,
  StatStrip,
  Steps,
} from '@/components/blocks';
import { AppShot } from '@/components/appshot';
import { BuilderSlot } from '@/components/Builder/BuilderSlot';
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';

const PATH = '/coaches';
const NS = 'coaches';

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

export default async function CoachesPage({
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

      <PageHero
        ns={NS}
        primaryHref="/#download"
        secondaryHref="/#contact"
        aside={<AppShot name="coach-profile" priority />}
      />

      <Section tone="subtle">
        <StatStrip itemsKey={`${NS}.stats`} />
      </Section>

      <Section labelledBy="coaches-features">
        <SectionHead
          eyebrowKey={`${NS}.features.eyebrow`}
          titleKey={`${NS}.features.title`}
          headingId="coaches-features"
        />
        <FeatureGrid itemsKey={`${NS}.features.items`} />
      </Section>

      <Section tone="subtle" labelledBy="coaches-schedule">
        <Split
          eyebrowKey={`${NS}.schedule.eyebrow`}
          titleKey={`${NS}.schedule.title`}
          leadKey={`${NS}.schedule.lead`}
          headingId="coaches-schedule"
          media={<AppShot name="coach-schedule" />}
          reversed
        />
      </Section>

      <Section labelledBy="coaches-steps">
        <SectionHead
          eyebrowKey={`${NS}.steps.eyebrow`}
          titleKey={`${NS}.steps.title`}
          headingId="coaches-steps"
        />
        <Steps itemsKey={`${NS}.steps.items`} />
      </Section>

      <Section tone="subtle" labelledBy="coaches-faq">
        <SectionHead titleKey={`${NS}.faq.title`} headingId="coaches-faq" />
        <Faq itemsKey={`${NS}.faq.items`} />
      </Section>

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/#contact"
        secondaryLabelKey={`${NS}.cta.secondary`}
      />

      <PageSchema
        locale={locale}
        path={PATH}
        ns={NS}
        faqKey={`${NS}.faq.items`}
        howToKey={`${NS}.steps.items`}
      />
      <BuilderSlot page={PATH} slot="bottom" locale={locale} />
    </main>
  );
}
