import 'server-only';
import { createHash } from 'node:crypto';
import { query } from './db';
import { locales } from '@/i18n/config';

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
 * Without it the table is the one thing in this app that grows forever, and
 * the panel never looks further back than 30 days anyway. Failures are
 * swallowed: a prune that did not run is not a reason to fail a page view.
 */
declare global {
  var __rmLastPrune: number | undefined;
}

const RETENTION_DAYS = Number(process.env.ANALYTICS_RETENTION_DAYS ?? 180);
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

export type Totals = { views: number; visitors: number };

export type AnalyticsSummary = {
  online: number;
  today: Totals;
  yesterday: Totals;
  week: Totals;
  month: Totals;
  /** One entry per day, oldest first, gaps filled with zeroes. */
  daily: Array<{ day: string; views: number; visitors: number }>;
  topPaths: Array<{ path: string; views: number; visitors: number }>;
  topReferrers: Array<{ host: string; views: number }>;
  topArticles: Array<{ path: string; title: string; views: number }>;
  /** False when the analytics table is unreachable — the panel says so. */
  available: boolean;
};

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const EMPTY: AnalyticsSummary = {
  online: 0,
  today: { views: 0, visitors: 0 },
  yesterday: { views: 0, visitors: 0 },
  week: { views: 0, visitors: 0 },
  month: { views: 0, visitors: 0 },
  daily: [],
  topPaths: [],
  topReferrers: [],
  topArticles: [],
  available: false,
};

const SERIES_DAYS = 30;

export async function analyticsSummary(): Promise<AnalyticsSummary> {
  try {
    /*
      One scan for every window rather than five queries: the aggregate is
      already reading the last 30 days, and `FILTER` narrows each column out
      of the same pass.
    */
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
        COUNT(*) AS month_views,
        COUNT(DISTINCT visitor) AS month_visitors,
        COUNT(DISTINCT visitor) FILTER (WHERE created_at >= NOW() - INTERVAL '5 minutes') AS online
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '${SERIES_DAYS} days'
    `);

    const daily = await query<{ day: Date | string; views: string; visitors: string }>(`
      SELECT date_trunc('day', created_at)::date AS day,
             COUNT(*) AS views,
             COUNT(DISTINCT visitor) AS visitors
      FROM page_views
      WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '${SERIES_DAYS - 1} days'
      GROUP BY 1
      ORDER BY 1
    `);

    const paths = await query<{ path: string; views: string; visitors: string }>(`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '${SERIES_DAYS} days'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 12
    `);

    const referrers = await query<{ host: string; views: string }>(`
      SELECT referrer_host AS host, COUNT(*) AS views
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '${SERIES_DAYS} days' AND referrer_host IS NOT NULL
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

    const byDay = new Map<string, { views: number; visitors: number }>();
    for (const entry of daily.rows) {
      const key =
        entry.day instanceof Date ? entry.day.toISOString().slice(0, 10) : String(entry.day).slice(0, 10);
      byDay.set(key, { views: num(entry.views), visitors: num(entry.visitors) });
    }

    const series: AnalyticsSummary['daily'] = [];
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    for (let i = SERIES_DAYS - 1; i >= 0; i -= 1) {
      const day = new Date(start.getTime() - i * DAY_MS).toISOString().slice(0, 10);
      series.push({ day, ...(byDay.get(day) ?? { views: 0, visitors: 0 }) });
    }

    return {
      online: num(row.online),
      today: { views: num(row.today_views), visitors: num(row.today_visitors) },
      yesterday: { views: num(row.yday_views), visitors: num(row.yday_visitors) },
      week: { views: num(row.week_views), visitors: num(row.week_visitors) },
      month: { views: num(row.month_views), visitors: num(row.month_visitors) },
      daily: series,
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
      available: true,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] summary unavailable', err);
    }
    return EMPTY;
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
