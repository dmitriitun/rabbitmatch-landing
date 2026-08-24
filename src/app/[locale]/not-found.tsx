import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import styles from './not-found.module.css';

/**
 * 404 inside the locale tree. Because it lives under `[locale]`, it renders
 * within that layout and keeps the header, footer and styling — a visitor who
 * lands on a stale URL gets a way back rather than an unstyled dead end.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations('notFound');

  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.lead}>{t('lead')}</p>

      <div className={styles.actions}>
        <Link href="/" className="rm-btn rm-btn--primary">
          {t('home')}
        </Link>
        <Link href="/faq" className="rm-btn rm-btn--ghost">
          {t('faq')}
        </Link>
      </div>
    </main>
  );
}
