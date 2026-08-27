import {
  BUILDER_VERSION,
  COLS_DESKTOP,
  COLS_MOBILE,
  GRID_SCALE_V1_TO_V2,
  SLOTS,
  type Box,
  type BuilderDoc,
  type BuilderNode,
  type BuilderSection,
  type MediaNode,
  type MobileBox,
  type NodeBoxStyle,
  type RichBlockNode,
  type RichDoc,
  type RichInline,
  type RichListItem,
  type RichMark,
  type SectionBackground,
  type Sides,
  type SlotName,
  type TextAlign,
} from './types';

/**
 * The single gate between authored JSON and rendered HTML.
 *
 * Everything the builder stores passes through here on the way in (the PUT
 * handler) and the renderer trusts nothing that this file did not produce.
 * That inversion is what makes it safe to render stored content without an
 * HTML sanitiser: the output is a tree of known node types with known
 * attributes, so there is no markup to escape in the first place.
 *
 * Unknown nodes, unknown marks and unparseable values are **dropped**, never
 * passed through. A malformed document degrades to a smaller valid document
 * rather than failing the save — an admin who pastes something odd loses the
 * odd part, not the page.
 */

/* --- Scalars ------------------------------------------------------------- */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;
/** CSS custom properties from the design system are allowed by name. */
const VAR = /^var\(--[a-z0-9-]{1,40}\)$/i;

export function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.length > 64) return undefined;
  if (HEX.test(v) || RGB.test(v) || VAR.test(v)) return v;
  return undefined;
}

/** Font size is stored the way Tiptap writes it: a px string. */
export function safeFontSize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = /^(\d{1,3}(?:\.\d+)?)px$/.exec(value.trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 8 || n > 200) return undefined;
  return `${n}px`;
}

/**
 * Link targets. Relative paths, anchors, mail and phone links pass; anything
 * with a scheme this site does not use — `javascript:`, `data:`, `vbscript:` —
 * is rejected outright rather than escaped.
 */
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.length > 2048) return undefined;
  if (v.startsWith('#') || v.startsWith('/')) {
    // `//host` is protocol-relative and leaves the site; treat it as external.
    if (v.startsWith('//')) return `https:${v}`;
    return v;
  }
  if (/^https?:\/\/[^\s]+$/i.test(v)) return v;
  if (/^mailto:[^\s]+$/i.test(v)) return v;
  if (/^tel:[+\d\s()-]+$/i.test(v)) return v;
  return undefined;
}

/** Media sources. Same rules as links, minus `mailto:`/`tel:`. */
export function safeSrc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.length > 2048) return undefined;
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  if (/^https?:\/\/[^\s]+$/i.test(v)) return v;
  return undefined;
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function str(value: unknown, max: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.length > max ? value.slice(0, max) : value;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown): boolean | undefined {
  return value === true ? true : value === false ? false : undefined;
}

const ALIGNS = ['left', 'center', 'right', 'justify'] as const;

function safeAlign(value: unknown): TextAlign | undefined {
  return ALIGNS.includes(value as TextAlign) ? (value as TextAlign) : undefined;
}

/** Stable, URL-safe ids. `crypto.randomUUID` exists in both runtimes we use. */
export function newId(prefix = 'n'): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}${uuid.replace(/-/g, '').slice(0, 12)}`;
}

function safeId(value: unknown, prefix: string): string {
  if (typeof value === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value)) return value;
  return newId(prefix);
}

/** Anchors become `id` attributes and link fragments, so keep them tame. */
function safeAnchor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return v ? v.slice(0, 48) : undefined;
}

/* --- Rich text ----------------------------------------------------------- */

const MAX_TEXT_LEN = 8000;
const MAX_BLOCKS = 200;

function normalizeMarks(input: unknown): RichMark[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: RichMark[] = [];
  for (const raw of input.slice(0, 8)) {
    if (!raw || typeof raw !== 'object') continue;
    const type = (raw as { type?: unknown }).type;
    const attrs = ((raw as { attrs?: unknown }).attrs ?? {}) as Record<string, unknown>;
    switch (type) {
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strike':
      case 'code':
        out.push({ type });
        break;
      case 'link': {
        const href = safeHref(attrs.href);
        if (!href) break;
        const external = /^https?:\/\//i.test(href);
        out.push({
          type: 'link',
          attrs: {
            href,
            target: attrs.target === '_blank' || external ? '_blank' : null,
            rel: external ? 'noopener noreferrer' : null,
          },
        });
        break;
      }
      case 'textStyle': {
        const color = safeColor(attrs.color);
        const backgroundColor = safeColor(attrs.backgroundColor);
        const fontSize = safeFontSize(attrs.fontSize);
        if (!color && !backgroundColor && !fontSize) break;
        out.push({
          type: 'textStyle',
          attrs: {
            color: color ?? null,
            backgroundColor: backgroundColor ?? null,
            fontSize: fontSize ?? null,
          },
        });
        break;
      }
      default:
        break;
    }
  }
  return out.length ? out : undefined;
}

function normalizeInline(input: unknown): RichInline[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: RichInline[] = [];
  for (const raw of input.slice(0, 400)) {
    if (!raw || typeof raw !== 'object') continue;
    const type = (raw as { type?: unknown }).type;
    if (type === 'hardBreak') {
      out.push({ type: 'hardBreak' });
      continue;
    }
    if (type !== 'text') continue;
    const text = (raw as { text?: unknown }).text;
    if (typeof text !== 'string' || !text) continue;
    out.push({
      type: 'text',
      text: text.slice(0, MAX_TEXT_LEN),
      marks: normalizeMarks((raw as { marks?: unknown }).marks),
    });
  }
  return out.length ? out : undefined;
}

function normalizeBlock(input: unknown, depth: number): RichBlockNode | null {
  if (!input || typeof input !== 'object' || depth > 4) return null;
  const type = (input as { type?: unknown }).type;
  const attrs = ((input as { attrs?: unknown }).attrs ?? {}) as Record<string, unknown>;
  const content = (input as { content?: unknown }).content;

  switch (type) {
    case 'paragraph':
      return { type: 'paragraph', attrs: { textAlign: safeAlign(attrs.textAlign) ?? null }, content: normalizeInline(content) };
    case 'heading': {
      // Level 1 is legal now: once a page renders entirely from a document,
      // its `<h1>` has to come from the document too.
      const raw = num(attrs.level, 1, 4, 2);
      const level = (raw < 1 ? 1 : raw > 4 ? 4 : raw) as 1 | 2 | 3 | 4;
      return {
        type: 'heading',
        attrs: { level, textAlign: safeAlign(attrs.textAlign) ?? null },
        content: normalizeInline(content),
      };
    }
    case 'bulletList':
    case 'orderedList': {
      if (!Array.isArray(content)) return null;
      const items: RichListItem[] = [];
      for (const raw of content.slice(0, 100)) {
        if (!raw || typeof raw !== 'object' || (raw as { type?: unknown }).type !== 'listItem') continue;
        const inner = (raw as { content?: unknown }).content;
        const blocks = Array.isArray(inner)
          ? (inner.slice(0, 10).map((b) => normalizeBlock(b, depth + 1)).filter(Boolean) as RichBlockNode[])
          : [];
        items.push({ type: 'listItem', content: blocks });
      }
      if (!items.length) return null;
      return type === 'orderedList'
        ? { type: 'orderedList', attrs: { start: num(attrs.start, 1, 999, 1) }, content: items }
        : { type: 'bulletList', content: items };
    }
    case 'blockquote': {
      if (!Array.isArray(content)) return null;
      const blocks = content
        .slice(0, 20)
        .map((b) => normalizeBlock(b, depth + 1))
        .filter(Boolean) as RichBlockNode[];
      if (!blocks.length) return null;
      return { type: 'blockquote', content: blocks };
    }
    case 'horizontalRule':
      return { type: 'horizontalRule' };
    default:
      return null;
  }
}

function isEmptyParagraph(block: RichBlockNode): boolean {
  return block.type === 'paragraph' && !block.content?.length;
}

export function normalizeRich(input: unknown): RichDoc {
  const content = (input as { content?: unknown } | null)?.content;
  if (!Array.isArray(content)) return { type: 'doc', content: [] };
  const blocks = content
    .slice(0, MAX_BLOCKS)
    .map((b) => normalizeBlock(b, 0))
    .filter(Boolean) as RichBlockNode[];

  // The editor keeps an empty paragraph at the end of every text box so there
  // is always somewhere to click below the last line. That is an editing
  // affordance, not content: published, it is an empty `<p>` pushing whatever
  // follows down by a line height for no reason.
  while (blocks.length && isEmptyParagraph(blocks[blocks.length - 1])) blocks.pop();

  return { type: 'doc', content: blocks };
}

/** Plain text of a rich document — used for previews and `alt`-less checks. */
export function richToPlain(doc: RichDoc | undefined): string {
  if (!doc?.content) return '';
  const parts: string[] = [];
  const walkInline = (nodes: RichInline[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type === 'text') parts.push(n.text);
      else parts.push(' ');
    }
  };
  const walkBlock = (blocks: RichBlockNode[] | undefined) => {
    for (const b of blocks ?? []) {
      if (b.type === 'paragraph' || b.type === 'heading') {
        walkInline(b.content);
        parts.push('\n');
      } else if (b.type === 'bulletList' || b.type === 'orderedList') {
        for (const item of b.content ?? []) walkBlock(item.content);
      } else if (b.type === 'blockquote') {
        walkBlock(b.content);
      }
    }
  };
  walkBlock(doc.content);
  return parts.join('').replace(/\n{2,}/g, '\n').trim();
}

/* --- Geometry ------------------------------------------------------------ */

/**
 * Grid coordinates, in whatever pitch the stored document was written for.
 *
 * `scale` is 2 for a version 1 document and 1 for a current one. It has to be
 * applied *before* the clamps, not after: a v1 box at column 10 of 12 is
 * column 20 of 24, but clamping it to the v2 grid first would pin it at 23 and
 * then double it into nonsense. Scaling first is what makes the upgrade
 * invisible — every existing page keeps the exact pixels it had.
 */
function grid(value: unknown, scale: number, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * scale)));
}

function normalizeBox(input: unknown, scale: number): Box {
  const raw = (input ?? {}) as Record<string, unknown>;
  const x = grid(raw.x, scale, 0, COLS_DESKTOP - 1, 0);
  const w = grid(raw.w, scale, 1, COLS_DESKTOP - x, Math.min(COLS_DESKTOP - x, COLS_DESKTOP));
  return {
    x,
    y: grid(raw.y, scale, 0, 800, 0),
    w,
    h: grid(raw.h, scale, 1, 400, 8),
  };
}

function normalizeMobile(input: unknown, scale: number, fallbackW = COLS_MOBILE): MobileBox {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    w: grid(raw.w, scale, 1, COLS_MOBILE, fallbackW),
    align: pick(raw.align, ['start', 'center', 'end'] as const, 'start'),
    hidden: raw.hidden === true,
  };
}

function normalizeSides(input: unknown, fallback: Sides): Sides {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    top: num(raw.top, 0, 400, fallback.top),
    bottom: num(raw.bottom, 0, 400, fallback.bottom),
    left: num(raw.left, 0, 200, fallback.left),
    right: num(raw.right, 0, 200, fallback.right),
  };
}

/* --- Nodes --------------------------------------------------------------- */

const VALIGNS = ['start', 'center', 'end'] as const;

const NO_PADDING: Sides = { top: 0, bottom: 0, left: 0, right: 0 };

function normalizeBoxStyle(input: unknown): NodeBoxStyle | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Record<string, unknown>;
  const style: NodeBoxStyle = {
    background: safeColor(raw.background),
    border: safeColor(raw.border),
    borderWidth: raw.borderWidth == null ? undefined : num(raw.borderWidth, 0, 12, 0),
    radius: raw.radius == null ? undefined : num(raw.radius, 0, 64, 0),
    padding: raw.padding == null ? undefined : normalizeSides(raw.padding, NO_PADDING),
    shadow: raw.shadow == null ? undefined : pick(raw.shadow, ['none', 'sm', 'md', 'lg'] as const, 'none'),
  };
  // An object of nothing but undefined is noise in the stored document.
  return Object.values(style).some((v) => v !== undefined) ? style : undefined;
}

function normalizeNode(input: unknown, scale: number): BuilderNode | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const base = {
    id: safeId(raw.id, 'n'),
    box: normalizeBox(raw.box, scale),
    mobile: normalizeMobile(raw.mobile, scale),
    hiddenDesktop: bool(raw.hiddenDesktop),
    valign: pick(raw.valign, VALIGNS, 'start'),
    boxStyle: normalizeBoxStyle(raw.boxStyle),
  };

  switch (raw.type) {
    case 'text':
      return { ...base, type: 'text', rich: normalizeRich(raw.rich) };

    case 'media': {
      const src = safeSrc(raw.src);
      if (!src) return null;
      const media = pick(raw.media, ['image', 'video', 'embed'] as const, 'image');
      const node: MediaNode = {
        ...base,
        type: 'media',
        media,
        src,
        assetId: typeof raw.assetId === 'string' && /^[a-f0-9]{16,64}$/.test(raw.assetId) ? raw.assetId : undefined,
        alt: str(raw.alt, 300),
        width: raw.width == null ? undefined : num(raw.width, 1, 20000, 0) || undefined,
        height: raw.height == null ? undefined : num(raw.height, 1, 20000, 0) || undefined,
        fit: pick(raw.fit, ['cover', 'contain'] as const, 'cover'),
        radius: num(raw.radius, 0, 64, 0),
        href: safeHref(raw.href),
      };
      if (media === 'video') {
        node.autoplay = raw.autoplay === true;
        node.loop = raw.loop === true;
        node.muted = raw.muted !== false;
        node.controls = raw.controls !== false;
        node.poster = safeSrc(raw.poster);
        // An autoplaying clip must be muted or the browser blocks it outright.
        if (node.autoplay) node.muted = true;
      }
      const caption = normalizeRich(raw.caption);
      if (caption.content?.length) node.caption = caption;
      return node;
    }

    case 'button': {
      const href = safeHref(raw.href) ?? '#';
      return {
        ...base,
        type: 'button',
        label: str(raw.label, 120, 'Button'),
        href,
        variant: pick(raw.variant, ['primary', 'secondary', 'ghost'] as const, 'primary'),
        size: pick(raw.size, ['sm', 'md', 'lg'] as const, 'md'),
        newTab: raw.newTab === true || /^https?:\/\//i.test(href),
        align: pick(raw.align, VALIGNS, 'start'),
      };
    }

    case 'divider':
      return { ...base, type: 'divider', color: safeColor(raw.color) };

    case 'spacer':
      return { ...base, type: 'spacer' };

    default:
      return null;
  }
}

/* --- Sections ------------------------------------------------------------ */

function normalizeBackground(input: unknown): SectionBackground {
  const raw = (input ?? {}) as Record<string, unknown>;
  const kind = pick(raw.kind, ['none', 'color', 'image'] as const, 'none');
  if (kind === 'color') {
    return { kind, color: safeColor(raw.color) ?? '#FFFFFF' };
  }
  if (kind === 'image') {
    const src = safeSrc(raw.src);
    if (!src) return { kind: 'none' };
    return {
      kind,
      src,
      assetId: typeof raw.assetId === 'string' && /^[a-f0-9]{16,64}$/.test(raw.assetId) ? raw.assetId : undefined,
      color: safeColor(raw.color),
      overlay: Math.min(1, Math.max(0, Number(raw.overlay) || 0)),
      position: typeof raw.position === 'string' && /^[a-z0-9 %]{1,24}$/i.test(raw.position) ? raw.position : 'center',
      size: pick(raw.size, ['cover', 'contain'] as const, 'cover'),
      repeat: raw.repeat === true,
    };
  }
  return { kind: 'none' };
}

const DEFAULT_PAD: Sides = { top: 72, bottom: 72, left: 20, right: 20 };
const DEFAULT_PAD_MOBILE: Sides = { top: 40, bottom: 40, left: 20, right: 20 };

function normalizeSection(input: unknown, scale: number): BuilderSection | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const nodes = Array.isArray(raw.nodes)
    ? (raw.nodes
        .slice(0, 120)
        .map((node) => normalizeNode(node, scale))
        .filter(Boolean) as BuilderNode[])
    : [];

  return {
    id: safeId(raw.id, 's'),
    slot: pick(raw.slot, SLOTS as readonly SlotName[], 'bottom'),
    name: str(raw.name, 80) || undefined,
    anchor: safeAnchor(raw.anchor),
    width: pick(raw.width, ['full', 'wide', 'normal', 'narrow'] as const, 'wide'),
    pad: normalizeSides(raw.pad, DEFAULT_PAD),
    padMobile: normalizeSides(raw.padMobile, DEFAULT_PAD_MOBILE),
    minHeight: raw.minHeight == null ? undefined : num(raw.minHeight, 0, 2000, 0) || undefined,
    minHeightMobile:
      raw.minHeightMobile == null ? undefined : num(raw.minHeightMobile, 0, 2000, 0) || undefined,
    background: normalizeBackground(raw.background),
    tone: pick(raw.tone, ['auto', 'light', 'dark'] as const, 'auto'),
    hidden: bool(raw.hidden),
    hiddenMobile: bool(raw.hiddenMobile),
    // Document order is the mobile order and the reading order, so it is
    // sorted here once rather than at render time: the HTML a crawler sees
    // matches the visual order top-to-bottom, left-to-right.
    nodes: nodes.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x),
  };
}

export function normalizeDoc(input: unknown): BuilderDoc {
  const raw = (input ?? {}) as { version?: unknown; sections?: unknown; takeover?: unknown };
  if (!Array.isArray(raw.sections)) return { version: BUILDER_VERSION, sections: [] };

  /*
    The grid upgrade, applied on the way in.

    A document is stored at whatever version wrote it and normalised to the
    current one on every read, so the migration lives here rather than in a SQL
    `UPDATE`: nothing has to be rewritten in place, a document that has not been
    opened since the change still renders correctly, and the row is only written
    back at the new version the next time an admin saves it.
  */
  const version = Number(raw.version);
  const scale = Number.isFinite(version) && version >= 2 ? 1 : GRID_SCALE_V1_TO_V2;

  const sections = raw.sections
    .slice(0, 60)
    .map((section) => normalizeSection(section, scale))
    .filter(Boolean) as BuilderSection[];

  return {
    version: BUILDER_VERSION,
    // Taking over an empty document would blank the page. The flag only means
    // something when there is content to stand in for the original.
    takeover: raw.takeover === true && sections.length > 0 ? true : undefined,
    sections,
  };
}

/**
 * Page paths the builder is allowed to write to.
 *
 * Shallow when it only had to cover the routes in `app/`. Sections created in
 * the tree nest as deep as their content needs — `/learn/rules/scoring/tie-
 * break` is an ordinary page there — so the shape check follows: lowercase
 * slug segments, and a depth bound that exists to keep a path a path rather
 * than to say how a knowledge base should be organised.
 */
export function isBuilderPage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\/(?:[a-z0-9-]{1,60}(?:\/[a-z0-9-]{1,60}){0,7})?$/.test(value)
  );
}

export { DEFAULT_PAD, DEFAULT_PAD_MOBILE };
