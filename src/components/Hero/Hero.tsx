import { Apple, Globe, Play } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { AnimatedCounter } from '@/components/AnimatedCounter/AnimatedCounter';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { HeroCta } from './HeroCta';
import styles from './Hero.module.css';

type AppLink = {
  key: 'appStore' | 'googlePlay' | 'webApp' | 'telegram';
  href: string | undefined;
  small: 'downloadOn' | 'getItOn' | 'openIn';
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

export async function Hero() {
  const t = await getTranslations('hero');

  const appLinks: AppLink[] = [
    {
      key: 'appStore',
      href: process.env.NEXT_PUBLIC_IOS_URL,
      small: 'downloadOn',
      Icon: Apple,
    },
    {
      key: 'googlePlay',
      href: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL,
      small: 'getItOn',
      Icon: Play,
    },
    {
      key: 'webApp',
      href: process.env.NEXT_PUBLIC_APP_URL,
      small: 'openIn',
      Icon: Globe,
    },
    {
      key: 'telegram',
      href: process.env.NEXT_PUBLIC_TELEGRAM_APP_URL,
      small: 'openIn',
      Icon: TelegramIcon,
    },
  ];

  const stats: Array<{ value: string; label: string }> = [
    { value: t('stats.sportsValue'), label: t('stats.sportsLabel') },
    { value: t('stats.languagesValue'), label: t('stats.languagesLabel') },
    { value: t('stats.aiValue'), label: t('stats.aiLabel') },
    { value: t('stats.platformsValue'), label: t('stats.platformsLabel') },
  ];

  return (
    <section id="hero" className={styles.hero} aria-label={t('title')}>
      <div className={styles.blobs} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobLime}`} />
        <span className={`${styles.blob} ${styles.blobPurple}`} />
      </div>
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.inner}>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>

        <div className={styles.appButtons}>
          {appLinks.map(({ key, href, small, Icon }) => (
            <HeroCta
              key={key}
              href={href}
              ariaLabel={`${t(small)} ${t(key)}`}
              small={t(small)}
              label={t(key)}
              Icon={Icon}
            />
          ))}
        </div>

        <ul className={styles.stats}>
          {stats.map((stat) => (
            <li key={stat.label} className={styles.statItem}>
              <span className={styles.statValue}>
                <AnimatedCounter value={stat.value} />
              </span>
              <span className={styles.statLabel}>{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
