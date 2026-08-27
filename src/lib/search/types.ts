/**
 * Shapes shared between the search engine on the server and the fields in the
 * browser. Kept apart from `index.ts` so a client component can import the
 * types without dragging `server-only` code into its bundle.
 */

export type SearchKind = 'page' | 'section' | 'article' | 'block' | 'legal';

/** One piece of a snippet. `hit` marks the part that matched the query. */
export type SnippetPart = { text: string; hit: boolean };

export type SearchHit = {
  /** Route without the locale prefix, e.g. `/players`. */
  path: string;
  /** Where to send the reader: localised, with the query attached. */
  href: string;
  /** The page this lives on. */
  title: string;
  /** The block within the page, when the match is not the page itself. */
  section?: string;
  kind: SearchKind;
  /** Higher is more relevant. Only meaningful relative to the same query. */
  score: number;
  /** True when the hit is on the page the reader is already looking at. */
  onThisPage: boolean;
  /** Which of the searched words were actually found here. */
  matched: string[];
  snippet: SnippetPart[];
};

export type SearchResponse = {
  query: string;
  /** Hits on the current page, first, in their own group. */
  hits: SearchHit[];
  total: number;
  /** How many of the searched words were found anywhere. */
  matchedWords: string[];
  /** Words the index has never seen — worth telling the reader about. */
  missingWords: string[];
};

/**
 * The query parameter a result link carries.
 *
 * The landing page reads it, highlights every occurrence and scrolls to the
 * first. That is what makes a result a link to *the place*, not just to the
 * page: an anchor only exists where someone happened to put one, and a phrase
 * in the middle of the fourth paragraph never has one.
 */
export const SEARCH_PARAM = 'rmq';

/**
 * Split text into comparable words. Punctuation is not a word.
 *
 * `limit` bounds a *query* — a dozen terms is already an essay, and each one
 * costs a pass over the corpus. It must stay unbounded when tokenising a
 * document: capping there truncates the indexed text to its first few words,
 * which looks exactly like the search working and finding nothing.
 */
export function tokenize(input: string, limit = Number.POSITIVE_INFINITY): string[] {
  const out = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((word) => word.length > 1);
  return out.length > limit ? out.slice(0, limit) : out;
}

/** How many words one query may carry. */
export const MAX_QUERY_TERMS = 12;

/**
 * Do two words count as the same word?
 *
 * Prefix matching rather than a stemmer, because the content is mostly
 * Russian: «правило», «правила», «правилам» and «правилами» share a stem that
 * no amount of English suffix-stripping will find, and they all share a
 * prefix. Four characters is the floor — below it, prefixes stop being
 * evidence of anything («на» would match half the language».
 */
export function wordsMatch(query: string, candidate: string): boolean {
  if (query === candidate) return true;
  if (query.length >= 4 && candidate.startsWith(query)) return true;
  // The other direction covers a reader typing the fuller form than the page
  // uses — searching «правилами» should still find «правило».
  if (candidate.length >= 4 && query.startsWith(candidate)) return true;
  return false;
}
