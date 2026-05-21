'use client';

import { Apple, Globe, Play } from 'lucide-react';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { tap } from '@/lib/haptics';
import styles from './Hero.module.css';

const ICONS = {
  appStore: Apple,
  googlePlay: Play,
  webApp: Globe,
  telegram: TelegramIcon,
} as const;

export type HeroCtaIconKey = keyof typeof ICONS;

type Props = {
  href: string | undefined;
  ariaLabel: string;
  small: string;
  label: string;
  iconKey: HeroCtaIconKey;
};

export function HeroCta({ href, ariaLabel, small, label, iconKey }: Props) {
  const Icon = ICONS[iconKey];
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
