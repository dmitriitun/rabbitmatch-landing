import { NextResponse } from 'next/server';
import { defaultLocale, isLocale, type Locale } from '@/i18n/config';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { search } from '@/lib/search';
import { normalizePath } from '@/lib/analytics';

/**
 * Site search.
 *
 * Public, because everything it can return is already public: it reads the same
 * copy, builder documents and knowledge-base pages a visitor can reach by
 * clicking. Hidden tree nodes and hidden sections are excluded when the index
 * is built, not here — filtering at query time is the kind of thing that gets
 * forgotten on the second code path.
 *
 * Rate limited because it is the one public endpoint that does real work per
 * call, and generously so, because a person typing into a live search field
 * legitimately fires it once a keystroke.
 */

export const dynamic = 'force-dynamic';

const MAX_QUERY = 120;

export async function GET(request: Request): Promise<Response> {
  const ip = await getClientIp();
  if (!rateLimit(`search:${ip}`, 90, 60_000).ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const params = new URL(request.url).searchParams;
  const q = (params.get('q') ?? '').slice(0, MAX_QUERY);

  const raw = params.get('locale');
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  // The page the reader is on, so its own matches can be ranked first. It is
  // a hint, not a permission — an invalid one simply drops the boost.
  const from = normalizePath(params.get('path') ?? '');

  const results = await search(locale, q, from);

  return NextResponse.json(results, {
    // Per-visitor and cheap to recompute; a shared cache would mostly serve
    // one person's query to the next person.
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
