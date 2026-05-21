'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/components/Providers/AuthProvider';
import { tap } from '@/lib/haptics';
import styles from './Header.module.css';

export function UserMenu({ email }: { email: string }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const short = email.length > 22 ? `${email.slice(0, 20)}…` : email;

  return (
    <div className={styles.userMenuWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.userBtn}
        onClick={() => {
          tap();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserIcon size={14} aria-hidden="true" />
        <span className={styles.userEmail}>{short}</span>
      </button>
      {open ? (
        <div className={styles.userMenu} role="menu">
          <div className={styles.userMenuEmail}>{email}</div>
          <button
            type="button"
            role="menuitem"
            className={styles.userMenuItem}
            onClick={async () => {
              tap();
              setOpen(false);
              await logout();
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
