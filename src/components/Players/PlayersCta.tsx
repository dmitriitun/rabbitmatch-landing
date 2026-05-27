'use client';

import { ArrowRight } from 'lucide-react';
import { tap } from '@/lib/haptics';
import styles from './Players.module.css';

export function PlayersCta({ label }: { label: string }) {
  const scrollToContact = () => {
    tap();
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <button type="button" onClick={scrollToContact} className={styles.cta}>
      <span>{label}</span>
      <ArrowRight size={18} aria-hidden="true" className={styles.ctaArrow} />
    </button>
  );
}
