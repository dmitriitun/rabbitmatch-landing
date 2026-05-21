'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader, Lock, Mail, X } from 'lucide-react';
import { useAuth } from '@/components/Providers/AuthProvider';
import { tap } from '@/lib/haptics';
import styles from './LoginModal.module.css';

type Props = {
  onClose: () => void;
};

export function LoginModal({ onClose }: Props) {
  const t = useTranslations('login');
  const { setUser } = useAuth();
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    tap();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(t('error'));
        setSubmitting(false);
        return;
      }
      const data = (await res.json()) as { user?: { email: string; isAdmin: boolean } };
      if (data.user) {
        setUser({ email: data.user.email, isAdmin: data.user.isAdmin });
      }
      onClose();
      router.refresh();
    } catch {
      setError(t('error'));
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button
          type="button"
          onClick={onClose}
          className={styles.close}
          aria-label={t('close')}
        >
          <X size={18} />
        </button>

        <div className={styles.head}>
          <h2 id="login-title" className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>{t('email')}</span>
            <span className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} aria-hidden="true" />
              <input
                ref={firstFieldRef}
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('password')}</span>
            <span className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} aria-hidden="true" />
              <input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                required
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
            </span>
          </label>

          {error ? <div className={styles.errorBox}>{error}</div> : null}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader size={16} className={styles.spinner} aria-hidden="true" />
                <span>{t('submitting')}</span>
              </>
            ) : (
              t('submit')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
