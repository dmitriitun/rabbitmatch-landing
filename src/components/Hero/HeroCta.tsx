'use client';

import Image from 'next/image';
import { Globe, Play } from 'lucide-react';
import type { ComponentType } from 'react';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { tap } from '@/lib/haptics';
import styles from './Hero.module.css';

type LucideLikeIcon = ComponentType<{ size?: number; className?: string }>;

const LUCIDE_ICONS: Record<'googlePlay' | 'webApp' | 'telegram', LucideLikeIcon> = {
  googlePlay: Play,
  webApp: Globe,
  telegram: TelegramIcon,
};

export type HeroCtaIconKey = 'appStore' | keyof typeof LUCIDE_ICONS;

type Props = {
  href: string | undefined;
  ariaLabel: string;
  small: string;
  label: string;
  iconKey: HeroCtaIconKey;
};

function CtaIcon({ iconKey }: { iconKey: HeroCtaIconKey }) {
  if (iconKey === 'appStore') {
    return (
      <Image
        src="/icons/apple-logo-white.svg"
        alt=""
        width={22}
        height={22}
        aria-hidden="true"
        className={styles.appBtnIcon}
      />
    );
  }
  const Icon = LUCIDE_ICONS[iconKey];
  return <Icon size={22} className={styles.appBtnIcon} />;
}

export function HeroCta({ href, ariaLabel, small, label, iconKey }: Props) {
  const disabled = !href;
  const className = `${styles.appBtn} ${disabled ? styles.appBtnDisabled : ''}`;

  const content = (
    <>
      <CtaIcon iconKey={iconKey} />
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
