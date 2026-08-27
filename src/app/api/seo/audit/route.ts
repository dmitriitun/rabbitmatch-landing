import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth';
import { isLocale, defaultLocale, type Locale } from '@/i18n/config';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { auditPage } from '@/lib/seo/audit';
import { siteUrl } from '@/lib/site';

/**
 * SEO and answer-engine audit of one page, on demand.
 *
 * Admin-only, and rate limited on top of that: the handler makes three
 * outbound HTTP requests per call, one of which is a full page render. Left
 * open it would be a neat way to make the site fetch itself in a loop.
 *
 * The origin comes from the request rather than from `NEXT_PUBLIC_APP_URL`, so
 * an audit run on a preview deployment reads the preview and not production.
 * It is validated against the request's own host precisely because it is
 * attacker-controllable in principle — this endpoint must never be usable to
 * fetch a third-party URL on the server's behalf.
 */

export const dynamic = 'force-dynamic';

/** Route path without the locale prefix: `/`, `/players`, `/learn/rules/…`. */
const PATH_RE = /^\/(?:[a-z0-9-]{1,60}(?:\/[a-z0-9-]{1,60}){0,7})?$/;

async function requestOrigin(): Promise<string> {
  const head = await headers();
  const host = head.get('host');
  if (!host || !/^[a-z0-9.:-]{1,255}$/i.test(host)) return siteUrl;
  const proto =
    head.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const ip = await getClientIp();
  if (!rateLimit(`seo-audit:${ip}`, 20, 60_000).ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const path = params.get('path') ?? '/';
  if (!PATH_RE.test(path)) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 });
  }

  const raw = params.get('locale');
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const audit = await auditPage(await requestOrigin(), locale, path);

  return NextResponse.json({ audit }, { headers: { 'Cache-Control': 'private, no-store' } });
}
