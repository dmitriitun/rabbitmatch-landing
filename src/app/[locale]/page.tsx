import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Comparison } from '@/components/Comparison/Comparison';
import { Contact } from '@/components/Contact/Contact';
import { Hero } from '@/components/Hero/Hero';
import {
  AppBadges,
  AudienceGrid,
  CtaBand,
  Faq,
  FeatureGrid,
  Section,
  SectionHead,
  Split,
  Steps,
} from '@/components/blocks';
import { AppShot } from '@/components/appshot';
import { isLocale, locales } from '@/i18n/config';
import styles from './page.module.css';

const AUDIENCE_HREFS = ['/players', '/organizers', '/coaches', '/venues'] as const;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <main>
      <Hero />

      {/* The four audience cards are the home page's job: route the visitor to
          the page written for them, and give crawlers a path to all four. */}
      <Section tone="subtle" labelledBy="home-audiences">
        <SectionHead
          eyebrowKey="home.audiences.eyebrow"
          titleKey="home.audiences.title"
          leadKey="home.audiences.lead"
          headingId="home-audiences"
        />
        <AudienceGrid
          itemsKey="home.audiences.items"
          hrefs={AUDIENCE_HREFS}
          ctaKey="home.audiences.cta"
        />
      </Section>

      <Section id="how" labelledBy="home-how">
        <SectionHead
          eyebrowKey="home.how.eyebrow"
          titleKey="home.how.title"
          leadKey="home.how.lead"
          headingId="home-how"
        />
        <Steps itemsKey="home.how.items" />
      </Section>

      <Section id="features" tone="dark" labelledBy="home-features">
        <SectionHead
          eyebrowKey="home.features.eyebrow"
          titleKey="home.features.title"
          leadKey="home.features.lead"
          headingId="home-features"
        />
        <FeatureGrid itemsKey="home.features.items" />
      </Section>

      {/* The matchmaking weights, on the home page rather than buried on the
          players page: "we match you by level" is the one claim every
          competitor also makes, so showing the arithmetic early is what
          separates us before anyone clicks through. */}
      <Section labelledBy="home-match">
        <Split
          eyebrowKey="players.match.eyebrow"
          titleKey="players.match.title"
          leadKey="players.match.lead"
          headingId="home-match"
          media={<AppShot name="best-match" />}
        />
      </Section>

      <Section tone="subtle" labelledBy="home-why">
        <SectionHead
          eyebrowKey="home.why.eyebrow"
          titleKey="home.why.title"
          leadKey="home.why.lead"
          headingId="home-why"
        />
        <Comparison bare />
      </Section>

      <CtaBand
        titleKey="home.clubCta.title"
        leadKey="home.clubCta.lead"
        primaryHref="/#contact"
        primaryLabelKey="home.clubCta.primary"
        secondaryHref="/venues"
        secondaryLabelKey="home.clubCta.secondary"
      />

      <Section tone="subtle" labelledBy="home-faq">
        <SectionHead
          eyebrowKey="home.faq.eyebrow"
          titleKey="home.faq.title"
          headingId="home-faq"
        />
        <Faq itemsKey="home.faq.items" />
      </Section>

      <Section id="download" tone="tint" labelledBy="home-download">
        <SectionHead
          eyebrowKey="home.download.eyebrow"
          titleKey="home.download.title"
          leadKey="home.download.lead"
          headingId="home-download"
          centered
        />
        <div className={styles.badgesCenter}>
          <AppBadges />
        </div>
      </Section>

      <Contact />
    </main>
  );
}
