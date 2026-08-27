'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader, Search, X } from 'lucide-react';
import { SearchResults } from './SearchResults';
import { useSiteSearch } from './useSiteSearch';
import styles from './search.module.css';

/**
 * The search field in the header, and the overlay it opens.
 *
 * It is a client component and it is the only search UI on the site that is
 * always present, so it stays deliberately small: a button until someone
 * presses it, then an input and a list. Nothing is fetched until two characters
 * are typed.
 *
 * `/` opens it from anywhere, the way it does in every documentation site — and
 * only when the reader is not already typing into something else.
 */
export function SiteSearch({ label = 'Поиск по сайту' }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data, loading } = useSiteSearch(open ? query : '');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (event.key === '/' && !typing && !open) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === 'Escape' && open) close();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // The page behind a modal should not scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={label}
      >
        <Search size={17} aria-hidden="true" />
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className={styles.dialog}>
            <div className={styles.box}>
              {loading ? (
                <Loader size={18} className={styles.icon} aria-hidden="true" />
              ) : (
                <Search size={18} className={styles.icon} aria-hidden="true" />
              )}
              <input
                ref={inputRef}
                type="search"
                className={styles.input}
                value={query}
                placeholder="Искать по всему сайту…"
                onChange={(event) => setQuery(event.target.value)}
                aria-label={label}
              />
              {query ? (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => setQuery('')}
                  aria-label="Очистить"
                >
                  <X size={16} />
                </button>
              ) : (
                <span className={styles.hint}>Esc — закрыть</span>
              )}
            </div>

            <div className={styles.results}>
              {query.trim().length < 2 ? (
                <p className={styles.empty}>
                  Ищет по всем страницам, разделам академии и блокам, собранным в конструкторе.
                  Результаты с той страницы, где вы сейчас, показываются первыми.
                </p>
              ) : (
                <SearchResults data={data} loading={loading} query={query} onPick={close} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
