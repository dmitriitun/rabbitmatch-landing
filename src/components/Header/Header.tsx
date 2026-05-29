'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogIn, Menu, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { LoginModal } from '@/components/LoginModal/LoginModal';
import { useAuth } from '@/components/Providers/AuthProvider';
import { tap } from '@/lib/haptics';
import styles from './Header.module.css';
import { UserMenu } from './UserMenu';

type NavLinkId = 'products' | 'clubs' | 'organizers' | 'playersNav' | 'contact';
type NavLink = { id: NavLinkId; target: string };

const LINKS: NavLink[] = [
  { id: 'products', target: 'features' },
  { id: 'clubs', target: 'crm' },
  { id: 'organizers', target: 'organizers' },
  { id: 'playersNav', target: 'players' },
  { id: 'contact', target: 'contact' },
];

export function Header() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const scrollTo = useCallback(
    (id: string) => {
      tap();
      setMenuOpen(false);
      // Sections only exist on the home page. From any other route (e.g. a
      // /legal/* page) navigate home with the target hash and let the App
      // Router scroll to it.
      if (pathname !== '/') {
        router.push(`/#${id}`);
        return;
      }
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [pathname, router],
  );

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          <a
            href="#hero"
            className={styles.brand}
            onClick={(e) => {
              e.preventDefault();
              scrollTo('hero');
            }}
            aria-label={t('logoAlt')}
          >
            <Image
              src="/images/logo.png"
              alt={t('logoAlt')}
              width={36}
              height={36}
              priority
              className={styles.logo}
            />
            <span className={styles.brandText}>RabbitMatch</span>
          </a>

          <nav className={styles.nav} aria-label="primary">
            {LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollTo(link.target)}
                className={styles.navLink}
              >
                {t(link.id)}
              </button>
            ))}
          </nav>

          <div className={styles.actions}>
            <LanguageSwitcher compact />

            {user ? (
              <UserMenu email={user.email} />
            ) : (
              <button
                type="button"
                onClick={() => {
                  tap();
                  setLoginOpen(true);
                }}
                className={styles.loginBtn}
                aria-label={t('login')}
              >
                <LogIn size={16} aria-hidden="true" />
                <span className={styles.loginLabel}>{t('login')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => scrollTo('contact')}
              className={styles.cta}
            >
              {t('getStarted')}
            </button>

            <button
              type="button"
              onClick={() => {
                tap();
                setMenuOpen((v) => !v);
              }}
              className={styles.hamburger}
              aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`${styles.mobile} ${menuOpen ? styles.mobileOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav className={styles.mobileNav} aria-label="mobile primary">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollTo(link.target)}
              className={styles.mobileLink}
            >
              {t(link.id)}
            </button>
          ))}
        </nav>
        <div className={styles.mobileFooter}>
          <LanguageSwitcher />
          {user ? (
            <UserMenu email={user.email} />
          ) : (
            <button
              type="button"
              onClick={() => {
                tap();
                setMenuOpen(false);
                setLoginOpen(true);
              }}
              className={styles.mobileLogin}
            >
              <LogIn size={16} aria-hidden="true" />
              {t('login')}
            </button>
          )}
          <button
            type="button"
            onClick={() => scrollTo('contact')}
            className={styles.mobileCta}
          >
            {t('getStarted')}
          </button>
        </div>
      </div>

      {loginOpen ? <LoginModal onClose={() => setLoginOpen(false)} /> : null}
    </>
  );
}
