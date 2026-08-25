import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PageSchema } from '@/components/PageSchema/PageSchema';
import {
  AppBadges,
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
import { AppShot, ShotStack } from '@/components/appshot';
import { BuilderSlot } from '@/components/Builder/BuilderSlot';
import { isLocale, locales } from '@/i18n/config';
import { pageMetadata } from '@/lib/page-meta';

const PATH = '/players';
const NS = 'players';

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

export default async function PlayersPage({
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
        secondaryHref="/#how"
        aside={<AppShot name="games-list" priority />}
      />

      <Section tone="subtle">
        <StatStrip itemsKey={`${NS}.stats`} />
      </Section>

      <Section labelledBy="players-match">
        <Split
          eyebrowKey={`${NS}.match.eyebrow`}
          titleKey={`${NS}.match.title`}
          leadKey={`${NS}.match.lead`}
          headingId="players-match"
          media={<AppShot name="set-match" />}
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.match.items`} />
        </div>
      </Section>

      {/* The statistics screen is the strongest thing this page has: nobody
          else in racket sports ships it, and it only lands when you see it. */}
      <Section tone="subtle" labelledBy="players-stats">
        <Split
          eyebrowKey={`${NS}.stats2.eyebrow`}
          titleKey={`${NS}.stats2.title`}
          leadKey={`${NS}.stats2.lead`}
          headingId="players-stats"
          media={
            <ShotStack>
              <AppShot name="player-streak" />
              <AppShot name="player-stability" />
              <AppShot name="win-by-format" />
            </ShotStack>
          }
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.stats2.items`} />
        </div>
      </Section>

      <Section labelledBy="players-traits">
        <Split
          eyebrowKey={`${NS}.traits.eyebrow`}
          titleKey={`${NS}.traits.title`}
          leadKey={`${NS}.traits.lead`}
          headingId="players-traits"
          media={<AppShot name="player-traits" />}
          reversed
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.traits.items`} />
        </div>
      </Section>

      <Section tone="subtle" labelledBy="players-profile">
        <Split
          eyebrowKey={`${NS}.profile.eyebrow`}
          titleKey={`${NS}.profile.title`}
          leadKey={`${NS}.profile.lead`}
          headingId="players-profile"
          media={<AppShot name="player-card" />}
        />
        <div className={blockStyles.stack}>
          <FeatureGrid itemsKey={`${NS}.profile.items`} />
        </div>
      </Section>

      <Section labelledBy="players-steps">
        <SectionHead
          eyebrowKey={`${NS}.steps.eyebrow`}
          titleKey={`${NS}.steps.title`}
          headingId="players-steps"
        />
        <Steps itemsKey={`${NS}.steps.items`} />
      </Section>

      <Section tone="subtle" labelledBy="players-faq">
        <SectionHead titleKey={`${NS}.faq.title`} headingId="players-faq" />
        <Faq itemsKey={`${NS}.faq.items`} />
      </Section>

      <Section id="download" tone="tint" labelledBy="players-download">
        <SectionHead
          eyebrowKey="home.download.eyebrow"
          titleKey="home.download.title"
          leadKey="home.download.lead"
          headingId="players-download"
          centered
        />
        <div className={blockStyles.center}>
          <AppBadges />
        </div>
      </Section>

      <CtaBand
        titleKey={`${NS}.cta.title`}
        leadKey={`${NS}.cta.lead`}
        primaryLabelKey={`${NS}.cta.primary`}
        secondaryHref="/padel"
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
