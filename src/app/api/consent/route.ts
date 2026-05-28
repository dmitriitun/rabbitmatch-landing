import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isLocale, localeCookieName } from '@/i18n/config';

export const VISITOR_COOKIE = 'rm_visitor_id';
export const CONSENT_COOKIE = 'rm_cookie_consent';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const VALID_CHOICES = ['all', 'rejected'] as const;
type Choice = (typeof VALID_CHOICES)[number];

function isChoice(value: unknown): value is Choice {
  return typeof value === 'string' && (VALID_CHOICES as readonly string[]).includes(value);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const choice = (body as { choice?: unknown }).choice;
  if (!isChoice(choice)) {
    return NextResponse.json({ error: 'invalid_choice' }, { status: 400 });
  }

  const jar = await cookies();
  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
  }

  const localeCookie = jar.get(localeCookieName)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : null;

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const userAgent = h.get('user-agent') || null;

  const session = await getSession();
  const userId = session?.uid ?? null;

  await query(
    `INSERT INTO cookie_consents (visitor_id, user_id, choice, locale, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [visitorId, userId, choice, locale, ip, userAgent],
  );

  const cookieOptions = {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  };
  jar.set({ name: VISITOR_COOKIE, value: visitorId, ...cookieOptions });
  jar.set({ name: CONSENT_COOKIE, value: choice, ...cookieOptions });

  return NextResponse.json({ ok: true });
}
