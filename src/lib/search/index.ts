import 'server-only';
import { query } from '@/lib/db';
import type { Locale } from '@/i18n/config';
import { loadMessages } from '@/lib/messages';
import { normalizeDoc, richToPlain } from '@/lib/builder/normalize';
import type { BuilderDoc } from '@/lib/builder/types';
import { legalSlugs } from '@/lib/site';
import { loadTree } from '@/lib/tree/store';
import { flatten, nodeSummary, nodeTitle } from '@/lib/tree/types';
import {
  MAX_QUERY_TERMS,
  SEARCH_PARAM,
  tokenize,
  wordsMatch,
  type SearchHit,
  type SearchKind,
  type SearchResponse,
  type SnippetPart,
} from './types';

/**
 * Search across everything the site actually says.
 *
 * The content of this site lives in three unrelated places — a JSON message
 * catalogue for the hand-written pages, `page_layouts` for anything composed in
 * the builder, and `site_nodes` for the knowledge base — and a reader does not
 * know or care which of the three an answer is in. So the index is built from
 * all three and queried as one.
 *
 * It is an in-memory inverted index rebuilt on a TTL, not a Postgres full-text
 * search. Two reasons. The catalogue is a JSON file rather than a table, so
 * half the corpus is not in the database to be indexed in the first place; and
 * the whole corpus is a few hundred kilobytes, which is small enough that
 * scanning it is faster than the round trip that would avoid scanning it.
 *
 * What a result has to carry, and what shapes everything below: the words that
 * matched, a snippet showing them in context, and a link that lands on the
 * phrase rather than on the top of the page.
 */

/* --- The corpus ----------------------------------------------------------- */

type Entry = {
  path: string;
  title: string;
  section?: string;
  kind: SearchKind;
  /** Anchor on the target page, when the source knows one. */
  anchor?: string;
  text: string;
  /** Lowercased words of `title`, `section` and `text`, in that order. */
  words: string[];
  /** How many of those come from the title — the prefix that counts as a heading. */
  titleWords: number;
  /** How much this entry is worth before the query is considered. */
  weight: number;
};

/**
 * Namespace → the page it is rendered on.
 *
 * The hand-written pages read their copy from one namespace each, which is
 * what makes this mapping possible at all. The chrome namespaces — `nav`,
 * `footer`, `login`, the cookie banner — are deliberately absent: they appear
 * on every page, so a hit in one of them is a hit everywhere, which is the same
 * as no hit at all.
 */
const PAGE_NAMESPACES: Record<string, string> = {
  home: '/',
  hero: '/',
  solution: '/',
  comparison: '/',
  pricing: '/',
  players: '/players',
  organizers: '/organizers',
  coaches: '/coaches',
  venues: '/venues',
  padel: '/padel',
  pricingPage: '/pricing',
  faqPage: '/faq',
};

/** Keys that are labels rather than content — indexing them is noise. */
const SKIP_KEYS = new Set([
  'icon',
  'primary',
  'secondary',
  'cta',
  'meta',
  'alt',
  'placeholder',
  'submit',
  'aria',
]);

function words(text: string): string[] {
  return tokenize(text);
}

/**
 * Flatten one message subtree into readable prose.
 *
 * The catalogue nests `{ title, text }` pairs inside arrays inside groups. What
 * a reader sees is one block of copy, so that is what gets indexed: joining the
 * leaves preserves the phrases that cross a key boundary, which is exactly the
 * kind of thing someone searches for.
 */
function collectStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 5) return out;
  if (typeof value === 'string') {
    if (value.trim()) out.push(value.trim());
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (SKIP_KEYS.has(key)) continue;
      collectStrings(inner, depth + 1, out);
    }
  }
  return out;
}

function firstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const group = value as Record<string, unknown>;
    for (const key of ['title', 'question', 'heading', 'name']) {
      if (typeof group[key] === 'string') return group[key] as string;
    }
  }
  return '';
}

function entry(
  path: string,
  title: string,
  text: string,
  kind: SearchKind,
  weight: number,
  section?: string,
  anchor?: string,
): Entry | null {
  const body = text.replace(/\s+/g, ' ').trim();
  if (!body) return null;
  const titleWords = words(title);
  return {
    path,
    title,
    section,
    kind,
    anchor,
    text: body,
    words: [...titleWords, ...words(section ?? ''), ...words(body)],
    titleWords: titleWords.length,
    weight,
  };
}

/** Copy from the message catalogue, one entry per group of a page namespace. */
function messageEntries(messages: Record<string, unknown>, pageTitles: Map<string, string>): Entry[] {
  const out: Entry[] = [];

  for (const [namespace, path] of Object.entries(PAGE_NAMESPACES)) {
    const branch = messages[namespace];
    if (!branch || typeof branch !== 'object') continue;

    const pageTitle = pageTitles.get(path) ?? path;

    for (const [group, value] of Object.entries(branch as Record<string, unknown>)) {
      if (SKIP_KEYS.has(group)) continue;
      const text = collectStrings(value).join(' — ');
      const section = firstString(value) || undefined;
      /*
        The hero of a page carries its own headline, which is the strongest
        thing on it; everything else is body copy of equal standing.
      */
      const created = entry(path, pageTitle, text, 'section', group === 'hero' ? 3 : 2, section);
      if (created) out.push(created);
    }
  }

  const legal = messages.legal;
  if (legal && typeof legal === 'object') {
    for (const slug of legalSlugs) {
      const doc = (legal as Record<string, unknown>)[slug];
      if (!doc || typeof doc !== 'object') continue;
      const title = firstString(doc) || slug;
      const body = String((doc as Record<string, unknown>).body ?? '');
      const created = entry(`/legal/${slug}`, title, body, 'legal', 1);
      if (created) out.push(created);
    }
  }

  return out;
}

/** One entry per builder section, so a hit points at the block, not the page. */
function builderEntries(
  rows: Array<{ page: string; doc: unknown }>,
  pageTitles: Map<string, string>,
  visible: (path: string) => boolean,
): Entry[] {
  const out: Entry[] = [];

  for (const row of rows) {
    if (!visible(row.page)) continue;
    let doc: BuilderDoc;
    try {
      doc = normalizeDoc(row.doc);
    } catch {
      continue;
    }

    for (const section of doc.sections) {
      if (section.hidden) continue;

      const parts: string[] = [];
      for (const node of section.nodes) {
        if (node.type === 'text') parts.push(richToPlain(node.rich));
        else if (node.type === 'button') parts.push(node.label);
        else if (node.type === 'media') {
          if (node.alt) parts.push(node.alt);
          if (node.caption) parts.push(richToPlain(node.caption));
        }
      }

      const text = parts.filter(Boolean).join(' ');
      const created = entry(
        row.page,
        pageTitles.get(row.page) ?? row.page,
        text,
        'block',
        2,
        section.name || text.split(/[.\n]/)[0]?.slice(0, 60) || undefined,
        section.anchor,
      );
      if (created) out.push(created);
    }
  }

  return out;
}

type Index = {
  at: number;
  entries: Entry[];
  /** Every distinct word in the corpus, for telling "no match" from "no page". */
  vocabulary: Set<string>;
};

const TTL_MS = Number(process.env.CONTENT_CACHE_TTL_MS ?? 60_000);

declare global {
  var __rmSearchIndex: Map<string, Index> | undefined;
}

function cache(): Map<string, Index> {
  if (!global.__rmSearchIndex) global.__rmSearchIndex = new Map();
  return global.__rmSearchIndex;
}

/**
 * Drop the index so the next search rebuilds it.
 *
 * Called by every writer that can change what the site says: the builder, the
 * tree manager and the inline content editor. Without it an admin publishes a
 * page and cannot find it for a minute, which reads as the search being broken.
 */
export function invalidateSearchIndex(): void {
  global.__rmSearchIndex = undefined;
}

async function buildIndex(locale: Locale): Promise<Index> {
  const [messages, tree] = await Promise.all([loadMessages(locale), loadTree()]);
  const nodes = flatten(tree);

  const pageTitles = new Map<string, string>();
  const metaOf = (namespace: string): string => {
    const branch = messages[namespace] as Record<string, unknown> | undefined;
    const meta = branch?.meta as Record<string, unknown> | undefined;
    const hero = branch?.hero as Record<string, unknown> | undefined;
    return String(meta?.title ?? hero?.title ?? '');
  };
  for (const [namespace, path] of Object.entries(PAGE_NAMESPACES)) {
    const title = metaOf(namespace);
    if (title && !pageTitles.has(path)) pageTitles.set(path, title);
  }
  if (!pageTitles.has('/')) pageTitles.set('/', String((messages.meta as Record<string, unknown>)?.title ?? '/'));
  for (const node of nodes) pageTitles.set(node.path, nodeTitle(node, locale));

  const entries: Entry[] = [];

  entries.push(...messageEntries(messages, pageTitles));

  // Knowledge-base pages: title and summary are the page, its body is a
  // builder document and is picked up below.
  for (const node of nodes) {
    if (node.codePage) continue;
    const created = entry(
      node.path,
      nodeTitle(node, locale),
      `${nodeTitle(node, locale)}. ${nodeSummary(node, locale)}`.trim(),
      node.kind === 'article' ? 'article' : 'page',
      // A section index is a route to content rather than content; an article
      // is the thing someone came for.
      node.kind === 'article' ? 4 : 3,
    );
    if (created) entries.push(created);
  }

  const visiblePaths = new Set<string>([...Object.values(PAGE_NAMESPACES), ...nodes.map((n) => n.path)]);
  try {
    const { rows } = await query<{ page: string; doc: unknown }>(
      'SELECT page, doc FROM page_layouts WHERE locale = $1',
      [locale],
    );
    entries.push(
      ...builderEntries(rows, pageTitles, (path) => visiblePaths.has(path)),
    );
  } catch (err) {
    // A search that covers the hand-written pages is far better than an error.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[search] builder documents unavailable', err);
    }
  }
  const vocabulary = new Set<string>();
  for (const item of entries) for (const word of item.words) vocabulary.add(word);

  return { at: Date.now(), entries, vocabulary };
}

async function getIndex(locale: Locale): Promise<Index> {
  const store = cache();
  const hit = store.get(locale);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;
  const fresh = await buildIndex(locale);
  store.set(locale, fresh);
  return fresh;
}

/* --- Querying ------------------------------------------------------------- */

const SNIPPET_RADIUS = 90;

/**
 * A snippet centred on the first match, split into matched and unmatched runs.
 *
 * Returned as parts rather than as HTML with `<mark>` in it: the result list is
 * React, and handing it a string of markup to inject would mean trusting
 * content that came out of a database through a path with no other reason to be
 * trusted.
 */
function snippet(text: string, terms: string[]): SnippetPart[] {
  const lower = text.toLowerCase();

  let first = -1;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at !== -1 && (first === -1 || at < first)) first = at;
  }
  if (first === -1) first = 0;

  let start = Math.max(0, first - SNIPPET_RADIUS);
  let end = Math.min(text.length, first + SNIPPET_RADIUS * 2);
  // Never cut a word in half — start and end on a space when there is one.
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < first) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > first) end = space;
  }

  const slice = text.slice(start, end);
  const parts: SnippetPart[] = [];

  /*
    One pass over the slice, matching whichever term starts at each position.
    Building a regexp from the terms would be shorter and would also mean
    escaping user input into a pattern — this avoids the question.
  */
  const sliceLower = slice.toLowerCase();
  let cursor = 0;
  let plain = '';

  while (cursor < slice.length) {
    const term = terms.find((t) => t && sliceLower.startsWith(t, cursor));
    if (!term) {
      plain += slice[cursor];
      cursor += 1;
      continue;
    }
    // Extend the highlight to the end of the word: matching a stem should
    // highlight the whole inflected form, not the first six letters of it.
    let stop = cursor + term.length;
    while (stop < slice.length && /[\p{L}\p{N}]/u.test(slice[stop])) stop += 1;

    if (plain) {
      parts.push({ text: plain, hit: false });
      plain = '';
    }
    parts.push({ text: slice.slice(cursor, stop), hit: true });
    cursor = stop;
  }
  if (plain) parts.push({ text: plain, hit: false });

  if (start > 0 && parts.length) parts[0] = { ...parts[0], text: `…${parts[0].text}` };
  if (end < text.length && parts.length) {
    const last = parts[parts.length - 1];
    parts[parts.length - 1] = { ...last, text: `${last.text}…` };
  }

  return parts;
}

const MAX_HITS = 24;

export async function search(
  locale: Locale,
  rawQuery: string,
  currentPath: string | null,
): Promise<SearchResponse> {
  const terms = tokenize(rawQuery, MAX_QUERY_TERMS);
  if (!terms.length) {
    return { query: rawQuery, hits: [], total: 0, matchedWords: [], missingWords: [] };
  }

  const index = await getIndex(locale);
  const phrase = rawQuery.toLowerCase().trim();
  const foundAnywhere = new Set<string>();

  type Scored = { entry: Entry; score: number; matched: string[] };
  const scored: Scored[] = [];

  for (const item of index.entries) {
    const matched: string[] = [];
    let score = 0;

    for (const term of terms) {
      let hits = 0;
      let inTitle = false;

      for (let i = 0; i < item.words.length; i += 1) {
        if (!wordsMatch(term, item.words[i])) continue;
        hits += 1;
        // The words array is title, then section, then body — so an index
        // inside the title's own run means the match is in a heading.
        if (i < item.titleWords) inTitle = true;
      }

      if (!hits) continue;
      matched.push(term);
      foundAnywhere.add(term);
      // Diminishing returns on repetition: a word ten times over is not ten
      // times the answer, and rewarding it would rank keyword-stuffed copy top.
      score += 4 + Math.min(6, Math.log2(hits + 1) * 3) + (inTitle ? 10 : 0);
    }

    if (!matched.length) continue;

    // Every word present beats any single word repeated, which is what makes
    // a multi-word query behave like a phrase search without being one.
    if (matched.length === terms.length) score += 12 * terms.length;
    if (terms.length > 1 && item.text.toLowerCase().includes(phrase)) score += 25;

    score *= item.weight;
    if (currentPath && item.path === currentPath) score += 1000;

    scored.push({ entry: item, score, matched });
  }

  scored.sort((a, b) => b.score - a.score);

  /*
    At most two blocks from any one page.

    Without the cap a long page with the query word in every section fills the
    whole list and hides the other six pages that answer the question — which is
    the single most common way a small-site search stops being useful.
  */
  const perPage = new Map<string, number>();
  const hits: SearchHit[] = [];

  for (const { entry: item, score, matched } of scored) {
    const seen = perPage.get(item.path) ?? 0;
    if (seen >= 2) continue;
    perPage.set(item.path, seen + 1);

    const params = new URLSearchParams({ [SEARCH_PARAM]: rawQuery.trim().slice(0, 120) });
    const base = item.path === '/' ? '' : item.path;
    const href = `/${locale}${base}?${params.toString()}${item.anchor ? `#${item.anchor}` : ''}`;

    hits.push({
      path: item.path,
      href,
      title: item.title,
      section: item.section,
      kind: item.kind,
      score,
      onThisPage: currentPath === item.path,
      matched,
      snippet: snippet(item.text, matched),
    });

    if (hits.length >= MAX_HITS) break;
  }

  return {
    query: rawQuery,
    hits,
    total: scored.length,
    matchedWords: terms.filter((term) => foundAnywhere.has(term)),
    missingWords: terms.filter((term) => !foundAnywhere.has(term)),
  };
}
