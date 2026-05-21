import { Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EditableText } from '@/components/EditableText/EditableText';
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
          <EditableText tKey="pricing.title" as="h2" className={styles.title} />
        </ScrollReveal>

        <div className={styles.grid}>
          {TIERS.map((tier, idx) => {
            const tg = (k: string) => t(`${tier.key}.${k}`);
            const featureKeys = Array.from(
              { length: tier.featureCount },
              (_, i) => ({ key: `feature${i + 1}`, value: tg(`feature${i + 1}`) }),
            ).filter((f) => Boolean(f.value));

            return (
              <ScrollReveal
                key={tier.key}
                delayMs={150 + idx * 120}
                className={`${styles.cardWrap} ${tier.key === 'comfort' ? styles.cardWrapPopular : ''}`}
              >
                <article className={`${styles.card} ${styles[`card_${tier.key}`]}`}>
                  {tier.badge === 'popular' ? (
                    <EditableText
                      tKey="pricing.badgePopular"
                      as="span"
                      className={styles.badgePopular}
                    />
                  ) : null}
                  {tier.badge === 'ai' ? (
                    <span className={styles.badgeAi}>
                      <Sparkles size={12} aria-hidden="true" />
                      <EditableText tKey="pricing.badgeAi" as="span" />
                    </span>
                  ) : null}

                  <header className={styles.cardHead}>
                    <EditableText
                      tKey={`pricing.${tier.key}.name`}
                      as="h3"
                      className={`${styles.name} ${styles[`name_${tier.key}`]}`}
                    />
                    <EditableText
                      tKey={`pricing.${tier.key}.tagline`}
                      as="p"
                      multiline
                      className={styles.tagline}
                    />
                  </header>

                  <ul className={styles.features}>
                    {featureKeys.map((feature) => (
                      <li key={feature.key} className={styles.feature}>
                        <span className={styles.featureDot} aria-hidden="true" />
                        <EditableText tKey={`pricing.${tier.key}.${feature.key}`} as="span" />
                      </li>
                    ))}
                  </ul>

                  <div className={styles.prices}>
                    <PricePill
                      labelKey="pricing.monthly"
                      oldKey={`pricing.${tier.key}.priceMonthlyOld`}
                      newKey={`pricing.${tier.key}.priceMonthlyNew`}
                      suffixKey="pricing.perMonth"
                    />
                    <PricePill
                      labelKey="pricing.annual"
                      oldKey={`pricing.${tier.key}.priceAnnualOld`}
                      newKey={`pricing.${tier.key}.priceAnnualNew`}
                      suffixKey="pricing.perMonth"
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
  labelKey,
  oldKey,
  newKey,
  suffixKey,
}: {
  labelKey: string;
  oldKey: string;
  newKey: string;
  suffixKey: string;
}) {
  return (
    <div className={styles.pricePillWrap}>
      <EditableText tKey={labelKey} as="span" className={styles.priceLabel} />
      <span className={styles.pricePill}>
        <span className={styles.priceOld}>
          <EditableText tKey={oldKey} as="span" />
          <EditableText tKey={suffixKey} as="span" />
        </span>
        <span className={styles.priceNew}>
          <EditableText tKey={newKey} as="span" />
          <EditableText tKey={suffixKey} as="span" />
        </span>
      </span>
    </div>
  );
}
