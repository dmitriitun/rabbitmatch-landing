import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PageSchema } from '@/components/PageSchema/PageSchema';
import { Pricing } from '@/components/Pricing/Pricing';
import {
  CtaBand,
  Faq,
  FeatureGrid,
  PageHero,
  Section,
  SectionHead,
} from '@/components/blocks';
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';

const PATH = '/pricing';
const NS = 'pricingPage';

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

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <main>
      <PageHero ns={NS} primaryHref="/#contact" secondaryHref="/venues" />

      {/* Leading with what is free is deliberate: the most common objection to
          a sports app is "so what does it actually cost me", and answering it
          before showing plans removes it. */}
      <Section labelledBy="pricing-free">
        <SectionHead
          eyebrowKey={`${NS}.free.eyebrow`}
          titleKey={`${NS}.free.title`}
          headingId="pricing-free"
        />
        <FeatureGrid itemsKey={`${NS}.free.items`} />
      </Section>

      {/* PRO/MAX sits between "what is free" and the venue plans on purpose:
          the honest answer to "so what do I pay for" belongs next to the
          answer to "what do I not". */}
      <Section tone="subtle" labelledBy="pricing-subs">
        <SectionHead
          eyebrowKey={`${NS}.subs.eyebrow`}
          titleKey={`${NS}.subs.title`}
          leadKey={`${NS}.subs.lead`}
          headingId="pricing-subs"
        />
        <FeatureGrid itemsKey={`${NS}.subs.items`} columns={4} />
      </Section>

      <Section labelledBy="pricing-plans">
        <SectionHead
          eyebrowKey={`${NS}.plans.eyebrow`}
          titleKey={`${NS}.plans.title`}
          leadKey={`${NS}.plans.lead`}
          headingId="pricing-plans"
        />
      </Section>

      <Pricing />

      <Section tone="subtle" labelledBy="pricing-commission">
        <SectionHead titleKey={`${NS}.commission.title`} headingId="pricing-commission" />
        <FeatureGrid itemsKey={`${NS}.commission.items`} />
      </Section>

      <Section labelledBy="pricing-faq">
        <SectionHead titleKey={`${NS}.faq.title`} headingId="pricing-faq" />
        <Faq itemsKey={`${NS}.faq.items`} />
      </Section>

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryHref="/#contact"
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/venues"
        secondaryLabelKey={`${NS}.cta.secondary`}
      />

      <PageSchema locale={locale} path={PATH} ns={NS} faqKey={`${NS}.faq.items`} />
    </main>
  );
}
