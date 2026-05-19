'use client';

import { tap } from '@/lib/haptics';
import styles from './Hero.module.css';

type Props = {
  href: string | undefined;
  ariaLabel: string;
  small: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

export function HeroCta({ href, ariaLabel, small, label, Icon }: Props) {
  const disabled = !href;
  const className = `${styles.appBtn} ${disabled ? styles.appBtnDisabled : ''}`;

  const content = (
    <>
      <Icon size={22} className={styles.appBtnIcon} />
      <span className={styles.appBtnText}>
        <span className={styles.appBtnSmall}>{small}</span>
        <span className={styles.appBtnLabel}>{label}</span>
      </span>
    </>
  );

  if (disabled) {
    return (
      <span className={className} aria-label={ariaLabel} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={() => tap()}
      className={className}
    >
      {content}
    </a>
  );
}
