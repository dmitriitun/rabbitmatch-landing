'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/config';
import { tap } from '@/lib/haptics';
import styles from './LanguageSwitcher.module.css';

/**
 * Switching language is now a navigation, not a cookie write plus a refresh:
 * `/en/players` ↔ `/ru/players`. `usePathname` from `@/i18n/navigation`
 * returns the path *without* the locale prefix, so the same call works from
 * any page. next-intl still persists the choice in `NEXT_LOCALE` so a later
 * visit to `/` lands on the right side.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setLang = (next: Locale) => {
    if (next === locale) return;
    tap();
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div
      className={`${styles.switch} ${compact ? styles.compact : ''}`}
      role="group"
      aria-label={t('switchLanguage')}
    >
      {locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            disabled={pending && !active}
            className={`${styles.option} ${active ? styles.active : ''}`}
          >
            {code === 'en' ? t('languageEn') : t('languageRu')}
          </button>
        );
      })}
    </div>
  );
}
