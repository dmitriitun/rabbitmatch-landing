import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal/ScrollReveal';
import { CrmMockup } from './CrmMockup';
import styles from './Solution.module.css';

type Item = { num: '01' | '02' | '03'; titleKey: string; bodyKey: string };

const ITEMS: Item[] = [
  { num: '01', titleKey: 'items.01title', bodyKey: 'items.01body' },
  { num: '02', titleKey: 'items.02title', bodyKey: 'items.02body' },
  { num: '03', titleKey: 'items.03title', bodyKey: 'items.03body' },
];

export async function Solution() {
  const t = await getTranslations('solution');

  return (
    <section id="features" className={styles.section} aria-label={t('eyebrow')}>
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.col}>
            <ScrollReveal>
              <p className={styles.eyebrow}>{t('eyebrow')}</p>
            </ScrollReveal>

            <ScrollReveal delayMs={80}>
              <p className={styles.lead}>{t('lead')}</p>
            </ScrollReveal>

            <ScrollReveal delayMs={140}>
              <p className={styles.platform}>{t('platform')}</p>
            </ScrollReveal>

            <ul className={styles.items}>
              {ITEMS.map((item, idx) => (
                <ScrollReveal key={item.num} delayMs={220 + idx * 100} as="li" className={styles.itemWrap}>
                  <div className={styles.item}>
                    <span className={styles.itemNum} aria-hidden="true">
                      {item.num}
                    </span>
                    <div className={styles.itemBody}>
                      <h3 className={styles.itemTitle}>{t(item.titleKey)}</h3>
                      <p className={styles.itemText}>{t(item.bodyKey)}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <ScrollReveal delayMs={120} className={styles.phoneWrap}>
              <div className={styles.phoneGlow} aria-hidden="true" />
              <Image
                src="/images/phone-courts.png"
                alt={t('mockupPhoneAlt')}
                width={720}
                height={1280}
                className={styles.phoneImg}
                sizes="(max-width: 900px) 80vw, 360px"
                priority={false}
              />
            </ScrollReveal>

            <ScrollReveal delayMs={260} className={styles.crmWrap}>
              <CrmMockup ariaLabel={t('mockupCrmAlt')} />
            </ScrollReveal>

            <ScrollReveal delayMs={420} className={styles.aiBadge}>
              <span className={styles.aiGlow} aria-hidden="true" />
              <Sparkles size={16} className={styles.aiIcon} aria-hidden="true" />
              <span className={styles.aiText}>{t('aiHighlight')}</span>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
