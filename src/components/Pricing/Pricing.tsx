import { Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import { PricingCta } from './PricingCta';
import styles from './Pricing.module.css';

type TierKey = 'classic' | 'comfort' | 'max';

const TIERS: ReadonlyArray<{ key: TierKey; featureCount: number; badge: 'popular' | 'ai' | null }> = [
  { key: 'classic', featureCount: 6, badge: null },
  { key: 'comfort', featureCount: 7, badge: 'popular' },
  { key: 'max', featureCount: 7, badge: 'ai' },
];

export async function Pricing() {
  const t = await getTranslations('pricing');

  return (
    <section id="pricing" className={styles.section} aria-label={t('title')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        <ScrollReveal>
          <h2 className={styles.title}>{t('title')}</h2>
        </ScrollReveal>

        <div className={styles.grid}>
          {TIERS.map((tier, idx) => {
            const tg = (k: string) => t(`${tier.key}.${k}`);
            const features = Array.from({ length: tier.featureCount }, (_, i) => tg(`feature${i + 1}`)).filter(
              Boolean,
            );

            return (
              <ScrollReveal
                key={tier.key}
                delayMs={150 + idx * 120}
                className={`${styles.cardWrap} ${tier.key === 'comfort' ? styles.cardWrapPopular : ''}`}
              >
                <article className={`${styles.card} ${styles[`card_${tier.key}`]}`}>
                  {tier.badge === 'popular' ? (
                    <span className={styles.badgePopular}>{t('badgePopular')}</span>
                  ) : null}
                  {tier.badge === 'ai' ? (
                    <span className={styles.badgeAi}>
                      <Sparkles size={12} aria-hidden="true" />
                      {t('badgeAi')}
                    </span>
                  ) : null}

                  <header className={styles.cardHead}>
                    <h3 className={`${styles.name} ${styles[`name_${tier.key}`]}`}>{tg('name')}</h3>
                    <p className={styles.tagline}>{tg('tagline')}</p>
                  </header>

                  <ul className={styles.features}>
                    {features.map((feature, i) => (
                      <li key={i} className={styles.feature}>
                        <span className={styles.featureDot} aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={styles.prices}>
                    <PricePill
                      label={t('monthly')}
                      oldValue={tg('priceMonthlyOld')}
                      newValue={tg('priceMonthlyNew')}
                      suffix={t('perMonth')}
                    />
                    <PricePill
                      label={t('annual')}
                      oldValue={tg('priceAnnualOld')}
                      newValue={tg('priceAnnualNew')}
                      suffix={t('perMonth')}
                    />
                  </div>

                  <div className={styles.ctaWrap}>
                    <PricingCta label={t('cta')} variant={tier.key} />
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricePill({
  label,
  oldValue,
  newValue,
  suffix,
}: {
  label: string;
  oldValue: string;
  newValue: string;
  suffix: string;
}) {
  return (
    <div className={styles.pricePillWrap}>
      <span className={styles.priceLabel}>{label}</span>
      <span className={styles.pricePill}>
        <span className={styles.priceOld}>
          {oldValue}
          {suffix}
        </span>
        <span className={styles.priceNew}>
          {newValue}
          {suffix}
        </span>
      </span>
    </div>
  );
}
