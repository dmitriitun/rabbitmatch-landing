'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from '@/i18n/navigation';
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
  const bannerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Publish the banner's height as `--rm-bottom-inset` so anything else
   * anchored to the bottom of the viewport — currently the chat launcher —
   * sits above it instead of on top of the "Accept" button. Measured rather
   * than hard-coded because the banner is one line on a desktop and four on a
   * narrow phone.
   *
   * Measured with `getBoundingClientRect` on a `resize` listener rather than
   * with a `ResizeObserver`: RO callbacks are delivered on a frame boundary,
   * so in a background or non-compositing tab the first callback can be
   * delayed indefinitely and the launcher would stay under the banner.
   */
  useEffect(() => {
    const node = bannerRef.current;
    const root = document.documentElement;
    if (!node) {
      root.style.removeProperty('--rm-bottom-inset');
      return;
    }

    const measure = () => {
      root.style.setProperty(
        '--rm-bottom-inset',
        `${Math.round(node.getBoundingClientRect().height)}px`,
      );
    };

    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--rm-bottom-inset');
    };
  }, [consented, dismissed]);

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
    <div
      ref={bannerRef}
      className={styles.banner}
      role="dialog"
      aria-live="polite"
      aria-label={t('message')}
    >
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
