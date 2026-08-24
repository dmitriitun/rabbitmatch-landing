import { Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EditableText } from '@/components/EditableText/EditableText';
import { PricingCta } from './PricingCta';
import styles from './Pricing.module.css';

type TierKey = 'classic' | 'comfort' | 'max';

const TIERS: ReadonlyArray<{ key: TierKey; featureCount: number; badge: 'popular' | 'ai' | null }> = [
  { key: 'classic', featureCount: 6, badge: null },
  { key: 'comfort', featureCount: 7, badge: 'popular' },
  { key: 'max', featureCount: 7, badge: 'ai' },
];

/**
 * The plan cards.
 *
 * `bare` drops the section wrapper and the heading: on the pricing page the
 * block already sits inside a `Section` with its own `SectionHead`, and two
 * nested sections meant two h2 over one block and two lots of section padding
 * stacked between them.
 */
export async function Pricing({
  headingId,
  bare = false,
}: { headingId?: string; bare?: boolean } = {}) {
  const t = await getTranslations('pricing');

  const grid = (
        <div className={styles.grid}>
          {TIERS.map((tier) => {
            const tg = (k: string) => t(`${tier.key}.${k}`);
            const featureKeys = Array.from({ length: tier.featureCount }, (_, i) => ({
              key: `feature${i + 1}`,
              value: tg(`feature${i + 1}`),
            })).filter((f) => Boolean(f.value));

            return (
              <article
                key={tier.key}
                className={`${styles.card} ${tier.key === 'comfort' ? styles.cardPopular : ''}`}
              >
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
                    className={styles.name}
                  />
                  <EditableText
                    tKey={`pricing.${tier.key}.tagline`}
                    as="p"
                    multiline
                    className={styles.tagline}
                  />
                </header>

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

                <ul className={styles.features}>
                  {featureKeys.map((feature) => (
                    <li key={feature.key} className={styles.feature}>
                      <span className={styles.featureDot} aria-hidden="true" />
                      <EditableText tKey={`pricing.${tier.key}.${feature.key}`} as="span" />
                    </li>
                  ))}
                </ul>

                <div className={styles.ctaWrap}>
                  <PricingCta label={t('cta')} variant={tier.key} />
                </div>
              </article>
            );
          })}
        </div>
  );

  if (bare) return grid;

  return (
    <section id="pricing" className={styles.section} aria-labelledby={headingId}>
      <div className={styles.container}>
        <EditableText tKey="pricing.title" as="h2" className={styles.title} />
        {grid}
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
