import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { isLocale } from '@/i18n/config';
import { isBuilderPage, normalizeDoc } from '@/lib/builder/normalize';
import { loadBuilderDoc, saveBuilderDoc } from '@/lib/builder/store';

/**
 * Read and write the builder document for one (page, locale).
 *
 * The whole document is sent on every save rather than a diff. A landing page
 * layout is a few kilobytes of JSON, the editor already holds it in memory for
 * undo, and one atomic write removes every question about partial saves and
 * concurrent section edits.
 */

export async function GET(request: Request): Promise<Response> {
  const limited = await enforceRateLimit('builder-read', 60, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const page = url.searchParams.get('page');
  const locale = url.searchParams.get('locale');

  if (!isBuilderPage(page)) {
    return NextResponse.json({ error: 'invalid_page' }, { status: 400 });
  }
  if (!isLocale(locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }

  const doc = await loadBuilderDoc(page, locale);
  return NextResponse.json({ doc });
}

export async function PUT(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { page, locale, doc } = (body ?? {}) as Record<string, unknown>;

  if (!isBuilderPage(page)) {
    return NextResponse.json({ error: 'invalid_page' }, { status: 400 });
  }
  if (typeof locale !== 'string' || !isLocale(locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }

  // Everything that reaches storage goes through the normaliser, so the
  // renderer can treat the stored document as already-validated.
  const clean = normalizeDoc(doc);

  try {
    await saveBuilderDoc(page, locale, clean, session.uid);
  } catch (err) {
    // A database that is down is not the admin's fault and not an auth
    // problem; say which it is so the editor can show something useful
    // instead of asking them to sign in again.
    console.error('[builder] save failed', err);
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
  }

  // Pages are prerendered; dropping the in-memory cache is not enough on its
  // own. Same reasoning as `PUT /api/content`.
  revalidatePath('/', 'layout');

  return NextResponse.json({ ok: true, doc: clean });
}
