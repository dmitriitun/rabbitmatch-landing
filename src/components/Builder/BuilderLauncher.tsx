'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { PanelsTopLeft } from 'lucide-react';
import { useAuthOptional } from '@/components/Providers/AuthProvider';
import { usePathname } from '@/i18n/navigation';
import styles from './BuilderLauncher.module.css';

/**
 * The one client component the builder costs a page.
 *
 * It renders nothing at all unless the session is an admin's, and the editor
 * itself — Tiptap, the canvas, the inspector — is behind a `dynamic()` import
 * that is only requested when the button is pressed. A visitor downloads none
 * of it; an admin downloads it once, on the click that asks for it.
 */

const BuilderEditor = dynamic(() => import('./editor/BuilderEditor'), { ssr: false });

export function BuilderLauncher() {
  const auth = useAuthOptional();
  const locale = useLocale();
  // next-intl's `usePathname` returns the route without the locale prefix,
  // which is exactly the key layouts are stored under.
  const pathname = usePathname();
  /**
   * Which page the editor is open for, rather than a plain boolean. Navigating
   * away therefore closes it by construction — the editor is pointed at the
   * markup of one page, and a stale one would have nothing to portal into.
   */
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor !== null && openFor === pathname;

  const isAdmin = auth?.user?.isAdmin === true;

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add('rm-building');
    return () => root.classList.remove('rm-building');
  }, [open]);

  const close = useCallback(() => setOpenFor(null), []);

  if (!isAdmin) return null;

  if (open) {
    return <BuilderEditor page={pathname || '/'} locale={locale} onExit={close} />;
  }

  return (
    <button type="button" className={styles.launcher} onClick={() => setOpenFor(pathname)}>
      <span className={styles.dot} aria-hidden="true" />
      <PanelsTopLeft size={15} aria-hidden="true" />
      Конструктор
    </button>
  );
}
