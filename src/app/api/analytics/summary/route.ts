import { NextResponse } from 'next/server';
import { analyticsSummary, toRange } from '@/lib/analytics';
import { getSession } from '@/lib/auth';

/**
 * The numbers behind the admin stats bar.
 *
 * Admin-only: traffic, referrers and the ranking of pages are competitive
 * information, and there is no version of this a visitor needs.
 *
 * `?range=` picks the window — 7, 30, 90 or 365 days. Anything else falls back
 * to the default rather than erroring: the parameter comes from a control in
 * the panel, and a stale bookmark asking for 45 days should show a month, not
 * a failure.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const range = toRange(new URL(request.url).searchParams.get('range'));
  const summary = await analyticsSummary(range);

  return NextResponse.json(
    { summary },
    // Freshly computed per request, never stored by a shared cache.
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
