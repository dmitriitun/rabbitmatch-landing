import 'server-only';
import type { PoolClient } from 'pg';
import { query, withClient } from '@/lib/db';
import { locales, type Locale } from '@/i18n/config';
import {
  buildTree,
  childPath,
  RESERVED_SLUGS,
  SLUG_RE,
  nodeSummary,
  nodeTitle,
  slugify,
  type LocaleText,
  type NavSection,
  type NodeKind,
  type SiteNode,
  type TreeNode,
} from './types';

/**
 * Reading and writing the site tree.
 *
 * Same contract as `lib/builder/store.ts` and `lib/content.ts`: cache the
 * parsed result, fall back to an empty tree when the database is unreachable
 * so a build without `DATABASE_URL` still succeeds, and expose one explicit
 * invalidation that every writer calls.
 *
 * The tree is small — tens of rows, a few kilobytes — so it is read whole and
 * shaped in memory. That is what makes "resolve this URL", "render this
 * section", "build the menu" and "draw the breadcrumbs" one query between
 * them instead of four.
 */

type Row = {
  id: string | number;
  parent_id: string | number | null;
  slug: string;
  path: string;
  kind: string;
  titles: unknown;
  summaries: unknown;
  position: number;
  in_nav: boolean;
  hidden: boolean;
  open_by_default: boolean;
  views: string | number;
  updated_at: Date | string | null;
};

const TTL_MS = Number(process.env.CONTENT_CACHE_TTL_MS ?? 60_000);

declare global {
  var __rmTreeCache: { at: number; nodes: SiteNode[] } | undefined;
}

export function invalidateTreeCache(): void {
  global.__rmTreeCache = undefined;
}

/** `bigint` comes back from node-postgres as a string; counters must be numbers. */
function int(value: string | number | null): number {
  if (value === null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function localeText(value: unknown): LocaleText {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: LocaleText = {};
  for (const locale of locales) {
    const raw = (value as Record<string, unknown>)[locale];
    if (typeof raw === 'string' && raw.trim()) out[locale] = raw.slice(0, 400);
  }
  return out;
}

function toNode(row: Row): SiteNode {
  return {
    id: int(row.id),
    parentId: row.parent_id === null ? null : int(row.parent_id),
    slug: row.slug,
    path: row.path,
    kind: row.kind === 'article' ? 'article' : 'category',
    titles: localeText(row.titles),
    summaries: localeText(row.summaries),
    position: int(row.position),
    inNav: row.in_nav === true,
    hidden: row.hidden === true,
    openByDefault: row.open_by_default === true,
    views: int(row.views),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

const SELECT = `
  SELECT id, parent_id, slug, path, kind, titles, summaries, position,
         in_nav, hidden, open_by_default, views, updated_at
  FROM site_nodes
  ORDER BY position, id
`;

/** Every node, hidden ones included. Cached; the tree changes rarely. */
export async function loadNodes(): Promise<SiteNode[]> {
  const hit = global.__rmTreeCache;
  const now = Date.now();
  if (hit && now - hit.at < TTL_MS) return hit.nodes;

  try {
    const { rows } = await query<Row>(SELECT);
    const nodes = rows.map(toNode);
    global.__rmTreeCache = { at: now, nodes };
    return nodes;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[tree] failed to load site tree, rendering none', err);
    }
    return [];
  }
}

/**
 * The public tree: hidden nodes and everything below them removed.
 *
 * `includeHidden` is for the admin tree manager, which has to show what it
 * lets you unhide.
 */
export async function loadTree(includeHidden = false): Promise<TreeNode[]> {
  const nodes = await loadNodes();
  return buildTree(includeHidden ? nodes : nodes.filter((node) => !node.hidden));
}

/** Top-level nodes flagged for the header, with one level of children. */
export async function loadNavTree(): Promise<TreeNode[]> {
  const tree = await loadTree();
  return tree.filter((node) => node.inNav);
}

/** How many sub-pages a menu dropdown shows before it stops being a menu. */
const NAV_CHILDREN = 8;

/** The header's menu items, flattened to labels for the client component. */
export async function loadNavSections(locale: Locale): Promise<NavSection[]> {
  const sections = await loadNavTree();
  return sections.map((section) => ({
    path: section.path,
    title: nodeTitle(section, locale),
    children: section.children.slice(0, NAV_CHILDREN).map((child) => ({
      path: child.path,
      title: nodeTitle(child, locale),
      summary: nodeSummary(child, locale),
    })),
  }));
}

/* --- Writes -------------------------------------------------------------- */

export type TreeError =
  | 'not_found'
  | 'reserved_slug'
  | 'invalid_slug'
  | 'cycle'
  | 'duplicate';

export class TreeConflict extends Error {
  constructor(public readonly reason: TreeError) {
    super(reason);
  }
}

function cleanTitles(value: unknown): LocaleText {
  return localeText(value);
}

/**
 * A slug that is legal, and free among its siblings.
 *
 * Collisions are resolved by suffixing rather than rejected: an admin adding
 * "Правила" under two different sections should not have to invent
 * "pravila-2" themselves, and the second one silently failing to save would
 * be worse than either.
 */
async function uniqueSlug(
  desired: string,
  parentId: number | null,
  exceptId: number | null,
): Promise<string> {
  const base = SLUG_RE.test(desired) ? desired : slugify(desired);
  if (!base) throw new TreeConflict('invalid_slug');
  if (parentId === null && RESERVED_SLUGS.has(base)) throw new TreeConflict('reserved_slug');

  const nodes = await loadNodes();
  const taken = new Set(
    nodes
      .filter((node) => node.parentId === parentId && node.id !== exceptId)
      .map((node) => node.slug),
  );

  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 60);
    if (!taken.has(candidate)) return candidate;
  }
  throw new TreeConflict('duplicate');
}

export type CreateInput = {
  parentId: number | null;
  slug?: string;
  kind: NodeKind;
  titles: LocaleText;
  summaries?: LocaleText;
  inNav?: boolean;
};

export async function createNode(input: CreateInput, userId: number): Promise<SiteNode> {
  const nodes = await loadNodes();
  const parent = input.parentId === null ? null : nodes.find((n) => n.id === input.parentId);
  if (input.parentId !== null && !parent) throw new TreeConflict('not_found');

  const titles = cleanTitles(input.titles);
  const fallbackTitle = locales.map((l) => titles[l]).find(Boolean) ?? 'page';
  const slug = await uniqueSlug(input.slug?.trim() || slugify(fallbackTitle), input.parentId, null);
  const path = childPath(parent?.path ?? null, slug);

  const position =
    nodes
      .filter((n) => n.parentId === input.parentId)
      .reduce((max, n) => Math.max(max, n.position), 0) + 10;

  const { rows } = await query<Row>(
    `
    INSERT INTO site_nodes
      (parent_id, slug, path, kind, titles, summaries, position, in_nav, created_by)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
    RETURNING id, parent_id, slug, path, kind, titles, summaries, position,
              in_nav, hidden, open_by_default, views, updated_at
    `,
    [
      input.parentId,
      slug,
      path,
      input.kind,
      JSON.stringify(titles),
      JSON.stringify(cleanTitles(input.summaries)),
      position,
      // Only a top-level node can be a menu item; a child appears in its
      // parent's dropdown by being a child, not by being flagged.
      input.parentId === null ? input.inNav === true : false,
      userId,
    ],
  );

  invalidateTreeCache();
  return toNode(rows[0]);
}

export type UpdateInput = {
  slug?: string;
  kind?: NodeKind;
  titles?: LocaleText;
  summaries?: LocaleText;
  inNav?: boolean;
  hidden?: boolean;
  openByDefault?: boolean;
};

/**
 * Update one node, rewriting the subtree's paths when the slug moves.
 *
 * The rewrite touches `page_layouts` in the same transaction. A builder
 * document is keyed by page path, so renaming a section without moving its
 * documents would silently blank every page under it — the content would
 * still be in the table, addressed by a URL that no longer exists.
 */
export async function updateNode(id: number, patch: UpdateInput): Promise<SiteNode> {
  const nodes = await loadNodes();
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new TreeConflict('not_found');

  const nextSlug =
    patch.slug !== undefined && patch.slug.trim() && patch.slug.trim() !== node.slug
      ? await uniqueSlug(patch.slug.trim(), node.parentId, node.id)
      : node.slug;

  const parent = node.parentId === null ? null : nodes.find((n) => n.id === node.parentId);
  const nextPath = childPath(parent?.path ?? null, nextSlug);

  const updated = await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      if (nextPath !== node.path) {
        await rewritePaths(client, node.path, nextPath);
      }

      const { rows } = await client.query<Row>(
        `
        UPDATE site_nodes SET
          slug = $2,
          path = $3,
          kind = COALESCE($4, kind),
          titles = COALESCE($5::jsonb, titles),
          summaries = COALESCE($6::jsonb, summaries),
          in_nav = CASE WHEN parent_id IS NULL THEN COALESCE($7, in_nav) ELSE FALSE END,
          hidden = COALESCE($8, hidden),
          open_by_default = COALESCE($9, open_by_default),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, parent_id, slug, path, kind, titles, summaries, position,
                  in_nav, hidden, open_by_default, views, updated_at
        `,
        [
          id,
          nextSlug,
          nextPath,
          patch.kind ?? null,
          patch.titles ? JSON.stringify(cleanTitles(patch.titles)) : null,
          patch.summaries ? JSON.stringify(cleanTitles(patch.summaries)) : null,
          patch.inNav ?? null,
          patch.hidden ?? null,
          patch.openByDefault ?? null,
        ],
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });

  invalidateTreeCache();
  return toNode(updated);
}

/** Re-point a path prefix — the node itself and everything under it. */
async function rewritePaths(
  client: PoolClient,
  from: string,
  to: string,
): Promise<void> {
  // Slugs are `[a-z0-9-]`, so a path can never contain a LIKE wildcard.
  const params = [from, to, `${from}/%`];
  await client.query(
    `
    UPDATE site_nodes
    SET path = $2 || substring(path from length($1) + 1), updated_at = NOW()
    WHERE path = $1 OR path LIKE $3
    `,
    params,
  );
  await client.query(
    `
    UPDATE page_layouts
    SET page = $2 || substring(page from length($1) + 1)
    WHERE page = $1 OR page LIKE $3
    `,
    params,
  );
}

/**
 * Move a node: to a new parent, to a new position among its siblings, or both.
 *
 * `beforeId` names the sibling to land in front of — `null` means "last".
 * Positions are renumbered in tens on every move, so the next insert between
 * two nodes has room without a second pass.
 */
export async function moveNode(
  id: number,
  parentId: number | null,
  beforeId: number | null,
): Promise<void> {
  const nodes = await loadNodes();
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new TreeConflict('not_found');

  const parent = parentId === null ? null : nodes.find((n) => n.id === parentId);
  if (parentId !== null && !parent) throw new TreeConflict('not_found');

  // A node cannot become its own ancestor; the path prefix says so directly.
  if (parent && (parent.id === id || parent.path.startsWith(`${node.path}/`))) {
    throw new TreeConflict('cycle');
  }

  const slug = parentId === node.parentId ? node.slug : await uniqueSlug(node.slug, parentId, id);
  const nextPath = childPath(parent?.path ?? null, slug);

  const siblings = nodes
    .filter((n) => n.parentId === parentId && n.id !== id)
    .sort((a, b) => a.position - b.position || a.id - b.id);

  const at = beforeId === null ? siblings.length : siblings.findIndex((n) => n.id === beforeId);
  const ordered = [...siblings];
  ordered.splice(at < 0 ? siblings.length : at, 0, { ...node, parentId, slug, path: nextPath });

  await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      if (nextPath !== node.path) await rewritePaths(client, node.path, nextPath);

      await client.query(
        `UPDATE site_nodes SET parent_id = $2, slug = $3, path = $4,
           in_nav = CASE WHEN $2::bigint IS NULL THEN in_nav ELSE FALSE END,
           updated_at = NOW()
         WHERE id = $1`,
        [id, parentId, slug, nextPath],
      );

      for (let i = 0; i < ordered.length; i += 1) {
        await client.query('UPDATE site_nodes SET position = $2 WHERE id = $1', [
          ordered[i].id,
          (i + 1) * 10,
        ]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });

  invalidateTreeCache();
}

/**
 * Delete a node and everything under it.
 *
 * `ON DELETE CASCADE` takes the rows; the builder documents for those paths
 * have to go explicitly, or a future node reusing the path would inherit a
 * deleted page's content.
 */
export async function deleteNode(id: number): Promise<number> {
  const nodes = await loadNodes();
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new TreeConflict('not_found');

  const removed = await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const { rowCount } = await client.query(
        'DELETE FROM site_nodes WHERE path = $1 OR path LIKE $2',
        [node.path, `${node.path}/%`],
      );
      await client.query('DELETE FROM page_layouts WHERE page = $1 OR page LIKE $2', [
        node.path,
        `${node.path}/%`,
      ]);
      await client.query('COMMIT');
      return rowCount ?? 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });

  invalidateTreeCache();
  return removed;
}

/* --- Views --------------------------------------------------------------- */

/**
 * Bump one node's lifetime view counter.
 *
 * Deliberately not cache-invalidating: the counter is decoration, and
 * dropping the whole tree from cache on every article read would turn a
 * cached tree into a per-request query.
 */
export async function bumpNodeViews(id: number): Promise<void> {
  await query('UPDATE site_nodes SET views = views + 1 WHERE id = $1', [id]);
}
