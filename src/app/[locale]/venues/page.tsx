import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageSchema } from '@/components/PageSchema/PageSchema';
import { Comparison } from '@/components/Comparison/Comparison';
import { ContactForm } from '@/components/ContactForm/ContactForm';
import { CrmMockup } from '@/components/Solution/CrmMockup';
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
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';

const PATH = '/venues';
const NS = 'venues';

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

export default async function VenuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const tSolution = await getTranslations('solution');

  return (
    <main>
      <PageHero ns={NS} primaryHref="/#contact" secondaryHref="/pricing" aside={<AppShot name="venue-booking" priority />} />

      <Section tone="subtle">
        <StatStrip itemsKey={`${NS}.stats`} />
      </Section>

      <Section labelledBy="venues-features">
        <Split
          eyebrowKey={`${NS}.features.eyebrow`}
          titleKey={`${NS}.features.title`}
          leadKey={`${NS}.features.lead`}
          headingId="venues-features"
          media={<AppShot name="court-card" />}
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.features.items`} />
        </div>
      </Section>

      {/* The CRM mockup does more work than any copy on this page: venue
          owners want to see the schedule screen before they believe any of it. */}
      <Section tone="subtle" labelledBy="venues-crm">
        <SectionHead
          eyebrowKey="solution.eyebrow"
          titleKey="solution.platform"
          leadKey="solution.lead"
          headingId="venues-crm"
        />
        <CrmMockup ariaLabel={tSolution('mockupCrmAlt')} />
      </Section>

      {/* The integration section answers the objection that actually blocks
          the sale: "we already have a booking system". */}
      <Section labelledBy="venues-integration">
        <SectionHead
          eyebrowKey={`${NS}.integration.eyebrow`}
          titleKey={`${NS}.integration.title`}
          leadKey={`${NS}.integration.lead`}
          headingId="venues-integration"
        />
        <FeatureGrid itemsKey={`${NS}.integration.items`} columns={4} />
      </Section>

      <Section tone="subtle" labelledBy="venues-steps">
        <SectionHead
          eyebrowKey={`${NS}.steps.eyebrow`}
          titleKey={`${NS}.steps.title`}
          headingId="venues-steps"
        />
        <Steps itemsKey={`${NS}.steps.items`} />
      </Section>

      <Section labelledBy="venues-comparison">
        <SectionHead titleKey="comparison.title" headingId="venues-comparison" />
        <Comparison bare />
      </Section>

      <Section tone="subtle" labelledBy="venues-faq">
        <SectionHead titleKey={`${NS}.faq.title`} headingId="venues-faq" />
        <Faq itemsKey={`${NS}.faq.items`} />
      </Section>

      <Section id="contact" labelledBy="venues-contact">
        <SectionHead
          eyebrowKey="contact.eyebrow"
          titleKey="contact.title"
          leadKey="contact.lead"
          headingId="venues-contact"
        />
        <ContactForm source="venues" />
      </Section>

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryHref="/#contact"
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/pricing"
        secondaryLabelKey={`${NS}.cta.secondary`}
      />

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
