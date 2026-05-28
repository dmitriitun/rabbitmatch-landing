'use client';

import { useEffect, useId, useRef, useState, type ElementType } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Loader, Pencil, X } from 'lucide-react';
import { useAuthOptional } from '@/components/Providers/AuthProvider';
import { tap } from '@/lib/haptics';
import styles from './EditableText.module.css';

type Props = {
  /** Full i18n key path, e.g. `hero.title` or `pricing.classic.priceMonthlyNew`. */
  tKey: string;
  /** HTML element used to wrap the rendered string. Defaults to `span`. */
  as?: ElementType;
  /** Multiline → renders a `textarea` in edit mode. */
  multiline?: boolean;
  /** Optional className applied to the wrapper element. */
  className?: string;
};

type SaveState = 'idle' | 'saving' | 'error';

export function EditableText({ tKey, as: Tag = 'span', multiline = false, className }: Props) {
  const auth = useAuthOptional();
  const locale = useLocale();
  const router = useRouter();
  const baseId = useId();

  const lastDotAt = tKey.lastIndexOf('.');
  const namespace = lastDotAt === -1 ? undefined : tKey.slice(0, lastDotAt);
  const leaf = lastDotAt === -1 ? tKey : tKey.slice(lastDotAt + 1);
  const t = useTranslations(namespace);

  let resolved: string;
  try {
    resolved = t(leaf);
  } catch {
    resolved = '';
  }

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(resolved);
  const [state, setState] = useState<SaveState>('idle');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const node = multiline ? textareaRef.current : inputRef.current;
    node?.focus();
    if (node && 'select' in node && typeof node.select === 'function') node.select();
  }, [editing, multiline]);

  const isAdmin = auth?.user?.isAdmin === true;

  if (!isAdmin) {
    // Public visitors just see the text — no extra DOM, no listeners.
    return <Tag className={className}>{resolved}</Tag>;
  }

  const startEdit = () => {
    tap();
    setDraft(resolved);
    setState('idle');
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setState('idle');
  };

  const save = async () => {
    if (state === 'saving') return;
    if (draft === resolved) {
      setEditing(false);
      return;
    }
    setState('saving');
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: tKey, locale, value: draft }),
      });
      if (!res.ok) {
        setState('error');
        return;
      }
      setEditing(false);
      setState('idle');
      router.refresh();
    } catch {
      setState('error');
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      void save();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save();
    }
  };

  if (editing) {
    return (
      <Tag className={`${styles.editWrap} ${className ?? ''}`}>
        <span className={styles.editLabel}>{tKey}</span>
        {multiline ? (
          <textarea
            id={baseId}
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            rows={Math.min(24, Math.max(3, draft.split('\n').length + 1))}
            className={styles.textarea}
          />
        ) : (
          <input
            id={baseId}
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            className={styles.input}
          />
        )}
        {state === 'error' ? <span className={styles.error}>Save failed</span> : null}
        <span className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={cancel}
            disabled={state === 'saving'}
          >
            <X size={14} />
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => void save()}
            disabled={state === 'saving'}
          >
            {state === 'saving' ? <Loader size={14} className={styles.spin} /> : <Check size={14} />}
          </button>
        </span>
      </Tag>
    );
  }

  return (
    <Tag
      className={`${styles.editable} ${className ?? ''}`}
      role="button"
      tabIndex={0}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startEdit();
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          startEdit();
        }
      }}
      title={`Click to edit (${tKey})`}
    >
      <Pencil size={12} className={styles.pencil} aria-hidden="true" />
      {resolved}
    </Tag>
  );
}
