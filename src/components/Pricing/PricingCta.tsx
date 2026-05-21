'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ContactModal } from '@/components/ContactModal/ContactModal';
import { tap } from '@/lib/haptics';
import styles from './Pricing.module.css';

type Variant = 'classic' | 'comfort' | 'max';

export function PricingCta({ label, variant }: { label: string; variant: Variant }) {
  const [open, setOpen] = useState(false);
  const className = `${styles.cta} ${styles[`cta_${variant}`]}`;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          tap();
          setOpen(true);
        }}
      >
        <span>{label}</span>
        <ArrowRight size={16} aria-hidden="true" className={styles.ctaArrow} />
      </button>
      {open ? <ContactModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
