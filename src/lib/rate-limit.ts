import 'server-only';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Lightweight in-memory rate limiter.
 *
 * The landing runs as a single always-on instance, so a process-local Map is
 * sufficient and avoids adding Redis/infra. Buckets are fixed-window: a client
 * gets `limit` requests per `windowMs`, then 429 until the window resets.
 * Not shared across instances — if the app is ever scaled horizontally this
 * should move to a shared store.
 */

type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __rmRateBuckets: Map<string, Bucket> | undefined;
}

function store(): Map<string, Bucket> {
  if (!global.__rmRateBuckets) {
    global.__rmRateBuckets = new Map();
  }
  return global.__rmRateBuckets;
}

/** Best-effort real client IP. Cloudflare sets `cf-connecting-ip`. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

export type RateResult = { ok: boolean; remaining: number; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const buckets = store();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map can't grow unbounded under scanning.
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/**
 * Enforce a rate limit for the current request, keyed by route name + client IP.
 * Returns a 429 `NextResponse` when the limit is exceeded, or `null` to proceed.
 */
export async function enforceRateLimit(
  name: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const ip = await getClientIp();
  const result = rateLimit(`${name}:${ip}`, limit, windowMs);
  if (!result.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
    );
  }
  return null;
}
