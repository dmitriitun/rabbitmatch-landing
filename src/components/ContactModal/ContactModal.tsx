'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { ContactForm } from '@/components/ContactForm/ContactForm';
import styles from './ContactModal.module.css';

type Props = {
  onClose: () => void;
  source?: string;
};

export function ContactModal({ onClose, source = 'modal' }: Props) {
  const t = useTranslations('contact');
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
        aria-labelledby="contact-modal-title"
      >
        <button type="button" onClick={onClose} className={styles.close} aria-label="Close">
          <X size={18} />
        </button>

        <div className={styles.head}>
          <h2 id="contact-modal-title" className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('lead')}</p>
        </div>

        <ContactForm source={source} variant="light" firstFieldRef={firstFieldRef} />
      </div>
    </div>
  );
}
