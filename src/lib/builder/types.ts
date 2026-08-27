/**
 * The page-builder document.
 *
 * One document per (page, locale). It is authored in the browser, stored as
 * JSONB, and rendered by **server** components — no builder JavaScript reaches
 * a public visitor, and every headline, paragraph and link ends up in the HTML
 * a crawler receives.
 *
 * The layout model is deliberately *not* free absolute positioning. Absolute
 * coordinates are the reason drag-and-drop builders fall apart on a phone: a
 * box pinned at `left: 740px` has nowhere to go on a 390px screen. Instead a
 * section is a CSS grid — 12 columns on desktop, 4 on mobile — and a node
 * occupies a rectangle of cells. Dragging still feels free (the pointer moves
 * the box, it snaps to the nearest cell), but the result is expressed in
 * fractions of the container, so it survives every viewport width. Row tracks
 * are `minmax(ROW_H, auto)`, so a box whose text grows taller than its
 * rectangle pushes the rows below it instead of overlapping them.
 */

/**
 * 1 — the original grid: 12 columns, 24px rows.
 * 2 — the same grid at half the pitch: 24 columns, 12px rows. A version 1
 *     document is upgraded on read by doubling every coordinate, so an
 *     existing page lands on exactly the pixels it already occupied and only
 *     gains the stops in between.
 */
export const BUILDER_VERSION = 2;

/**
 * Desktop grid columns.
 *
 * 24 divides by 2, 3, 4, 6, 8 and 12 — every layout the old 12-column grid
 * could express, plus the half-column offsets it could not. The finer pitch is
 * the point: at 12 columns the smallest sideways nudge on a 1200px container
 * was 100px, which is wider than most things anyone actually wants to move.
 */
export const COLS_DESKTOP = 24;
/** Mobile grid columns. 8 gives full / half / quarter / eighth widths. */
export const COLS_MOBILE = 8;
/** Height of one row track, in px. The vertical quantum of the canvas. */
export const ROW_H = 12;
/**
 * How much finer version 2 is than version 1, per axis. Read by the upgrade in
 * `normalize.ts`; kept here so the constants above and the migration that
 * depends on them cannot drift apart.
 */
export const GRID_SCALE_V1_TO_V2 = 2;
/** Viewport width at which the desktop grid takes over. Matches the CSS. */
export const DESKTOP_BREAKPOINT = 768;

/**
 * Where a section lives on a page.
 *
 * `top` and `bottom` are the two places a hand-written page offers to the
 * builder. `page` is what a section gets once the page has been taken over
 * entirely: there is no hand-written body left to sit above or below.
 */
export type SlotName = 'top' | 'bottom' | 'page';
export const SLOTS: readonly SlotName[] = ['top', 'bottom', 'page'];

/* --- Rich text ---------------------------------------------------------- */

/**
 * ProseMirror/Tiptap document JSON, narrowed to the nodes and marks this site
 * renders. Storing the structure rather than an HTML string means the server
 * never has to sanitise markup: it walks a typed tree and emits React
 * elements, so there is no path from stored content to raw HTML injection.
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type RichMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; attrs: { href: string; target?: string | null; rel?: string | null } }
  | {
      type: 'textStyle';
      attrs: {
        color?: string | null;
        fontSize?: string | null;
        backgroundColor?: string | null;
        fontFamily?: string | null;
      };
    };

export type RichTextNode = { type: 'text'; text: string; marks?: RichMark[] };
export type RichInline = RichTextNode | { type: 'hardBreak' };

export type RichBlockNode =
  | { type: 'paragraph'; attrs?: { textAlign?: TextAlign | null }; content?: RichInline[] }
  | {
      type: 'heading';
      attrs?: { level?: 1 | 2 | 3 | 4; textAlign?: TextAlign | null };
      content?: RichInline[];
    }
  | { type: 'bulletList'; content?: RichListItem[] }
  | { type: 'orderedList'; attrs?: { start?: number }; content?: RichListItem[] }
  | { type: 'blockquote'; content?: RichBlockNode[] }
  | { type: 'horizontalRule' };

export type RichListItem = { type: 'listItem'; content?: RichBlockNode[] };

export type RichDoc = { type: 'doc'; content?: RichBlockNode[] };

/* --- Nodes -------------------------------------------------------------- */

/**
 * Painted decoration on a node's own box.
 *
 * Imported cards need it — a feature card is a text block with a hairline,
 * a radius and padding, and without these it would come across as bare
 * text. It doubles as ordinary design control for anything else.
 */
export type NodeBoxStyle = {
  background?: string;
  border?: string;
  borderWidth?: number;
  radius?: number;
  padding?: Sides;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
};

/** A rectangle of grid cells. `x`/`w` in columns, `y`/`h` in row tracks. */
export type Box = { x: number; y: number; w: number; h: number };

/**
 * Mobile placement. There is no `y`: on a phone everything flows in document
 * order, which is the one ordering that cannot break. `w` is a span of the
 * 4-column mobile grid, so half-width pairs are still possible.
 */
export type MobileBox = { w: number; align: 'start' | 'center' | 'end'; hidden: boolean };

export type NodeKind = 'text' | 'media' | 'button' | 'divider' | 'spacer';

export type BaseNode = {
  id: string;
  box: Box;
  mobile: MobileBox;
  /** Hidden on desktop only; `mobile.hidden` covers the phone. */
  hiddenDesktop?: boolean;
  /** Vertical placement of the content inside its rectangle. */
  valign?: 'start' | 'center' | 'end';
  /** Optional decoration painted on the node's own box. */
  boxStyle?: NodeBoxStyle;
};

export type TextNode = BaseNode & {
  type: 'text';
  rich: RichDoc;
};

export type MediaKind = 'image' | 'video' | 'embed';

export type MediaNode = BaseNode & {
  type: 'media';
  media: MediaKind;
  /** Either `/api/media/<id>` for an upload or an absolute external URL. */
  src: string;
  /** Set when `src` points at an uploaded asset; lets the editor track usage. */
  assetId?: string;
  /** Required for images. An empty string marks the image as decorative. */
  alt: string;
  /** Intrinsic size, written at upload time so the browser reserves the box. */
  width?: number;
  height?: number;
  fit: 'cover' | 'contain';
  radius: number;
  /** Video only. A GIF-like clip is autoplay + loop + muted + no controls. */
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  poster?: string;
  /** Caption rendered under the media, inside a `<figure>`. */
  caption?: RichDoc;
  href?: string;
};

export type ButtonNode = BaseNode & {
  type: 'button';
  label: string;
  href: string;
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  newTab?: boolean;
  align: 'start' | 'center' | 'end';
};

export type DividerNode = BaseNode & { type: 'divider'; color?: string };
export type SpacerNode = BaseNode & { type: 'spacer' };

export type BuilderNode = TextNode | MediaNode | ButtonNode | DividerNode | SpacerNode;

/* --- Sections ----------------------------------------------------------- */

export type SectionWidth = 'full' | 'wide' | 'normal' | 'narrow';

export type Sides = { top: number; bottom: number; left: number; right: number };

export type SectionBackground = {
  kind: 'none' | 'color' | 'image';
  color?: string;
  src?: string;
  assetId?: string;
  /** 0–1 black wash over a background image, so text stays readable. */
  overlay?: number;
  position?: string;
  size?: 'cover' | 'contain';
  repeat?: boolean;
};

export type BuilderSection = {
  id: string;
  slot: SlotName;
  /** Admin-facing label in the section list. Never rendered. */
  name?: string;
  /** `id` attribute, so a button can link to `#anchor`. */
  anchor?: string;
  width: SectionWidth;
  /** Desktop padding in px. */
  pad: Sides;
  /** Mobile padding in px. */
  padMobile: Sides;
  minHeight?: number;
  minHeightMobile?: number;
  background: SectionBackground;
  /** Forces light or dark text for the whole section. */
  tone: 'auto' | 'light' | 'dark';
  hidden?: boolean;
  hiddenMobile?: boolean;
  nodes: BuilderNode[];
};

export type BuilderDoc = {
  version: number;
  /**
   * The document *is* the page.
   *
   * With this set the hand-written body is not rendered at all and the
   * sections below stand in for it. Metadata, `hreflang` and the JSON-LD
   * blocks stay where they are — only the body changes hands.
   */
  takeover?: boolean;
  sections: BuilderSection[];
};

/** Container max-width per section width preset. `full` means edge to edge. */
export const SECTION_MAX_WIDTH: Record<SectionWidth, string> = {
  full: '100%',
  wide: '1240px',
  normal: '1040px',
  narrow: '760px',
};

export function emptyDoc(): BuilderDoc {
  return { version: BUILDER_VERSION, sections: [] };
}
