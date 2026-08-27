'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MAX_QUERY_TERMS, SEARCH_PARAM, tokenize, wordsMatch } from '@/lib/search/types';

/**
 * Highlights the searched words on the page a result opened, and scrolls to
 * the first one.
 *
 * This is what turns a result into a link to *the place* rather than to the
 * page. The alternative — an `#anchor` per match — cannot work: a phrase in the
 * middle of the fourth paragraph has no anchor, and adding one to every
 * paragraph on the site to serve search would be a large change to the markup
 * for a small feature. A text fragment (`#:~:text=`) is the other option and is
 * not supported in every browser.
 *
 * It walks the rendered DOM, so it finds the words wherever they ended up —
 * hand-written copy, a builder block, a tree listing — without any of those
 * having to know that search exists.
 */

/** Never touch these: their text is markup, script, or already a control. */
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'MARK']);

const MAX_MARKS = 60;

function clear(): void {
  for (const mark of document.querySelectorAll<HTMLElement>('mark[data-rm-found]')) {
    const parent = mark.parentNode;
    if (!parent) continue;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    // Undo the split this created, so a second pass sees whole words again.
    parent.normalize();
  }
}

export function SearchHighlight() {
  const params = useSearchParams();
  const raw = params.get(SEARCH_PARAM) ?? '';

  useEffect(() => {
    const terms = tokenize(raw, MAX_QUERY_TERMS);
    if (!terms.length) {
      clear();
      return;
    }

    /*
      Deferred a frame. The effect runs before the browser has laid the page
      out, and scrolling to an element whose position is not settled lands in
      the wrong place — which looks exactly like the feature not working.
    */
    const timer = window.setTimeout(() => {
      clear();

      const root = document.querySelector('main') ?? document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || SKIP.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const targets: Text[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        targets.push(node as Text);
      }

      let marked = 0;
      let first: HTMLElement | null = null;

      for (const node of targets) {
        if (marked >= MAX_MARKS) break;
        const text = node.nodeValue ?? '';

        /*
          Word by word rather than by regexp: the matching rule is the same
          prefix rule the index uses, and expressing "this stem, then the rest
          of the word" as a pattern would either duplicate that rule or
          disagree with it.
        */
        const pieces: Array<{ text: string; hit: boolean }> = [];
        let cursor = 0;
        let plain = '';

        const wordRe = /[\p{L}\p{N}]+/gu;
        let match: RegExpExecArray | null;
        while ((match = wordRe.exec(text)) !== null) {
          const word = match[0].toLowerCase();
          if (!terms.some((term) => wordsMatch(term, word))) continue;

          plain += text.slice(cursor, match.index);
          if (plain) {
            pieces.push({ text: plain, hit: false });
            plain = '';
          }
          pieces.push({ text: match[0], hit: true });
          cursor = match.index + match[0].length;
        }

        if (!pieces.length) continue;
        const tail = text.slice(cursor);
        if (tail) pieces.push({ text: tail, hit: false });

        const fragment = document.createDocumentFragment();
        for (const piece of pieces) {
          if (!piece.hit) {
            fragment.appendChild(document.createTextNode(piece.text));
            continue;
          }
          const mark = document.createElement('mark');
          mark.textContent = piece.text;
          mark.dataset.rmFound = first ? 'more' : 'first';
          fragment.appendChild(mark);
          if (!first) first = mark;
          marked += 1;
        }

        node.parentNode?.replaceChild(fragment, node);
      }

      // A match inside a collapsed `<details>` is a match nobody can see.
      if (first) {
        for (
          let element: HTMLElement | null = first;
          element;
          element = element.parentElement
        ) {
          if (element instanceof HTMLDetailsElement) element.open = true;
        }
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);

    return () => {
      window.clearTimeout(timer);
      clear();
    };
  }, [raw]);

  return null;
}
