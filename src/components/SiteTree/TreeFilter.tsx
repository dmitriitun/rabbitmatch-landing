'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown, Search, X } from 'lucide-react';
import { SearchResults } from '@/components/Search/SearchResults';
import { useSiteSearch } from '@/components/Search/useSiteSearch';
import searchStyles from '@/components/Search/search.module.css';
import styles from './tree.module.css';

/**
 * Search and expand/collapse for a section tree.
 *
 * It drives the server-rendered tree through the DOM instead of re-rendering
 * it. That is the whole point: the tree is HTML a crawler reads and a visitor
 * gets without JavaScript, and re-implementing it as client state would mean
 * shipping the entire knowledge base twice — once as markup, once as an RSC
 * payload — so that a text field could hide four rows.
 *
 * With JavaScript off, the field never appears (this component renders it) and
 * the tree still works: `<details>` opens on click on its own.
 *
 * The same typing also runs a site-wide search, whose results appear under the
 * filtered tree. Two behaviours in one field, and they do not compete: the tree
 * narrows to the rows that match, and below it sits everything else on the site
 * that matches — because a reader who searches here and finds nothing in this
 * section has not stopped wanting an answer.
 */

export function TreeFilter({
  targetId,
  labels,
}: {
  /** The `id` of the `[data-rm-tree]` container to filter. */
  targetId: string;
  /*
    Plain strings, not formatters. These cross the server → client boundary,
    where a function cannot go — so the count is a `{count}` placeholder in the
    message and gets substituted here. It is also why that message does not use
    an ICU plural: the plural rules live in the formatter this cannot carry.
  */
  labels: {
    placeholder: string;
    expandAll: string;
    collapseAll: string;
    clear: string;
    empty: string;
    /** Contains `{count}`. */
    found: string;
  };
}) {
  const [value, setValue] = useState('');
  const [found, setFound] = useState<number | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const site = useSiteSearch(value);

  const root = useCallback((): HTMLElement | null => {
    if (!rootRef.current) rootRef.current = document.getElementById(targetId);
    return rootRef.current;
  }, [targetId]);

  /**
   * Remember how each group started out, once.
   *
   * Clearing the field has to put the tree back the way the admin arranged it,
   * not leave every group open because the search opened them.
   */
  useEffect(() => {
    const el = root();
    if (!el) return;
    for (const details of el.querySelectorAll<HTMLDetailsElement>('details')) {
      if (details.dataset.rmOpen0 === undefined) {
        details.dataset.rmOpen0 = details.open ? '1' : '0';
      }
    }
  }, [root]);

  const setAll = useCallback(
    (open: boolean) => {
      const el = root();
      if (!el) return;
      for (const details of el.querySelectorAll<HTMLDetailsElement>('details')) {
        details.open = open;
      }
    },
    [root],
  );

  /** Put every row back and restore the disclosure state the page shipped with. */
  const restore = useCallback(() => {
    const el = root();
    if (!el) return;
    for (const item of el.querySelectorAll<HTMLElement>('[data-rm-tree-item]')) {
      item.hidden = false;
      delete item.dataset.rmHit;
    }
    for (const details of el.querySelectorAll<HTMLDetailsElement>('details')) {
      details.open = details.dataset.rmOpen0 === '1';
    }
  }, [root]);

  const apply = useCallback(
    (raw: string) => {
      const el = root();
      if (!el) return;
      const query = raw.trim().toLowerCase();

      if (!query) {
        restore();
        setFound(null);
        return;
      }

      const items = Array.from(el.querySelectorAll<HTMLElement>('[data-rm-tree-item]'));

      /*
        Reverse document order, so by the time a group is examined every row
        inside it has already been marked. A group survives if it matches or
        if anything under it does — otherwise searching for an article would
        hide the branch that holds it.
      */
      let hits = 0;
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i];
        const self = (item.dataset.rmSearch ?? '').includes(query);
        const descendant = item.querySelector('[data-rm-tree-item][data-rm-hit="1"]') !== null;
        const keep = self || descendant;

        if (keep) {
          item.dataset.rmHit = '1';
          if (self) hits += 1;
        } else {
          delete item.dataset.rmHit;
        }
        item.hidden = !keep;
      }

      // Everything still standing is open: a match hidden inside a collapsed
      // group reads as no match at all.
      for (const details of el.querySelectorAll<HTMLDetailsElement>('details')) {
        details.open = true;
      }

      setFound(hits);
    },
    [restore, root],
  );

  /**
   * Typing is what changes the tree, so the filter runs from the change
   * handler rather than from an effect on `value`. An effect would mean React
   * renders the new input, then a second time for the match count — for work
   * that is a DOM walk either way.
   */
  const onQuery = useCallback(
    (next: string) => {
      setValue(next);
      apply(next);
    },
    [apply],
  );

  // Leave the tree as the visitor found it if this component goes away.
  useEffect(() => restore, [restore]);

  return (
    <div className={styles.filter}>
      <div className={styles.searchBox}>
        <Search size={16} aria-hidden="true" className={styles.searchIcon} />
        <input
          type="search"
          className={styles.searchInput}
          value={value}
          placeholder={labels.placeholder}
          onChange={(event) => onQuery(event.target.value)}
          aria-controls={targetId}
        />
        {value ? (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => onQuery('')}
            aria-label={labels.clear}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div className={styles.filterActions}>
        <button type="button" className={styles.filterBtn} onClick={() => setAll(true)}>
          <ChevronsUpDown size={14} aria-hidden="true" />
          {labels.expandAll}
        </button>
        <button type="button" className={styles.filterBtn} onClick={() => setAll(false)}>
          <ChevronsDownUp size={14} aria-hidden="true" />
          {labels.collapseAll}
        </button>
      </div>

      <p className={styles.filterStatus} role="status">
        {found === null
          ? ''
          : found === 0
            ? labels.empty
            : labels.found.replace('{count}', String(found))}
      </p>

      {/*
        Everything else on the site that matches. Rendered below the tree rather
        than mixed into it: those rows are this section, these results are the
        rest of the site, and merging them would leave a reader unable to tell
        which is which.
      */}
      <div className={styles.filterSite}>
        <div className={searchStyles.results}>
          <SearchResults data={site.data} loading={site.loading} query={value} />
        </div>
      </div>
    </div>
  );
}
