import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import {
  Trophy,
  SlidersHorizontal,
  Activity,
  Users,
  CalendarDays,
  BarChart2,
  ArrowRight,
} from 'lucide-react';
import { EditableText } from '@/components/EditableText/EditableText';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import styles from './ForOrganizers.module.css';

type Feature = {
  Icon: React.ComponentType<{ size?: number }>;
  titleKey: string;
  bodyKey: string;
};

const FEATURES: Feature[] = [
  { Icon: Trophy,           titleKey: 'feat1Title', bodyKey: 'feat1Body' },
  { Icon: SlidersHorizontal,titleKey: 'feat2Title', bodyKey: 'feat2Body' },
  { Icon: Activity,         titleKey: 'feat3Title', bodyKey: 'feat3Body' },
  { Icon: Users,            titleKey: 'feat4Title', bodyKey: 'feat4Body' },
  { Icon: CalendarDays,     titleKey: 'feat5Title', bodyKey: 'feat5Body' },
  { Icon: BarChart2,        titleKey: 'feat6Title', bodyKey: 'feat6Body' },
];

type Step = { num: string; titleKey: string; bodyKey: string };

const STEPS: Step[] = [
  { num: '01', titleKey: 'step1Title', bodyKey: 'step1Body' },
  { num: '02', titleKey: 'step2Title', bodyKey: 'step2Body' },
  { num: '03', titleKey: 'step3Title', bodyKey: 'step3Body' },
];

export async function ForOrganizers() {
  const t = await getTranslations('organizers');

  return (
    <section id="organizers" className={styles.section} aria-label={t('eyebrow')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        {/* ── Header ──────────────────────────────────────── */}
        <div className={styles.header}>
          <ScrollReveal>
            <EditableText tKey="organizers.eyebrow" as="p" className={styles.eyebrow} />
          </ScrollReveal>
          <ScrollReveal delayMs={80}>
            <EditableText tKey="organizers.title" as="h2" multiline className={styles.title} />
          </ScrollReveal>
          <ScrollReveal delayMs={150}>
            <EditableText tKey="organizers.subtitle" as="p" multiline className={styles.subtitle} />
          </ScrollReveal>
        </div>

        {/* ── Feature grid ────────────────────────────────── */}
        <div className={styles.featGrid}>
          {FEATURES.map(({ Icon, titleKey, bodyKey }, idx) => (
            <ScrollReveal key={titleKey} delayMs={200 + idx * 70} className={styles.featCard}>
              <span className={styles.featIcon} aria-hidden="true">
                <Icon size={20} />
              </span>
              <EditableText
                tKey={`organizers.${titleKey}`}
                as="h3"
                className={styles.featTitle}
              />
              <EditableText
                tKey={`organizers.${bodyKey}`}
                as="p"
                multiline
                className={styles.featBody}
              />
            </ScrollReveal>
          ))}
        </div>

        {/* ── Phone + Steps ───────────────────────────────── */}
        <div className={styles.splitGrid}>
          <ScrollReveal delayMs={180} className={styles.phoneWrap}>
            <div className={styles.phoneGlow} aria-hidden="true" />
            <Image
              src="/images/phone-match-form.png"
              alt={t('phoneAlt')}
              width={720}
              height={1280}
              className={styles.phoneImg}
              sizes="(max-width: 900px) 60vw, 280px"
            />
          </ScrollReveal>

          <div className={styles.stepsCol}>
            <ScrollReveal delayMs={260}>
              <EditableText
                tKey="organizers.stepsTitle"
                as="p"
                className={styles.stepsTitle}
              />
            </ScrollReveal>
            <ol className={styles.steps}>
              {STEPS.map((step, idx) => (
                <ScrollReveal
                  key={step.num}
                  delayMs={340 + idx * 120}
                  as="li"
                  className={styles.stepWrap}
                >
                  <div className={styles.step}>
                    <span className={styles.stepNum} aria-hidden="true">
                      {step.num}
                    </span>
                    <div className={styles.stepBody}>
                      <EditableText
                        tKey={`organizers.${step.titleKey}`}
                        as="h4"
                        className={styles.stepTitle}
                      />
                      <EditableText
                        tKey={`organizers.${step.bodyKey}`}
                        as="p"
                        multiline
                        className={styles.stepText}
                      />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </ol>
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────── */}
        <ScrollReveal delayMs={260} className={styles.ctaRow}>
          <span className={styles.highlightBadge}>
            <EditableText tKey="organizers.highlight" as="span" />
          </span>
          <a
            href="https://rabbitmatch.app"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
          >
            <EditableText tKey="organizers.cta" as="span" />
            <ArrowRight size={18} className={styles.ctaArrow} aria-hidden="true" />
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
