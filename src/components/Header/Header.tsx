'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronDown, LogIn, Menu, X } from 'lucide-react';
import type { NavSection } from '@/lib/tree/types';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { LoginModal } from '@/components/LoginModal/LoginModal';
import { SiteSearch } from '@/components/Search/SiteSearch';
import { useAuth } from '@/components/Providers/AuthProvider';
import { Link, usePathname } from '@/i18n/navigation';
import { tap } from '@/lib/haptics';
import styles from './Header.module.css';
import { UserMenu } from './UserMenu';

/**
 * Audience-first navigation. The site now has a real page per audience, so
 * these are `Link`s to indexable URLs rather than scroll anchors on a single
 * page — crawlers follow them, visitors can bookmark them, and each one has
 * its own title and description.
 */
const NAV = [
  { id: 'players', href: '/players' },
  { id: 'organizers', href: '/organizers' },
  { id: 'coaches', href: '/coaches' },
  { id: 'venues', href: '/venues' },
  { id: 'pricing', href: '/pricing' },
] as const;

/**
 * `sections` are the menu items an admin created in the site tree, resolved on
 * the server and handed down as plain data.
 *
 * A section with sub-pages gets a dropdown, and the dropdown is CSS — the
 * panel is in the DOM, revealed by `:hover`/`:focus-within`. That is not a
 * shortcut: those links are the entry points to the knowledge base, and a menu
 * built from client state would hide them from a crawler that does not open
 * menus, which is all of them.
 */
export function Header({
  sections = [],
  codePageChildren = {},
}: {
  sections?: ReadonlyArray<NavSection>;
  /**
   * Sub-pages filed under a hand-written route, keyed by that route's path.
   *
   * `NAV` above is a list of files; this is the part of the same menu that
   * lives in a table. Merging them here rather than turning `NAV` into tree
   * rows keeps the audience pages exactly where they are — first, in a fixed
   * order, translated from the catalogue — and lets an admin grow a section
   * under one without touching code.
   */
  codePageChildren?: Record<string, NavSection['children']>;
}) {
  const t = useTranslations('nav');
  const { user } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const closeMenu = useCallback(() => {
    tap();
    setMenuOpen(false);
  }, []);

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

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label={t('logoAlt')} onClick={() => tap()}>
            <Image
              src="/images/logo-mark.webp"
              alt=""
              width={34}
              height={34}
              priority
              className={styles.logo}
            />
            <span className={styles.brandText}>RabbitMatch</span>
          </Link>

          <nav className={styles.nav} aria-label={t('primaryNav')}>
            {NAV.map((link) => {
              const children = codePageChildren[link.href] ?? [];
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const anchor = (
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  {t(link.id)}
                  {children.length ? (
                    <ChevronDown size={14} aria-hidden="true" className={styles.navChevron} />
                  ) : null}
                </Link>
              );

              // No sub-pages, no wrapper: the group exists to host a dropdown.
              if (!children.length) return <span key={link.id}>{anchor}</span>;

              return (
                <div key={link.id} className={styles.navGroup}>
                  {anchor}
                  <div className={styles.navPanel}>
                    <ul>
                      {children.map((child) => (
                        <li key={child.path}>
                          <Link href={child.path} className={styles.navPanelLink}>
                            <span className={styles.navPanelTitle}>{child.title}</span>
                            {child.summary ? (
                              <span className={styles.navPanelText}>{child.summary}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link href={link.href} className={styles.navPanelAll}>
                          {t(link.id)} →
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              );
            })}

            {sections.map((section) => (
              <div key={section.path} className={styles.navGroup}>
                <Link
                  href={section.path}
                  className={`${styles.navLink} ${
                    pathname === section.path || pathname.startsWith(`${section.path}/`)
                      ? styles.navLinkActive
                      : ''
                  }`}
                >
                  {section.title}
                  {section.children.length ? (
                    <ChevronDown size={14} aria-hidden="true" className={styles.navChevron} />
                  ) : null}
                </Link>

                {section.children.length ? (
                  <div className={styles.navPanel}>
                    <ul>
                      {section.children.map((child) => (
                        <li key={child.path}>
                          <Link href={child.path} className={styles.navPanelLink}>
                            <span className={styles.navPanelTitle}>{child.title}</span>
                            {child.summary ? (
                              <span className={styles.navPanelText}>{child.summary}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link href={section.path} className={styles.navPanelAll}>
                          {section.title} →
                        </Link>
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className={styles.actions}>
            <SiteSearch />
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
              </button>
            )}

            <Link href="/#download" className={styles.cta} onClick={() => tap()}>
              {t('getStarted')}
            </Link>

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
        inert={!menuOpen}
      >
        <nav className={styles.mobileNav} aria-label={t('mobileNav')}>
          {NAV.map((link) => (
            <div key={link.id}>
              <Link href={link.href} className={styles.mobileLink} onClick={closeMenu}>
                {t(link.id)}
              </Link>
              {codePageChildren[link.href]?.length ? (
                <ul className={styles.mobileSub}>
                  {codePageChildren[link.href].map((child) => (
                    <li key={child.path}>
                      <Link href={child.path} className={styles.mobileSubLink} onClick={closeMenu}>
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <Link href="/padel" className={styles.mobileLink} onClick={closeMenu}>
            {t('padel')}
          </Link>
          <Link href="/faq" className={styles.mobileLink} onClick={closeMenu}>
            {t('faq')}
          </Link>

          {sections.map((section) => (
            <div key={section.path}>
              <Link href={section.path} className={styles.mobileLink} onClick={closeMenu}>
                {section.title}
              </Link>
              {section.children.length ? (
                <ul className={styles.mobileSub}>
                  {section.children.map((child) => (
                    <li key={child.path}>
                      <Link href={child.path} className={styles.mobileSubLink} onClick={closeMenu}>
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
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
          <Link href="/#download" className={styles.mobileCta} onClick={closeMenu}>
            {t('getStarted')}
          </Link>
        </div>
      </div>

      {loginOpen ? <LoginModal onClose={() => setLoginOpen(false)} /> : null}
    </>
  );
}
