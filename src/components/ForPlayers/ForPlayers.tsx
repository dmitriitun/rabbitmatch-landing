import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import {
  Zap,
  TrendingUp,
  Award,
  Search,
  CheckCircle2,
  ArrowRight,
  Globe,
  Send,
  Smartphone,
} from 'lucide-react';
import { EditableText } from '@/components/EditableText/EditableText';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import styles from './ForPlayers.module.css';

type Benefit = {
  Icon: React.ComponentType<{ size?: number }>;
  titleKey: string;
  bodyKey: string;
};

const BENEFITS: Benefit[] = [
  { Icon: Zap,        titleKey: 'benefit1Title', bodyKey: 'benefit1Body' },
  { Icon: TrendingUp, titleKey: 'benefit2Title', bodyKey: 'benefit2Body' },
  { Icon: Award,      titleKey: 'benefit3Title', bodyKey: 'benefit3Body' },
  { Icon: Search,     titleKey: 'benefit4Title', bodyKey: 'benefit4Body' },
];

const PROFILE_FEATS = [
  'profileFeat1',
  'profileFeat2',
  'profileFeat3',
  'profileFeat4',
  'profileFeat5',
  'profileFeat6',
] as const;

type Platform = {
  Icon: React.ComponentType<{ size?: number }>;
  labelKey: 'platformsWeb' | 'platformsTelegram' | 'platformsIos' | 'platformsAndroid';
  href: string;
  soon?: boolean;
};

const PLATFORMS: Platform[] = [
  { Icon: Globe,      labelKey: 'platformsWeb',      href: 'https://rabbitmatch.app', soon: false },
  { Icon: Send,       labelKey: 'platformsTelegram', href: 'https://web.telegram.org/k/#@rabbit_match_bot', soon: false },
  { Icon: Smartphone, labelKey: 'platformsIos',      href: '#', soon: true },
  { Icon: Smartphone, labelKey: 'platformsAndroid',  href: '#', soon: true },
];

export async function ForPlayers() {
  const t = await getTranslations('forPlayers');

  return (
    <section id="players" className={styles.section} aria-label={t('eyebrow')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        {/* ── Header ─────────────────────────────────────── */}
        <div className={styles.header}>
          <ScrollReveal>
            <EditableText tKey="forPlayers.eyebrow" as="p" className={styles.eyebrow} />
          </ScrollReveal>
          <ScrollReveal delayMs={80}>
            <EditableText tKey="forPlayers.title" as="h2" multiline className={styles.title} />
          </ScrollReveal>
          <ScrollReveal delayMs={150}>
            <EditableText
              tKey="forPlayers.subtitle"
              as="p"
              multiline
              className={styles.subtitle}
            />
          </ScrollReveal>
        </div>

        {/* ── Benefits row ───────────────────────────────── */}
        <div className={styles.benefitsRow}>
          {BENEFITS.map(({ Icon, titleKey, bodyKey }, idx) => (
            <ScrollReveal key={titleKey} delayMs={200 + idx * 80} className={styles.benefitCard}>
              <span className={styles.benefitIcon} aria-hidden="true">
                <Icon size={20} />
              </span>
              <EditableText
                tKey={`forPlayers.${titleKey}`}
                as="h3"
                className={styles.benefitTitle}
              />
              <EditableText
                tKey={`forPlayers.${bodyKey}`}
                as="p"
                multiline
                className={styles.benefitBody}
              />
            </ScrollReveal>
          ))}
        </div>

        {/* ── Profile split ──────────────────────────────── */}
        <div className={styles.profileGrid}>
          <ScrollReveal delayMs={180} className={styles.profilePhoneWrap}>
            <div className={styles.profilePhoneGlow} aria-hidden="true" />
            <Image
              src="/images/phone-profile.png"
              alt={t('profilePhoneAlt')}
              width={720}
              height={1280}
              className={styles.profilePhoneImg}
              sizes="(max-width: 900px) 65vw, 280px"
            />
          </ScrollReveal>

          <div className={styles.profileTextCol}>
            <ScrollReveal delayMs={240}>
              <EditableText
                tKey="forPlayers.profileTitle"
                as="h3"
                className={styles.profileTitle}
              />
            </ScrollReveal>
            <ScrollReveal delayMs={300}>
              <EditableText
                tKey="forPlayers.profileSubtitle"
                as="p"
                multiline
                className={styles.profileSubtitle}
              />
            </ScrollReveal>
            <ul className={styles.featList}>
              {PROFILE_FEATS.map((featKey, idx) => (
                <ScrollReveal key={featKey} delayMs={360 + idx * 60} as="li" className={styles.featItem}>
                  <CheckCircle2
                    size={18}
                    className={styles.featCheck}
                    aria-hidden="true"
                  />
                  <EditableText
                    tKey={`forPlayers.${featKey}`}
                    as="span"
                    className={styles.featLabel}
                  />
                </ScrollReveal>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Booking strip ──────────────────────────────── */}
        <ScrollReveal delayMs={200} className={styles.bookingStrip}>
          <div className={styles.bookingPhoneWrap}>
            <div className={styles.bookingGlow} aria-hidden="true" />
            <Image
              src="/images/phone-courts-2.png"
              alt={t('courtsPhoneAlt')}
              width={720}
              height={1280}
              className={styles.bookingPhoneImg}
              sizes="(max-width: 900px) 55vw, 220px"
            />
          </div>
          <div className={styles.bookingText}>
            <EditableText
              tKey="forPlayers.bookingTitle"
              as="h3"
              className={styles.bookingTitle}
            />
            <EditableText
              tKey="forPlayers.bookingBody"
              as="p"
              multiline
              className={styles.bookingBody}
            />
          </div>
        </ScrollReveal>

        {/* ── Platforms ──────────────────────────────────── */}
        <ScrollReveal delayMs={200} className={styles.platformsWrap}>
          <EditableText
            tKey="forPlayers.platformsTitle"
            as="p"
            className={styles.platformsTitle}
          />
          <div className={styles.platformsRow}>
            {PLATFORMS.map(({ Icon, labelKey, href, soon }) => {
              const label = t(labelKey);
              const soonLabel = t('platformsSoon');
              if (soon) {
                return (
                  <span key={labelKey} className={`${styles.platformBtn} ${styles.platformBtnDisabled}`} aria-label={`${label} — ${soonLabel}`}>
                    <Icon size={18} aria-hidden="true" />
                    <span className={styles.platformLabel}>{label}</span>
                    <span className={styles.platformSoon}>{soonLabel}</span>
                  </span>
                );
              }
              return (
                <a
                  key={labelKey}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.platformBtn}
                  aria-label={label}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className={styles.platformLabel}>{label}</span>
                </a>
              );
            })}
          </div>
        </ScrollReveal>

        {/* ── CTA ────────────────────────────────────────── */}
        <ScrollReveal delayMs={200} className={styles.ctaWrap}>
          <a
            href="https://rabbitmatch.app"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
          >
            <EditableText tKey="forPlayers.cta" as="span" />
            <ArrowRight size={18} className={styles.ctaArrow} aria-hidden="true" />
          </a>
          <EditableText tKey="forPlayers.ctaSub" as="p" className={styles.ctaSub} />
        </ScrollReveal>
      </div>
    </section>
  );
}
