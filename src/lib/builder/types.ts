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

export const BUILDER_VERSION = 1;

/** Desktop grid columns. 12 divides by 2, 3, 4 and 6 — every common layout. */
export const COLS_DESKTOP = 12;
/** Mobile grid columns. 4 gives full / half / quarter widths and no more. */
export const COLS_MOBILE = 4;
/** Height of one row track, in px. The vertical quantum of the canvas. */
export const ROW_H = 24;
/** Viewport width at which the desktop grid takes over. Matches the CSS. */
export const DESKTOP_BREAKPOINT = 768;

export type SlotName = 'top' | 'bottom';
export const SLOTS: readonly SlotName[] = ['top', 'bottom'];

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
      attrs?: { level?: 2 | 3 | 4; textAlign?: TextAlign | null };
      content?: RichInline[];
    }
  | { type: 'bulletList'; content?: RichListItem[] }
  | { type: 'orderedList'; attrs?: { start?: number }; content?: RichListItem[] }
  | { type: 'blockquote'; content?: RichBlockNode[] }
  | { type: 'horizontalRule' };

export type RichListItem = { type: 'listItem'; content?: RichBlockNode[] };

export type RichDoc = { type: 'doc'; content?: RichBlockNode[] };

/* --- Nodes -------------------------------------------------------------- */

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
