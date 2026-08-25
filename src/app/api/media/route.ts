import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { ALLOWED_MIME, maxBytesFor, mediaUrl, type MediaAsset } from '@/lib/builder/media';

/**
 * The media library: list, upload, delete.
 *
 * Reading and writing both require an admin session — the listing exposes what
 * has been uploaded, which is not something a public endpoint should hand out.
 * The bytes themselves are public and served by `/api/media/[id]`, because a
 * published page has to be able to show them.
 */

export const runtime = 'nodejs';

type Row = {
  id: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  filename: string | null;
  alt: string | null;
  created_at: Date | string;
};

function toAsset(row: Row): MediaAsset {
  return {
    id: row.id,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    filename: row.filename,
    alt: row.alt,
    createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
  };
}

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { rows } = await query<Row>(
    `SELECT id, mime, size, width, height, filename, alt, created_at
       FROM media_assets
      ORDER BY created_at DESC
      LIMIT 300`,
  );

  return NextResponse.json({
    assets: rows.map((row) => ({ ...toAsset(row), url: mediaUrl(row.id) })),
  });
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const limited = await enforceRateLimit('media-upload', 60, 60_000);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }

  const mime = file.type;
  if (!ALLOWED_MIME.includes(mime)) {
    return NextResponse.json({ error: 'unsupported_type', mime }, { status: 415 });
  }

  const max = maxBytesFor(mime);
  if (file.size > max) {
    return NextResponse.json({ error: 'too_large', max }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Guard again on the real length: `File.size` is client-reported metadata.
  if (bytes.byteLength > max) {
    return NextResponse.json({ error: 'too_large', max }, { status: 413 });
  }

  const id = createHash('sha256').update(bytes).digest('hex');

  const width = Number(form.get('width')) || null;
  const height = Number(form.get('height')) || null;
  const alt = typeof form.get('alt') === 'string' ? String(form.get('alt')).slice(0, 300) : null;
  const filename = file.name ? file.name.slice(0, 200) : null;

  await query(
    `
    INSERT INTO media_assets (id, mime, bytes, size, width, height, filename, alt, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE
      SET alt = COALESCE(EXCLUDED.alt, media_assets.alt),
          filename = COALESCE(media_assets.filename, EXCLUDED.filename)
    `,
    [id, mime, bytes, bytes.byteLength, width, height, filename, alt, session.uid],
  );

  return NextResponse.json({
    asset: {
      id,
      mime,
      size: bytes.byteLength,
      width,
      height,
      filename,
      alt,
      createdAt: new Date().toISOString(),
      url: mediaUrl(id),
    },
  });
}

export async function DELETE(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[a-f0-9]{64}$/.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  await query('DELETE FROM media_assets WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
