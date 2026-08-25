'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Loader, Pencil, X } from 'lucide-react';
import { useAuthOptional } from '@/components/Providers/AuthProvider';
import styles from './AdminEditLayer.module.css';

type Target = { key: string; value: string; multiline: boolean };
type SaveState = 'idle' | 'saving' | 'error';

/**
 * In-place content editing for admins, implemented as one delegated listener
 * instead of one client component per string.
 *
 * `EditableText` renders server HTML tagged with `data-rm-key`. When an admin
 * session is present this layer marks the page as editable (a CSS class on
 * `<html>` reveals the hover affordance) and captures clicks on any tagged
 * element, opening a single editor panel. For everyone else the component
 * returns `null` before attaching anything.
 */
export function AdminEditLayer() {
  const auth = useAuthOptional();
  const locale = useLocale();
  const router = useRouter();

  const isAdmin = auth?.user?.isAdmin === true;
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<SaveState>('idle');

  useEffect(() => {
    if (!isAdmin) return;

    const root = document.documentElement;
    root.classList.add('rm-editable-mode');

    const onClick = (event: MouseEvent) => {
      const node = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-rm-key]');
      if (!node) return;
      // Alt-click falls through to normal behaviour so admins can still use
      // links and buttons that happen to wrap editable text.
      if (event.altKey) return;
      // The page builder owns the pointer while it is open: there a click
      // selects an element rather than opening the string editor.
      if (root.classList.contains('rm-building')) return;

      event.preventDefault();
      event.stopPropagation();

      const key = node.dataset.rmKey;
      if (!key) return;
      const value = node.textContent ?? '';
      setTarget({ key, value, multiline: node.dataset.rmMultiline === '1' });
      setDraft(value);
      setState('idle');
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      root.classList.remove('rm-editable-mode');
    };
  }, [isAdmin]);

  const close = useCallback(() => {
    setTarget(null);
    setState('idle');
  }, []);

  const save = useCallback(async () => {
    if (!target || state === 'saving') return;
    if (draft === target.value) {
      close();
      return;
    }
    setState('saving');
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: target.key, locale, value: draft }),
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      close();
      router.refresh();
    } catch {
      setState('error');
    }
  }, [close, draft, locale, router, state, target]);

  if (!isAdmin || !target) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={target.key}>
      <div className={styles.panel}>
        <header className={styles.head}>
          <Pencil size={14} aria-hidden="true" />
          <code className={styles.key}>{target.key}</code>
          <span className={styles.locale}>{locale}</span>
          <button type="button" onClick={close} className={styles.close} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <textarea
          className={styles.textarea}
          value={draft}
          autoFocus
          rows={target.multiline ? 16 : 4}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void save();
            }
          }}
        />

        {state === 'error' ? <p className={styles.error}>Save failed. Try again.</p> : null}

        <footer className={styles.foot}>
          <span className={styles.hint}>⌘/Ctrl + Enter to save · Esc to cancel</span>
          <button type="button" className={styles.cancel} onClick={close} disabled={state === 'saving'}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={() => void save()}
            disabled={state === 'saving'}
          >
            {state === 'saving' ? <Loader size={14} className={styles.spin} /> : <Check size={14} />}
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
