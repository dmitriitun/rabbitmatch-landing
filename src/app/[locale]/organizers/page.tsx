import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PageSchema } from '@/components/PageSchema/PageSchema';
import {
  blockStyles,
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
import { PageBody } from '@/components/Builder/PageBody';
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';

const PATH = '/organizers';
const NS = 'organizers';

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

export default async function OrganizersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <main>
      <PageBody page={PATH} locale={locale}>
      <BuilderSlot page={PATH} slot="top" locale={locale} />

      <PageHero
        ns={NS}
        primaryHref="/#download"
        secondaryHref="/organizers#formats"
        aside={<AppShot name="courts" priority />}
      />

      <Section tone="subtle">
        <StatStrip itemsKey={`${NS}.stats`} />
      </Section>

      {/* Live control comes before the format catalogue on purpose. Formats are
          what organizers compare on; being able to fix a running event without
          a support ticket is what they stay for. */}
      <Section labelledBy="organizers-control">
        <SectionHead
          eyebrowKey={`${NS}.control.eyebrow`}
          titleKey={`${NS}.control.title`}
          leadKey={`${NS}.control.lead`}
          headingId="organizers-control"
        />
        <FeatureGrid itemsKey={`${NS}.control.items`} />
      </Section>

      <Section id="formats" tone="subtle" labelledBy="organizers-formats">
        <Split
          eyebrowKey={`${NS}.formats.eyebrow`}
          titleKey={`${NS}.formats.title`}
          leadKey={`${NS}.formats.lead`}
          headingId="organizers-formats"
          media={<AppShot name="game-formats" />}
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.formats.items`} />
        </div>
      </Section>

      <Section tone="dark" labelledBy="organizers-features">
        <SectionHead
          eyebrowKey={`${NS}.features.eyebrow`}
          titleKey={`${NS}.features.title`}
          headingId="organizers-features"
        />
        <FeatureGrid itemsKey={`${NS}.features.items`} />
      </Section>

      <Section labelledBy="organizers-audience">
        <Split
          eyebrowKey={`${NS}.audience.eyebrow`}
          titleKey={`${NS}.audience.title`}
          leadKey={`${NS}.audience.lead`}
          headingId="organizers-audience"
          media={<AppShot name="organizer-stats" />}
          reversed
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.audience.items`} />
        </div>
      </Section>

      <Section tone="subtle" labelledBy="organizers-steps">
        <SectionHead
          eyebrowKey={`${NS}.steps.eyebrow`}
          titleKey={`${NS}.steps.title`}
          headingId="organizers-steps"
        />
        <Steps itemsKey={`${NS}.steps.items`} />
      </Section>

      <Section labelledBy="organizers-faq">
        <SectionHead titleKey={`${NS}.faq.title`} headingId="organizers-faq" />
        <Faq itemsKey={`${NS}.faq.items`} />
      </Section>

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/venues"
        secondaryLabelKey={`${NS}.cta.secondary`}
      />

      <BuilderSlot page={PATH} slot="bottom" locale={locale} />
      </PageBody>

      <PageSchema
        locale={locale}
        path={PATH}
        ns={NS}
        faqKey={`${NS}.faq.items`}
        howToKey={`${NS}.steps.items`}
      />
    </main>
  );
}
