'use client';

import { forwardRef, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Building2, CheckCircle2, Loader, Mail, MessageCircle, Send, User } from 'lucide-react';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { tap } from '@/lib/haptics';
import styles from './ContactForm.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

type Props = {
  source: string;
  autoFocusFirst?: boolean;
  variant?: 'light' | 'dark';
  firstFieldRef?: React.Ref<HTMLInputElement>;
  showDirect?: boolean;
};

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

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
  error?: string;
  id: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { id, label, placeholder, value, onChange, Icon, type = 'text', autoComplete, required, error },
  ref,
) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrap}>
        <Icon size={16} className={styles.inputIcon} />
        <input
          id={id}
          ref={ref}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
        />
      </span>
      {error ? (
        <span id={`${id}-error`} className={styles.fieldError}>
          {error}
        </span>
      ) : null}
    </label>
  );
});

export function ContactForm({
  source,
  variant = 'dark',
  firstFieldRef,
  showDirect = true,
}: Props) {
  const t = useTranslations('contact');
  const locale = useLocale();

  const baseId = useId();
  const fieldId = (name: string) => `${baseId}-${name}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [club, setClub] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');

  const tgHandle = process.env.NEXT_PUBLIC_CONTACT_TELEGRAM;
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const tgUrl = buildTelegramUrl(tgHandle);
  const mailUrl = buildMailUrl(contactEmail);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = t('required');
    if (!email.trim()) {
      next.email = t('required');
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = t('invalidEmail');
    }
    if (!message.trim()) next.message = t('required');
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    tap();
    setStatus('submitting');

    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        message: [club.trim() ? `[${club.trim()}]` : '', message.trim()].filter(Boolean).join('\n\n'),
        locale,
        source,
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

  if (status === 'success') {
    return (
      <div className={`${styles.shell} ${styles[`shell_${variant}`]}`}>
        <div className={styles.successBox} role="status" aria-live="polite">
          <span className={styles.successIconRing}>
            <CheckCircle2 size={32} className={styles.successIcon} />
          </span>
          <p className={styles.successText}>{t('success')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.shell} ${styles[`shell_${variant}`]}`}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <Field
            ref={firstFieldRef}
            id={fieldId('name')}
            label={t('name')}
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(v) => {
              setName(v);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            Icon={User}
            autoComplete="name"
            required
            error={errors.name}
          />
          <Field
            id={fieldId('email')}
            label={t('email')}
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(v) => {
              setEmail(v);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            Icon={Mail}
            type="email"
            autoComplete="email"
            required
            error={errors.email}
          />
        </div>

        <Field
          id={fieldId('club')}
          label={t('club')}
          placeholder={t('clubPlaceholder')}
          value={club}
          onChange={setClub}
          Icon={Building2}
          autoComplete="organization"
        />

        <label className={styles.field} htmlFor={fieldId('message')}>
          <span className={styles.label}>{t('message')}</span>
          <span className={styles.textareaWrap}>
            <MessageCircle size={16} className={styles.inputIcon} />
            <textarea
              id={fieldId('message')}
              className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
              placeholder={t('messagePlaceholder')}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) setErrors({ ...errors, message: undefined });
              }}
              rows={4}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={errors.message ? `${fieldId('message')}-error` : undefined}
            />
          </span>
          {errors.message ? (
            <span id={`${fieldId('message')}-error`} className={styles.fieldError}>
              {errors.message}
            </span>
          ) : null}
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

      {showDirect && (tgUrl || mailUrl) ? (
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
  );
}
