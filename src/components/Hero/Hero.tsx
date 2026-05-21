import { getTranslations } from 'next-intl/server';
import { AnimatedCounter } from '@/components/AnimatedCounter/AnimatedCounter';
import { EditableText } from '@/components/EditableText/EditableText';
import { HeroCta, type HeroCtaIconKey } from './HeroCta';
import styles from './Hero.module.css';

type AppLink = {
  key: HeroCtaIconKey;
  href: string | undefined;
  small: 'downloadOn' | 'getItOn' | 'openIn';
};

export async function Hero() {
  const t = await getTranslations('hero');

  const appLinks: AppLink[] = [
    {
      key: 'appStore',
      href: process.env.NEXT_PUBLIC_IOS_URL,
      small: 'downloadOn',
    },
    {
      key: 'googlePlay',
      href: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL,
      small: 'getItOn',
    },
    {
      key: 'webApp',
      href: process.env.NEXT_PUBLIC_APP_URL,
      small: 'openIn',
    },
    {
      key: 'telegram',
      href: process.env.NEXT_PUBLIC_TELEGRAM_APP_URL,
      small: 'openIn',
    },
  ];

  const stats: Array<{ valueKey: string; labelKey: string; rawValue: string }> = [
    { valueKey: 'hero.stats.sportsValue', labelKey: 'hero.stats.sportsLabel', rawValue: t('stats.sportsValue') },
    { valueKey: 'hero.stats.languagesValue', labelKey: 'hero.stats.languagesLabel', rawValue: t('stats.languagesValue') },
    { valueKey: 'hero.stats.aiValue', labelKey: 'hero.stats.aiLabel', rawValue: t('stats.aiValue') },
    { valueKey: 'hero.stats.platformsValue', labelKey: 'hero.stats.platformsLabel', rawValue: t('stats.platformsValue') },
  ];

  return (
    <section id="hero" className={styles.hero} aria-label={t('title')}>
      <div className={styles.blobs} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobLime}`} />
        <span className={`${styles.blob} ${styles.blobPurple}`} />
      </div>
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.inner}>
        <EditableText tKey="hero.eyebrow" as="p" className={styles.eyebrow} />
        <EditableText tKey="hero.title" as="h1" className={styles.title} />
        <EditableText tKey="hero.subtitle" as="p" multiline className={styles.subtitle} />

        <div className={styles.appButtons}>
          {appLinks.map(({ key, href, small }) => (
            <HeroCta
              key={key}
              href={href}
              ariaLabel={`${t(small)} ${t(key)}`}
              small={t(small)}
              label={t(key)}
              iconKey={key}
            />
          ))}
        </div>

        <ul className={styles.stats}>
          {stats.map((stat) => (
            <li key={stat.labelKey} className={styles.statItem}>
              <span className={styles.statValue}>
                <AnimatedCounter value={stat.rawValue} />
              </span>
              <EditableText tKey={stat.labelKey} as="span" className={styles.statLabel} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
