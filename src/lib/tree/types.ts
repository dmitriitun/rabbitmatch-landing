import { locales, type Locale } from '@/i18n/config';

/**
 * The site tree: menu items an admin created, their sub-pages, and the
 * folders in between.
 *
 * The hand-written pages (`/players`, `/pricing`, …) are one page per route,
 * declared in code. This is the other half: a section an admin invents at
 * runtime, with as many levels below it as the content wants. A knowledge
 * base is the reason it exists — a guide belongs inside a topic, a topic
 * inside a section — and the shape that fits that is a tree with no depth
 * limit, the way a forum has no depth limit.
 *
 * Two kinds, and the difference is what the page *does*, not what it holds:
 *
 * - `category` — an index. It renders whatever the builder put on it, then
 *   the tree of everything underneath, collapsible group by group.
 * - `article` — a leaf. It renders its builder document as a document, with a
 *   view counter, breadcrumbs and links to its siblings.
 *
 * A category with no children still renders as an index (an empty one), and an
 * article with children still lists them — the kind is the admin's statement
 * of intent, not a fact derived from the data.
 */

export type NodeKind = 'category' | 'article';

export const NODE_KINDS: readonly NodeKind[] = ['category', 'article'];

/** Per-locale strings. A missing locale falls back rather than blanking out. */
export type LocaleText = Partial<Record<Locale, string>>;

export type SiteNode = {
  id: number;
  parentId: number | null;
  slug: string;
  /** Materialised full path without the locale prefix: `/learn/rules`. */
  path: string;
  kind: NodeKind;
  titles: LocaleText;
  summaries: LocaleText;
  position: number;
  /** Top-level only: appears in the header menu. */
  inNav: boolean;
  hidden: boolean;
  openByDefault: boolean;
  /**
   * This node stands for a page that exists in `app/`, and holds sub-pages
   * under it.
   *
   * `/players` is a route with its own file, and the router will always answer
   * it — this row never renders. What it does is give the tree somewhere to
   * hang `/players/kak-vybrat-raketku`, which nothing in `app/` can express,
   * and give that page a breadcrumb trail that leads back to the real one.
   *
   * The distinction is load-bearing in three places: a code page must not go
   * into the sitemap twice, must not appear in the header menu twice, and must
   * never have its slug edited — the slug is the route.
   */
  codePage: boolean;
  views: number;
  updatedAt: string | null;
};

export type TreeNode = SiteNode & {
  depth: number;
  children: TreeNode[];
  /** Articles anywhere below this node — what a section counter shows. */
  articleCount: number;
  /** Views of this node plus everything below it. */
  totalViews: number;
};

/**
 * What the header needs, and nothing else.
 *
 * The menu is rendered by a client component, so this crosses the server →
 * browser boundary on every page. Handing it `TreeNode` would ship the whole
 * knowledge base — every locale of every title, view counts, the lot — inside
 * the RSC payload of the home page. Two levels of labels is the menu.
 */
export type NavSection = {
  path: string;
  title: string;
  children: Array<{ path: string; title: string; summary: string }>;
};

/** Slugs are the URL, so they are ASCII, lowercase and hyphen-separated. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Hand-written pages that can host tree children.
 *
 * These are the audience pages: the ones an admin will want to grow a guide
 * section under ("Игрокам" → "Как выбрать ракетку"). `/legal` and the API are
 * deliberately absent — nothing belongs under them.
 *
 * The order is the order of the header menu, so the tree manager lists them
 * the way the site does.
 */
export const CODE_PAGE_SLUGS = [
  'players',
  'organizers',
  'coaches',
  'venues',
  'padel',
  'pricing',
  'faq',
] as const;

export type CodePageSlug = (typeof CODE_PAGE_SLUGS)[number];

export function isCodePageSlug(value: string): value is CodePageSlug {
  return (CODE_PAGE_SLUGS as readonly string[]).includes(value);
}

/**
 * First segments that belong to code rather than to the tree.
 *
 * A node may still be created with one of these as a *deep* slug — only the
 * top level collides with a real route. The exception is a code-page anchor
 * (see `SiteNode.codePage`), which is deliberately created *on* the collision
 * so that the route and its sub-pages share one path prefix.
 */
export const RESERVED_SLUGS = new Set([
  'api',
  'coaches',
  'en',
  'faq',
  'icons',
  'images',
  'legal',
  'llms',
  'organizers',
  'padel',
  'players',
  'pricing',
  'ru',
  'robots',
  'sitemap',
  'venues',
]);

/**
 * Turn a title into a usable slug.
 *
 * Russian titles are the common case here, and a slug of percent-escapes is
 * unreadable in a URL bar, unshareable in a message and worthless as a
 * ranking signal — so Cyrillic is romanised rather than dropped.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(input: string): string {
  const lowered = input.toLowerCase().trim();
  let out = '';
  for (const ch of lowered) {
    if (ch in TRANSLIT) out += TRANSLIT[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

/** The label for a node in one language, with a fallback chain that never blanks. */
export function nodeTitle(node: Pick<SiteNode, 'titles' | 'slug'>, locale: Locale): string {
  const own = node.titles?.[locale]?.trim();
  if (own) return own;
  for (const other of locales) {
    const alt = node.titles?.[other]?.trim();
    if (alt) return alt;
  }
  return node.slug;
}

/** The one-line description under a title. Empty is a valid answer here. */
export function nodeSummary(node: Pick<SiteNode, 'summaries'>, locale: Locale): string {
  const own = node.summaries?.[locale]?.trim();
  if (own) return own;
  for (const other of locales) {
    const alt = node.summaries?.[other]?.trim();
    if (alt) return alt;
  }
  return '';
}

/** Join a parent path and a slug into a child path. */
export function childPath(parentPath: string | null, slug: string): string {
  if (!parentPath || parentPath === '/') return `/${slug}`;
  return `${parentPath}/${slug}`;
}

/* --- Tree shaping -------------------------------------------------------- */

/**
 * Rows → forest.
 *
 * A row whose parent is missing is dropped rather than promoted to the root:
 * the only way that happens is a `hidden` filter having cut the parent out,
 * and hiding a section has to hide what is inside it.
 */
export function buildTree(rows: ReadonlyArray<SiteNode>): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  for (const row of rows) {
    byId.set(row.id, { ...row, depth: 0, children: [], articleCount: 0, totalViews: row.views });
  }

  const roots: TreeNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id);
    if (!node) continue;
    if (row.parentId === null) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(row.parentId);
    if (parent) parent.children.push(node);
  }

  const sort = (nodes: TreeNode[], depth: number): void => {
    nodes.sort((a, b) => a.position - b.position || a.id - b.id);
    for (const node of nodes) {
      node.depth = depth;
      sort(node.children, depth + 1);
    }
  };
  sort(roots, 0);

  // Roll the counters up. Done after sorting so one walk covers both.
  const roll = (node: TreeNode): void => {
    let articles = node.kind === 'article' ? 1 : 0;
    let views = node.views;
    for (const child of node.children) {
      roll(child);
      articles += child.articleCount;
      views += child.totalViews;
    }
    node.articleCount = articles;
    node.totalViews = views;
  };
  for (const root of roots) roll(root);

  return roots;
}

/** Depth-first walk in reading order. */
export function flatten(nodes: ReadonlyArray<TreeNode>): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (list: ReadonlyArray<TreeNode>) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** Locate one node anywhere in a forest. */
export function findByPath(nodes: ReadonlyArray<TreeNode>, path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    // A path is a prefix of everything below it, so whole branches are skipped.
    if (path.startsWith(`${node.path}/`)) {
      const hit = findByPath(node.children, path);
      if (hit) return hit;
    }
  }
  return null;
}

/** Root → node, inclusive. Drives breadcrumbs and the JSON-LD trail. */
export function trailTo(nodes: ReadonlyArray<TreeNode>, path: string): TreeNode[] {
  const trail: TreeNode[] = [];
  let level: ReadonlyArray<TreeNode> = nodes;

  for (;;) {
    const step = level.find((node) => node.path === path || path.startsWith(`${node.path}/`));
    if (!step) break;
    trail.push(step);
    if (step.path === path) break;
    level = step.children;
  }

  return trail;
}
