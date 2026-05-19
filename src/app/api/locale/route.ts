import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isLocale, localeCookieName } from '@/i18n/config';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const locale = (body as { locale?: unknown }).locale;
  if (typeof locale !== 'string' || !isLocale(locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }

  const jar = await cookies();
  jar.set({
    name: localeCookieName,
    value: locale,
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return NextResponse.json({ ok: true, locale });
}
