'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { tap } from '@/lib/haptics';
import styles from './CookieConsent.module.css';

const CONSENT_COOKIE = 'rm_cookie_consent';

function hasConsent(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith(`${CONSENT_COOKIE}=`));
}

// Cookies don't emit change events; nothing to subscribe to.
function subscribe(): () => void {
  return () => {};
}

export function CookieConsent() {
  const t = useTranslations('cookieBanner');
  // Hydration-safe read of the consent cookie: render nothing on the server,
  // then re-render on the client with the real cookie state.
  const consented = useSyncExternalStore(subscribe, hasConsent, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const choose = async (choice: 'all' | 'rejected') => {
    if (submitting) return;
    tap();
    setSubmitting(true);
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      if (res.ok) {
        setDismissed(true);
      } else {
        setSubmitting(false);
      }
    } catch {
      setSubmitting(false);
    }
  };

  if (consented || dismissed) return null;

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label={t('message')}>
      <div className={styles.inner}>
        <p className={styles.text}>
          {t('message')}{' '}
          <Link href="/legal/cookies" className={styles.link}>
            {t('policyLink')}
          </Link>
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.reject}
            onClick={() => void choose('rejected')}
            disabled={submitting}
          >
            {t('reject')}
          </button>
          <button
            type="button"
            className={styles.accept}
            onClick={() => void choose('all')}
            disabled={submitting}
          >
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
