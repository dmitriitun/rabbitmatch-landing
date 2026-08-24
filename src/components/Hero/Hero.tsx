import { getTranslations } from 'next-intl/server';
import { AppBadges, StatStrip } from '@/components/blocks';
import { EditableText } from '@/components/EditableText/EditableText';
import styles from './Hero.module.css';

/**
 * The home page `<h1>`.
 *
 * Everything decorative from the previous version — two blurred colour blobs,
 * an interactive canvas starfield, gradient-filled headline text, frosted
 * stat cards — is gone. Those cost paint time on exactly the devices most
 * visitors arrive on, and they are the visual signature of a generated
 * landing page. What is left is type, a clear action, and four facts.
 */
export async function Hero() {
  const t = await getTranslations('hero');

  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <EditableText tKey="hero.eyebrow" as="p" className={styles.eyebrow} />

        <h1 id="hero-title" className={styles.title} data-rm-key="hero.title">
          {t('title')}
        </h1>

        <EditableText tKey="hero.subtitle" as="p" multiline className={styles.subtitle} />

        <div className={styles.actions}>
          <AppBadges />
        </div>

        <div className={styles.stats}>
          <StatStrip itemsKey="hero.stats" />
        </div>
      </div>
    </section>
  );
}
