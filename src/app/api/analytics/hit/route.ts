import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  isBot,
  normalizePath,
  recordHit,
  referrerHost,
  visitorHash,
} from '@/lib/analytics';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { isLocale } from '@/i18n/config';
import { siteUrl } from '@/lib/site';
import { bumpNodeViews, loadNodes } from '@/lib/tree/store';

/**
 * One page view, reported by the browser.
 *
 * Counting on the server during render was the other option and it does not
 * work here: pages are prerendered and cached, so the render that would do the
 * counting mostly does not happen. A beacon from the browser counts the thing
 * that actually occurred — a person opened the page — and keeps the pages
 * static.
 *
 * The response is deliberately uninformative. Anyone can post here, so it says
 * `{ ok: true }` whether the hit counted, was a duplicate within the dedupe
 * window, or was dropped as a bot: a caller who can tell those apart can probe
 * for which visitors have been seen.
 */

const OK = NextResponse.json({ ok: true });

export async function POST(request: Request): Promise<Response> {
  const ip = await getClientIp();

  // Generous, because a real person clicking through a section legitimately
  // fires this a few times a minute — but bounded, because the endpoint writes.
  if (!rateLimit(`analytics-hit:${ip}`, 60, 60_000).ok) {
    return NextResponse.json({ ok: true }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return OK;
  }

  const path = normalizePath(typeof body.path === 'string' ? body.path : '');
  if (!path) return OK;

  const head = await headers();
  const userAgent = head.get('user-agent') ?? '';
  if (isBot(userAgent)) return OK;

  const locale = typeof body.locale === 'string' && isLocale(body.locale) ? body.locale : null;
  const referrer = typeof body.referrer === 'string' ? body.referrer : null;

  try {
    // Only tree pages carry a lifetime counter; the hand-written pages are in
    // the traffic table like everything else, they just have nothing to bump.
    const nodes = await loadNodes();
    const node = nodes.find((candidate) => candidate.path === path) ?? null;

    const counted = await recordHit({
      path,
      locale,
      visitor: visitorHash(ip, userAgent),
      referrerHost: referrerHost(referrer, new URL(siteUrl).hostname),
      nodeId: node?.id ?? null,
    });

    if (counted && node) await bumpNodeViews(node.id);
  } catch (err) {
    // A page view is never worth an error in the visitor's console.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] hit dropped', err);
    }
  }

  return OK;
}
