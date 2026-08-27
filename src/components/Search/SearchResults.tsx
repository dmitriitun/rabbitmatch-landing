'use client';

import { Fragment } from 'react';
import type { SearchHit, SearchResponse } from '@/lib/search/types';
import styles from './search.module.css';

/**
 * The result list, shared by the header overlay and the in-page field.
 *
 * Two groups, always in this order: what is on the page the reader is already
 * looking at, then everything else. That ordering is the whole point of a
 * site-wide search on a page that has its own content — someone searching from
 * an article usually means "in this article", and someone who did not gets the
 * rest of the site immediately below without a second search.
 */

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  page: 'раздел',
  section: 'блок',
  article: 'материал',
  block: 'блок',
  legal: 'документ',
};

export function SearchResults({
  data,
  loading,
  query,
  onPick,
}: {
  data: SearchResponse | null;
  loading: boolean;
  query: string;
  /** Called before navigating, so the field can close itself. */
  onPick?: () => void;
}) {
  if (!query.trim()) return null;

  if (!data) {
    return <p className={styles.empty}>{loading ? 'Ищу…' : ''}</p>;
  }

  if (!data.hits.length) {
    return (
      <p className={styles.empty}>
        Ничего не нашлось по запросу «{data.query}».
        {data.missingWords.length ? (
          <>
            {' '}
            Этих слов нет нигде на сайте: {data.missingWords.join(', ')}. Попробуйте одно слово или
            другую формулировку.
          </>
        ) : (
          ' Попробуйте другую формулировку.'
        )}
      </p>
    );
  }

  const here = data.hits.filter((hit) => hit.onThisPage);
  const elsewhere = data.hits.filter((hit) => !hit.onThisPage);

  return (
    <>
      {here.length ? (
        <>
          <p className={styles.groupTitle}>
            На этой странице
            <span className={styles.groupCount}>{here.length}</span>
          </p>
          {here.map((hit) => (
            <Hit key={`${hit.path}-${hit.section ?? ''}-here`} hit={hit} onPick={onPick} />
          ))}
        </>
      ) : null}

      {elsewhere.length ? (
        <>
          <p className={styles.groupTitle}>
            {here.length ? 'В других разделах' : 'Найдено на сайте'}
            <span className={styles.groupCount}>
              {data.total > data.hits.length ? `${elsewhere.length} из ${data.total}` : elsewhere.length}
            </span>
          </p>
          {elsewhere.map((hit) => (
            <Hit key={`${hit.path}-${hit.section ?? ''}`} hit={hit} onPick={onPick} />
          ))}
        </>
      ) : null}

      {data.missingWords.length ? (
        <p className={styles.empty}>
          Не встречается на сайте: {data.missingWords.join(', ')}.
        </p>
      ) : null}
    </>
  );
}

function Hit({ hit, onPick }: { hit: SearchHit; onPick?: () => void }) {
  return (
    /*
      A plain `<a>`, not the locale-aware `Link`: `href` already carries the
      locale prefix and the query parameter, and a full navigation is what makes
      the landing page run its highlighter from a clean state.
    */
    <a className={styles.hit} href={hit.href} onClick={onPick}>
      <span className={styles.hitHead}>
        {hit.title}
        {hit.section ? <span className={styles.hitSection}>· {hit.section}</span> : null}
        <span className={styles.hitPath}>
          {KIND_LABEL[hit.kind]} · {hit.path}
        </span>
      </span>

      <span className={styles.hitSnippet}>
        {hit.snippet.map((part, i) =>
          part.hit ? (
            <mark key={i} className={styles.mark}>
              {part.text}
            </mark>
          ) : (
            <Fragment key={i}>{part.text}</Fragment>
          ),
        )}
      </span>

      {hit.matched.length > 1 ? (
        <span className={styles.matched}>
          {hit.matched.map((word) => (
            <span key={word} className={styles.word}>
              {word}
            </span>
          ))}
        </span>
      ) : null}
    </a>
  );
}
