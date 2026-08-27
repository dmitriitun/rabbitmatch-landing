import 'server-only';
import { createHash } from 'node:crypto';
import { query } from './db';
import { locales } from '@/i18n/config';
import {
  DEFAULT_RANGE,
  type AnalyticsRange,
  type AnalyticsSummary,
  type SeriesPoint,
  type Totals,
} from './analytics-shared';

/**
 * Traffic statistics, without a tracking cookie.
 *
 * The site already asks for cookie consent once; adding an analytics
 * identifier to that bargain would mean either a second consent state to
 * honour or numbers that only count the visitors who said yes. Instead a
 * visitor is identified by `sha256(ip + user-agent + day + secret)`, truncated.
 * That hash is stable for one browser for one day, cannot be reversed into an
 * address, and lives only in our own table — nothing is written to the
 * visitor's device, so there is nothing to ask permission for.
 *
 * What it costs: "unique visitors" resets at midnight UTC and two people
 * behind one NAT with the same phone model count once. Every cookieless
 * analytics tool makes the same trade, and for the question this panel
 * answers — is the traffic growing, which pages pull it — it does not matter.
 */

/** One visitor id per browser per day. */
export function visitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.JWT_SECRET ?? 'rabbitmatch';
  return createHash('sha256').update(`${ip}|${userAgent}|${day}|${secret}`).digest('hex').slice(0, 32);
}

/**
 * Crawlers, monitors and scripts.
 *
 * They are the majority of raw hits on a small marketing site, and counting
 * them turns the panel into a measure of how often Googlebot is bored.
 */
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|vkshare|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl\/|wget|python-requests|axios\/|go-http|okhttp|java\/|libwww|scrapy|ahrefs|semrush|mj12|dotbot|petalbot|yandex(?!browser)/i;

export function isBot(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 8) return true;
  return BOT_RE.test(userAgent);
}

/** Strip the locale prefix so both languages aggregate onto one path. */
export function normalizePath(input: string): string | null {
  if (typeof input !== 'string') return null;
  let path = input.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 512) return null;

  // Query strings and fragments are not part of the page's identity here, and
  // keeping them would scatter one page across a dozen rows of UTM noise.
  path = path.split('#')[0].split('?')[0];

  for (const locale of locales) {
    if (path === `/${locale}`) return '/';
    if (path.startsWith(`/${locale}/`)) {
      path = path.slice(locale.length + 1);
      break;
    }
  }

  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

/** Referrers are kept as a bare host: enough to rank sources, no user in it. */
export function referrerHost(referrer: string | null | undefined, selfHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (!host || host === selfHost.replace(/^www\./, '')) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

const DEDUPE_MINUTES = 30;

export type HitInput = {
  path: string;
  locale: string | null;
  visitor: string;
  referrerHost: string | null;
  nodeId: number | null;
};

/**
 * Record one page view, unless this visitor already viewed this page recently.
 *
 * The window makes a refresh, a back-navigation and a bounce-and-return read
 * as one visit, which is what makes the article counters mean "people who
 * read this" rather than "times a tab was reloaded".
 *
 * Returns whether the hit counted — the caller uses it to decide whether the
 * node's lifetime counter moves too.
 */
export async function recordHit(hit: HitInput): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `
    SELECT id FROM page_views
    WHERE visitor = $1 AND path = $2 AND created_at > NOW() - INTERVAL '${DEDUPE_MINUTES} minutes'
    LIMIT 1
    `,
    [hit.visitor, hit.path],
  );
  if (rows.length) return false;

  await query(
    `
    INSERT INTO page_views (path, locale, visitor, referrer_host, node_id)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [hit.path, hit.locale, hit.visitor, hit.referrerHost, hit.nodeId],
  );

  void prune();
  return true;
}

/**
 * Retention, run at most once a day per process.
 *
 * Without it the table is the one thing in this app that grows forever.
 * The window is a year plus five weeks: the panel's longest range is twelve
 * months, and the slack is what keeps "the last 12 months" from losing its
 * oldest month the moment the calendar turns over.
 *
 * Failures are swallowed: a prune that did not run is not a reason to fail a
 * page view.
 */
declare global {
  var __rmLastPrune: number | undefined;
}

export const RETENTION_DAYS = Math.max(
  1,
  Number(process.env.ANALYTICS_RETENTION_DAYS ?? 400) || 400,
);
const DAY_MS = 86_400_000;

async function prune(): Promise<void> {
  const now = Date.now();
  if (global.__rmLastPrune && now - global.__rmLastPrune < DAY_MS) return;
  global.__rmLastPrune = now;
  try {
    await query(`DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`);
  } catch {
    /* the next boot will try again */
  }
}

/* --- Reporting ----------------------------------------------------------- */

/*
  The report's shape lives in `lib/analytics-shared.ts`, because the admin panel
  is a client component and this module is not importable from the browser.
  Re-exported here so server callers have one import to reach for.
*/
export {
  ANALYTICS_RANGES,
  DEFAULT_RANGE,
  toRange,
  type AnalyticsRange,
  type AnalyticsSummary,
  type SeriesPoint,
  type Totals,
} from './analytics-shared';

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const NO_TOTALS: Totals = { views: 0, visitors: 0 };

function emptySummary(range: AnalyticsRange): AnalyticsSummary {
  return {
    range,
    online: 0,
    today: NO_TOTALS,
    yesterday: NO_TOTALS,
    week: NO_TOTALS,
    month: NO_TOTALS,
    year: NO_TOTALS,
    selected: NO_TOTALS,
    series: [],
    seriesUnit: range === 365 ? 'month' : 'day',
    topPaths: [],
    topReferrers: [],
    topArticles: [],
    retentionDays: RETENTION_DAYS,
    available: false,
  };
}

/** `date_trunc(...)::date` arrives as a Date on some drivers and a string on others. */
function dayKey(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

/** The last `count` day keys ending today, oldest first. */
function dayAxis(count: number): string[] {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(new Date(start.getTime() - i * DAY_MS).toISOString().slice(0, 10));
  }
  return out;
}

/** The last twelve month keys ending this month, oldest first. */
function monthAxis(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(month.toISOString().slice(0, 7));
  }
  return out;
}

/**
 * Everything the admin panel shows, for one window.
 *
 * Four queries rather than a dozen: the fixed windows — today, yesterday, 7d,
 * 30d, 365d, the selected range and who is on the site right now — all come
 * out of a single scan with `FILTER`, and the chart, the page ranking and the
 * referrer ranking are one aggregate each. That first scan now covers a year
 * instead of a month, which is why the panel only refreshes on a timer while
 * it is actually open.
 */
export async function analyticsSummary(
  range: AnalyticsRange = DEFAULT_RANGE,
): Promise<AnalyticsSummary> {
  const byMonth = range === 365;

  try {
    const totals = await query<Record<string, string>>(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS today_views,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS today_visitors,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '1 day'
                           AND created_at < date_trunc('day', NOW())) AS yday_views,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '1 day'
                           AND created_at < date_trunc('day', NOW())) AS yday_visitors,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS week_views,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS week_visitors,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS month_views,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS month_visitors,
        COUNT(*) AS year_views,
        COUNT(DISTINCT visitor) AS year_visitors,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${range} days') AS sel_views,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= NOW() - INTERVAL '${range} days') AS sel_visitors,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= NOW() - INTERVAL '5 minutes') AS online
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '365 days'
    `);

    const buckets = await query<{ bucket: Date | string; views: string; visitors: string }>(
      byMonth
        ? `
          SELECT date_trunc('month', created_at)::date AS bucket,
                 COUNT(*) AS views,
                 COUNT(DISTINCT visitor) AS visitors
          FROM page_views
          WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
          GROUP BY 1
          ORDER BY 1
        `
        : `
          SELECT date_trunc('day', created_at)::date AS bucket,
                 COUNT(*) AS views,
                 COUNT(DISTINCT visitor) AS visitors
          FROM page_views
          WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '${range - 1} days'
          GROUP BY 1
          ORDER BY 1
        `,
    );

    const paths = await query<{ path: string; views: string; visitors: string }>(`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '${range} days'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 12
    `);

    const referrers = await query<{ host: string; views: string }>(`
      SELECT referrer_host AS host, COUNT(*) AS views
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '${range} days' AND referrer_host IS NOT NULL
      GROUP BY host
      ORDER BY views DESC
      LIMIT 8
    `);

    const articles = await query<{ path: string; titles: unknown; views: string }>(`
      SELECT path, titles, views
      FROM site_nodes
      WHERE kind = 'article' AND views > 0
      ORDER BY views DESC
      LIMIT 8
    `);

    const row = totals.rows[0] ?? {};

    const found = new Map<string, Totals>();
    for (const entry of buckets.rows) {
      const key = byMonth ? dayKey(entry.bucket).slice(0, 7) : dayKey(entry.bucket);
      found.set(key, { views: num(entry.views), visitors: num(entry.visitors) });
    }

    const axis = byMonth ? monthAxis() : dayAxis(range);
    const series: SeriesPoint[] = axis.map((key) => ({ key, ...(found.get(key) ?? NO_TOTALS) }));

    return {
      range,
      online: num(row.online),
      today: { views: num(row.today_views), visitors: num(row.today_visitors) },
      yesterday: { views: num(row.yday_views), visitors: num(row.yday_visitors) },
      week: { views: num(row.week_views), visitors: num(row.week_visitors) },
      month: { views: num(row.month_views), visitors: num(row.month_visitors) },
      year: { views: num(row.year_views), visitors: num(row.year_visitors) },
      selected: { views: num(row.sel_views), visitors: num(row.sel_visitors) },
      series,
      seriesUnit: byMonth ? 'month' : 'day',
      topPaths: paths.rows.map((r) => ({
        path: r.path,
        views: num(r.views),
        visitors: num(r.visitors),
      })),
      topReferrers: referrers.rows.map((r) => ({ host: r.host, views: num(r.views) })),
      topArticles: articles.rows.map((r) => ({
        path: r.path,
        title: articleTitle(r.titles, r.path),
        views: num(r.views),
      })),
      retentionDays: RETENTION_DAYS,
      available: true,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] summary unavailable', err);
    }
    return emptySummary(range);
  }
}

/** Any locale will do for the admin list; the point is recognising the page. */
function articleTitle(titles: unknown, fallback: string): string {
  if (titles && typeof titles === 'object') {
    for (const locale of locales) {
      const value = (titles as Record<string, unknown>)[locale];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return fallback;
}
