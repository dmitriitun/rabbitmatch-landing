'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { tap } from '@/lib/haptics';
import styles from './LanguageSwitcher.module.css';

type LangCode = 'en' | 'ru';

const ORDER: LangCode[] = ['en', 'ru'];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale() as LangCode;
  const t = useTranslations('nav');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setLang = (next: LangCode) => {
    if (next === locale) return;
    tap();
    startTransition(async () => {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  };

  return (
    <div
      className={`${styles.switch} ${compact ? styles.compact : ''}`}
      role="group"
      aria-label={t('switchLanguage')}
    >
      {ORDER.map((code) => {
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
