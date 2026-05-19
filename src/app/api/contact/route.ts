import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { query } from '@/lib/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof (body as { name?: unknown }).name === 'string'
    ? (body as { name: string }).name.trim()
    : '';
  const email = typeof (body as { email?: unknown }).email === 'string'
    ? (body as { email: string }).email.trim().toLowerCase()
    : '';
  const message = typeof (body as { message?: unknown }).message === 'string'
    ? (body as { message: string }).message.trim()
    : '';
  const locale = typeof (body as { locale?: unknown }).locale === 'string'
    ? (body as { locale: string }).locale
    : null;
  const source = typeof (body as { source?: unknown }).source === 'string'
    ? (body as { source: string }).source
    : null;

  if (name.length < 1 || name.length > 200) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (message.length < 1 || message.length > 5000) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  }

  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null;
  const userAgent = h.get('user-agent') || null;

  await query(
    `INSERT INTO contact_requests (name, email, message, locale, source, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [name, email, message, locale, source, ip, userAgent],
  );

  return NextResponse.json({ ok: true });
}
