'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ContactModal } from '@/components/ContactModal/ContactModal';
import { tap } from '@/lib/haptics';
import styles from './Players.module.css';

export function PlayersCta({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          tap();
          setOpen(true);
        }}
        className={styles.cta}
      >
        <span>{label}</span>
        <ArrowRight size={18} aria-hidden="true" className={styles.ctaArrow} />
      </button>
      {open ? <ContactModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
