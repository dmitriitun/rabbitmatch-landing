import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Serve an uploaded asset.
 *
 * Public — a published page has to be able to show its images — and cached
 * forever, which is safe because the id *is* the SHA-256 of the bytes: the
 * response for a given URL can never change. Editing an image produces a new
 * id and therefore a new URL, so there is nothing to invalidate.
 */

export const runtime = 'nodejs';

type Row = { mime: string; bytes: Buffer; size: number };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"${id}"`;
  // The content is immutable, so a conditional request never needs the body.
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  let row: Row | undefined;
  try {
    const result = await query<Row>('SELECT mime, bytes, size FROM media_assets WHERE id = $1', [id]);
    row = result.rows[0];
  } catch {
    return new NextResponse(null, { status: 503 });
  }

  if (!row) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(row.bytes), {
    status: 200,
    headers: {
      'Content-Type': row.mime,
      'Content-Length': String(row.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      // The stored MIME type is the only one the browser may use. Without
      // this an upload that sniffs as HTML would run as a page on this origin.
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}
