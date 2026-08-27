/**
 * The shape of the traffic report, shared between server and browser.
 *
 * `lib/analytics.ts` is `server-only` — it imports `node:crypto` and the pg
 * pool — so the admin panel cannot import from it. Everything the panel needs
 * in order to *ask* for a report and *render* one lives here instead: the set
 * of windows it can pick from, and the type of the answer.
 *
 * Both halves import these names from this file, which is what stops the
 * client's idea of a range from drifting from the server's.
 */

export type Totals = { views: number; visitors: number };

/**
 * The windows the panel offers.
 *
 * A year is the point of the list: week-over-week tells you whether last
 * Tuesday's post landed, and nothing shorter than twelve months can tell you
 * whether the site is seasonal — which, for a racket-sport product, it is.
 */
export const ANALYTICS_RANGES = [7, 30, 90, 365] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export const DEFAULT_RANGE: AnalyticsRange = 30;

export function toRange(value: unknown): AnalyticsRange {
  const n = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(n) ? (n as AnalyticsRange) : DEFAULT_RANGE;
}

/** One bucket of the traffic chart. `key` is a `YYYY-MM-DD` or a `YYYY-MM`. */
export type SeriesPoint = { key: string; views: number; visitors: number };

export type AnalyticsSummary = {
  /** The window `selected`, `series` and the two rankings were computed over. */
  range: AnalyticsRange;
  online: number;
  today: Totals;
  yesterday: Totals;
  week: Totals;
  month: Totals;
  /** The last 365 days. Always present, whatever range is selected. */
  year: Totals;
  /** Totals for the selected range. */
  selected: Totals;
  /**
   * The chart, oldest first, gaps filled with zeroes. Days for the short
   * ranges; months for the year, because 365 bars in a 280px panel is a
   * texture rather than a chart.
   */
  series: SeriesPoint[];
  seriesUnit: 'day' | 'month';
  topPaths: Array<{ path: string; views: number; visitors: number }>;
  topReferrers: Array<{ host: string; views: number }>;
  topArticles: Array<{ path: string; title: string; views: number }>;
  /** How far back the traffic table is kept, in days. Shown in the footnote. */
  retentionDays: number;
  /** False when the analytics table is unreachable — the panel says so. */
  available: boolean;
};
