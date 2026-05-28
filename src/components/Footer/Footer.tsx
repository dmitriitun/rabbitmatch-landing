'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { EditableText } from '@/components/EditableText/EditableText';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import { tap } from '@/lib/haptics';
import styles from './Footer.module.css';

type SocialLink = {
  key: 'instagram' | 'tiktok' | 'facebook' | 'telegram';
  href: string | undefined;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

type NavLink = {
  id: 'products' | 'clubs' | 'organizers' | 'playersNav' | 'contact';
  target: string;
};

const NAV: NavLink[] = [
  { id: 'products', target: 'features' },
  { id: 'clubs', target: 'crm' },
  { id: 'organizers', target: 'organizers' },
  { id: 'playersNav', target: 'players' },
  { id: 'contact', target: 'contact' },
];

type LegalLink = {
  key: 'terms' | 'privacy' | 'cookies' | 'eula' | 'subscription' | 'refund' | 'booking';
  slug: string;
};

const LEGAL: LegalLink[] = [
  { key: 'terms', slug: 'terms' },
  { key: 'privacy', slug: 'privacy' },
  { key: 'cookies', slug: 'cookies' },
  { key: 'eula', slug: 'eula' },
  { key: 'subscription', slug: 'subscription' },
  { key: 'refund', slug: 'refund' },
  { key: 'booking', slug: 'booking' },
];

export function Footer() {
  const tFooter = useTranslations('footer');
  const tNav = useTranslations('nav');

  const socials: SocialLink[] = [
    { key: 'instagram', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL, Icon: InstagramIcon },
    { key: 'tiktok', href: process.env.NEXT_PUBLIC_TIKTOK_URL, Icon: TikTokIcon },
    { key: 'facebook', href: process.env.NEXT_PUBLIC_FACEBOOK_URL, Icon: FacebookIcon },
    { key: 'telegram', href: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL, Icon: TelegramIcon },
  ];

  const scrollTo = useCallback((id: string) => {
    tap();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <a
              href="#hero"
              className={styles.brand}
              onClick={(e) => {
                e.preventDefault();
                scrollTo('hero');
              }}
              aria-label={tNav('logoAlt')}
            >
              <Image
                src="/images/logo.png"
                alt={tNav('logoAlt')}
                width={36}
                height={36}
                className={styles.logo}
              />
              <span className={styles.brandText}>RabbitMatch</span>
            </a>
            <EditableText tKey="footer.tagline" as="p" multiline className={styles.tagline} />

            <ul className={styles.socials} aria-label={tFooter('socialTitle')}>
              {socials.map(({ key, href, Icon }) =>
                href ? (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.social}
                      aria-label={tFooter(key)}
                      onClick={() => tap()}
                    >
                      <Icon size={18} />
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          </div>

          <div className={styles.linksCol}>
            <EditableText tKey="footer.navTitle" as="h3" className={styles.colTitle} />
            <ul className={styles.linkList}>
              {NAV.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(link.target)}
                    className={styles.linkBtn}
                  >
                    {tNav(link.id)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.linksCol}>
            <EditableText tKey="footer.legalTitle" as="h3" className={styles.colTitle} />
            <ul className={styles.linkList}>
              {LEGAL.map((link) => (
                <li key={link.key}>
                  <Link href={`/legal/${link.slug}`} className={styles.linkBtn} onClick={() => tap()}>
                    <EditableText tKey={`footer.${link.key}`} as="span" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>© {year} RabbitMatch. {tFooter('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
