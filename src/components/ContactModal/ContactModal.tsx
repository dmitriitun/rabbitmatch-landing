'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Building2, CheckCircle2, Loader, Mail, MessageCircle, Send, User, X } from 'lucide-react';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { tap } from '@/lib/haptics';
import styles from './ContactModal.module.css';

type Props = {
  onClose: () => void;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

function buildTelegramUrl(handle: string | undefined): string | null {
  if (!handle) return null;
  if (/^https?:\/\//i.test(handle)) return handle;
  const clean = handle.replace(/^@/, '');
  if (!clean) return null;
  return `https://t.me/${clean}`;
}

function buildMailUrl(email: string | undefined): string | null {
  if (!email) return null;
  return `mailto:${email}`;
}

type FieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  type?: string;
  autoComplete?: string;
  required?: boolean;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, placeholder, value, onChange, Icon, type = 'text', autoComplete, required },
  ref,
) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrap}>
        <Icon size={16} className={styles.inputIcon} />
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={styles.input}
        />
      </span>
    </label>
  );
});

export function ContactModal({ onClose }: Props) {
  const t = useTranslations('contactModal');
  const locale = useLocale();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [club, setClub] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const tgHandle = process.env.NEXT_PUBLIC_CONTACT_TELEGRAM;
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const tgUrl = buildTelegramUrl(tgHandle);
  const mailUrl = buildMailUrl(contactEmail);

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
    if (status === 'submitting') return;
    tap();
    setStatus('submitting');

    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        message: [club.trim() ? `[${club.trim()}]` : '', message.trim()].filter(Boolean).join('\n\n'),
        locale,
        source: 'players-section',
      };
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
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
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
      >
        <button type="button" onClick={onClose} className={styles.close} aria-label={t('close')}>
          <X size={18} />
        </button>

        <div className={styles.head}>
          <h2 id="contact-title" className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        {status === 'success' ? (
          <div className={styles.successBox} role="status">
            <CheckCircle2 size={28} className={styles.successIcon} />
            <p>{t('success')}</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            <div className={styles.row}>
              <Field
                ref={firstFieldRef}
                label={t('name')}
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={setName}
                Icon={User}
                autoComplete="name"
                required
              />
              <Field
                label={t('email')}
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={setEmail}
                Icon={Mail}
                type="email"
                autoComplete="email"
                required
              />
            </div>

            <Field
              label={t('club')}
              placeholder={t('clubPlaceholder')}
              value={club}
              onChange={setClub}
              Icon={Building2}
              autoComplete="organization"
            />

            <label className={styles.field}>
              <span className={styles.label}>{t('message')}</span>
              <span className={styles.textareaWrap}>
                <MessageCircle size={16} className={styles.inputIcon} />
                <textarea
                  className={styles.textarea}
                  placeholder={t('messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </span>
            </label>

            {status === 'error' ? <div className={styles.errorBox}>{t('error')}</div> : null}

            <button type="submit" className={styles.submit} disabled={status === 'submitting'}>
              {status === 'submitting' ? (
                <>
                  <Loader size={16} className={styles.spinner} aria-hidden="true" />
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <>
                  <Send size={16} aria-hidden="true" />
                  <span>{t('submit')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {tgUrl || mailUrl ? (
          <div className={styles.direct}>
            <p className={styles.directTitle}>{t('directTitle')}</p>
            <div className={styles.directRow}>
              {tgUrl ? (
                <a
                  href={tgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.directLink}
                  onClick={() => tap()}
                >
                  <TelegramIcon size={16} />
                  <span className={styles.directText}>
                    <span className={styles.directLabel}>{t('directTelegram')}</span>
                    <span className={styles.directValue}>{tgHandle}</span>
                  </span>
                </a>
              ) : null}
              {mailUrl ? (
                <a href={mailUrl} className={styles.directLink} onClick={() => tap()}>
                  <Mail size={16} />
                  <span className={styles.directText}>
                    <span className={styles.directLabel}>{t('directEmail')}</span>
                    <span className={styles.directValue}>{contactEmail}</span>
                  </span>
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
