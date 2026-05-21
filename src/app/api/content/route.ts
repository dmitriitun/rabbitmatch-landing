import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isLocale } from '@/i18n/config';

type OverrideRow = {
  locale: string;
  key: string;
  value: string;
  updated_at: string;
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale');

  const params: unknown[] = [];
  let sql = 'SELECT locale, key, value, updated_at FROM content_overrides';
  if (localeParam) {
    if (!isLocale(localeParam)) {
      return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
    }
    sql += ' WHERE locale = $1';
    params.push(localeParam);
  }
  sql += ' ORDER BY locale, key';

  const { rows } = await query<OverrideRow>(sql, params);
  return NextResponse.json({ overrides: rows });
}

export async function PUT(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const locale = (body as { locale?: unknown }).locale;
  const key = (body as { key?: unknown }).key;
  const value = (body as { value?: unknown }).value;

  if (typeof locale !== 'string' || !isLocale(locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }
  if (typeof key !== 'string' || !key.trim()) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
  }
  if (typeof value !== 'string') {
    return NextResponse.json({ error: 'invalid_value' }, { status: 400 });
  }

  await query(
    `
    INSERT INTO content_overrides (locale, key, value, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (locale, key)
    DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    `,
    [locale, key.trim(), value, session.uid],
  );

  return NextResponse.json({ ok: true });
}
