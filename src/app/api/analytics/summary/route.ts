import { NextResponse } from 'next/server';
import { analyticsSummary } from '@/lib/analytics';
import { getSession } from '@/lib/auth';

/**
 * The numbers behind the admin stats bar.
 *
 * Admin-only: traffic, referrers and the ranking of pages are competitive
 * information, and there is no version of this a visitor needs.
 */
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const summary = await analyticsSummary();
  return NextResponse.json(
    { summary },
    // Freshly computed per request, never stored by a shared cache.
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
