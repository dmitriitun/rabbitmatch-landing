import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateSearchIndex } from '@/lib/search';
import { getSession } from '@/lib/auth';
import { locales, type Locale } from '@/i18n/config';
import {
  createNode,
  deleteNode,
  ensureCodePageNode,
  loadNodes,
  moveNode,
  TreeConflict,
  updateNode,
} from '@/lib/tree/store';
import { NODE_KINDS, type LocaleText, type NodeKind } from '@/lib/tree/types';

/**
 * The tree editor's API.
 *
 * Every method is admin-only, including the read: the manager shows hidden
 * nodes, and a hidden node is hidden because the admin is not ready for it to
 * be public. Visitors never call this — pages read the tree on the server.
 */

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

async function requireAdmin(): Promise<{ uid: number } | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.isAdmin) return forbidden();
  return { uid: session.uid };
}

function localeText(value: unknown): LocaleText | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: LocaleText = {};
  for (const locale of locales) {
    const raw = (value as Record<string, unknown>)[locale];
    if (typeof raw === 'string') out[locale as Locale] = raw.trim().slice(0, 400);
  }
  return out;
}

function nodeId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function kind(value: unknown): NodeKind | undefined {
  return NODE_KINDS.includes(value as NodeKind) ? (value as NodeKind) : undefined;
}

function bool(value: unknown): boolean | undefined {
  return value === true ? true : value === false ? false : undefined;
}

/** One place to decide what a failed tree write means to the caller. */
function conflictResponse(err: unknown): NextResponse {
  if (err instanceof TreeConflict) {
    const status = err.reason === 'not_found' ? 404 : 409;
    return NextResponse.json({ error: err.reason }, { status });
  }
  console.error('[site-tree] write failed', err);
  return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
}

/**
 * Menu items and page paths are baked into every prerendered page — the header
 * renders them and the router resolves them — so a tree write has to flush the
 * whole route cache, not one path.
 */
function flush(): void {
  revalidatePath('/', 'layout');
  // Published copy is searchable copy: without this the index keeps the old
  // wording until its TTL expires, and an admin cannot find what they just saved.
  invalidateSearchIndex();
}

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const nodes = await loadNodes();
  return NextResponse.json({ nodes });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const titles = localeText(body.titles) ?? {};
  if (!locales.some((locale) => titles[locale])) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  /*
    Attaching the tree to a hand-written route.

    Separate from the ordinary create because it is idempotent and because it
    is the one path allowed to take a reserved slug. The manager calls it right
    before adding the first sub-page under, say, "Игрокам"; every call after
    that just hands the same row back.
  */
  if (body.action === 'attach-code-page') {
    try {
      const node = await ensureCodePageNode(String(body.slug ?? ''), titles, auth.uid);
      flush();
      return NextResponse.json({ node });
    } catch (err) {
      return conflictResponse(err);
    }
  }

  try {
    const node = await createNode(
      {
        parentId: nodeId(body.parentId),
        slug: typeof body.slug === 'string' ? body.slug : undefined,
        kind: kind(body.kind) ?? 'category',
        titles,
        summaries: localeText(body.summaries),
        inNav: bool(body.inNav),
      },
      auth.uid,
    );
    flush();
    return NextResponse.json({ node });
  } catch (err) {
    return conflictResponse(err);
  }
}

/**
 * Edit or move.
 *
 * Both are a PATCH because both are "change this node": `action: 'move'`
 * carries a new parent and a new neighbour, everything else is a field edit.
 * Splitting them across two routes would mean two round trips for the common
 * gesture of dragging a node and renaming it.
 */
export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const id = nodeId(body.id);
  if (id === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  try {
    if (body.action === 'move') {
      await moveNode(id, nodeId(body.parentId), nodeId(body.beforeId));
      flush();
      const nodes = await loadNodes();
      return NextResponse.json({ nodes });
    }

    const node = await updateNode(id, {
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      kind: kind(body.kind),
      titles: localeText(body.titles),
      summaries: localeText(body.summaries),
      inNav: bool(body.inNav),
      hidden: bool(body.hidden),
      openByDefault: bool(body.openByDefault),
    });
    flush();
    return NextResponse.json({ node });
  } catch (err) {
    return conflictResponse(err);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const id = nodeId(new URL(request.url).searchParams.get('id'));
  if (id === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  try {
    const removed = await deleteNode(id);
    flush();
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return conflictResponse(err);
  }
}
