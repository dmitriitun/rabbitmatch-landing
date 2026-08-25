'use client';

import { newId } from '@/lib/builder/normalize';
import {
  COLS_DESKTOP,
  COLS_MOBILE,
  ROW_H,
  type BuilderDoc,
  type BuilderNode,
  type BuilderSection,
  type NodeBoxStyle,
  type RichBlockNode,
  type RichDoc,
  type RichInline,
  type RichMark,
  type SectionWidth,
  type Sides,
} from '@/lib/builder/types';

/**
 * Read the page that is currently on screen and write it down as a builder
 * document.
 *
 * The alternative was a hand-written mapping per block component — eight pages
 * times a dozen blocks, kept in step with the code forever. This instead reads
 * the *rendered* page: where each piece actually sits, how wide it actually
 * is, what colour its card actually has. That has two consequences worth
 * knowing before using it.
 *
 * It is measured, so it must run at a desktop width — the geometry it records
 * is the desktop grid, and the phone layout is derived from it afterwards.
 *
 * And it is an approximation, not a transcription. Cards, headings, images and
 * buttons come across; the exact spacing inside a component does not. The
 * result is a starting point an admin then drags into shape, which is the
 * point of moving to a builder in the first place.
 */

/* --- Small helpers -------------------------------------------------------- */

const TRANSPARENT = /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/;

function isTransparent(color: string): boolean {
  return !color || TRANSPARENT.test(color.trim());
}

function px(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Longest run of visible text directly under an element. */
function textOf(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function isHidden(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
  const rect = el.getBoundingClientRect();
  return rect.width < 2 || rect.height < 2;
}

/* --- Inline text ---------------------------------------------------------- */

const MARK_TAGS: Record<string, RichMark['type']> = {
  STRONG: 'bold',
  B: 'bold',
  EM: 'italic',
  I: 'italic',
  U: 'underline',
  S: 'strike',
  DEL: 'strike',
  CODE: 'code',
};

const LOCALE_PREFIX = /^\/(?:en|ru)(?=\/|$)/;

/** Strip the locale so the stored href works in both languages. */
function delocalize(href: string): string {
  if (!href.startsWith('/')) return href;
  const stripped = href.replace(LOCALE_PREFIX, '');
  return stripped === '' ? '/' : stripped;
}

function inlineFrom(node: Node, marks: RichMark[]): RichInline[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ');
    if (!text.trim()) return [];
    return [{ type: 'text', text, marks: marks.length ? [...marks] : undefined }];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as Element;
  if (el.tagName === 'BR') return [{ type: 'hardBreak' }];
  if (el.tagName === 'SVG' || el.tagName === 'svg') return [];

  const next = [...marks];
  const mark = MARK_TAGS[el.tagName];
  if (mark) next.push({ type: mark } as RichMark);

  if (el.tagName === 'A') {
    const href = (el as HTMLAnchorElement).getAttribute('href');
    if (href) next.push({ type: 'link', attrs: { href: delocalize(href) } });
  }

  const out: RichInline[] = [];
  for (const child of el.childNodes) out.push(...inlineFrom(child, next));
  return out;
}

/* --- Block text ----------------------------------------------------------- */

const HEADING_LEVEL: Record<string, 1 | 2 | 3 | 4> = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 4, H6: 4 };

/**
 * Turn a rendered subtree into rich blocks.
 *
 * Only the structures this site actually produces are recognised. Anything
 * else contributes its text as a paragraph rather than being dropped, so no
 * copy is lost in the move.
 */
function richFrom(el: Element): RichDoc {
  const blocks: RichBlockNode[] = [];

  const pushInline = (source: Element, level?: 1 | 2 | 3 | 4) => {
    const content = inlineFrom(source, []);
    if (!content.length) return;
    if (level) blocks.push({ type: 'heading', attrs: { level }, content });
    else blocks.push({ type: 'paragraph', content });
  };

  const walk = (current: Element) => {
    for (const child of current.children) {
      if (isHidden(child)) continue;

      const level = HEADING_LEVEL[child.tagName];
      if (level) {
        pushInline(child, level);
        continue;
      }

      if (child.tagName === 'UL' || child.tagName === 'OL') {
        const items = [...child.children]
          .filter((li) => li.tagName === 'LI' && textOf(li))
          .map((li) => ({
            type: 'listItem' as const,
            content: [{ type: 'paragraph' as const, content: inlineFrom(li, []) }],
          }));
        if (items.length) {
          blocks.push(child.tagName === 'OL' ? { type: 'orderedList', content: items } : { type: 'bulletList', content: items });
        }
        continue;
      }

      if (child.tagName === 'P') {
        pushInline(child);
        continue;
      }

      // A wrapper: descend. A leaf with text: take the text.
      if (child.children.length > 0) walk(child);
      else if (textOf(child)) pushInline(child);
    }

    // An element whose own text is not inside any child element.
    if (!current.children.length && textOf(current)) pushInline(current);
  };

  const level = HEADING_LEVEL[el.tagName];
  if (level) pushInline(el, level);
  else if (el.tagName === 'P' || !el.children.length) pushInline(el);
  else walk(el);

  return { type: 'doc', content: blocks };
}

/* --- Unit detection ------------------------------------------------------- */

type Unit =
  | { kind: 'media'; el: HTMLImageElement | HTMLVideoElement }
  | { kind: 'button'; el: HTMLAnchorElement }
  | { kind: 'text'; el: Element; boxStyle?: NodeBoxStyle };

/** A link that is painted as a button rather than set in a line of prose. */
function looksLikeButton(el: Element): boolean {
  if (el.tagName !== 'A') return false;
  const style = getComputedStyle(el);
  if (!style.display.includes('flex') && style.display !== 'inline-block' && style.display !== 'block') {
    return false;
  }
  const padded = px(style.paddingLeft) >= 10 && px(style.paddingTop) >= 6;
  const painted = !isTransparent(style.backgroundColor) || px(style.borderTopWidth) > 0;
  return padded && painted && textOf(el).length > 0 && textOf(el).length < 60;
}

/** A box drawn as a card: it has a fill or a hairline, and it holds copy. */
function cardStyle(el: Element): NodeBoxStyle | undefined {
  const style = getComputedStyle(el);
  const bg = style.backgroundColor;
  const borderWidth = Math.round(px(style.borderTopWidth));
  const hasFill = !isTransparent(bg);
  const hasBorder = borderWidth > 0 && !isTransparent(style.borderTopColor);
  if (!hasFill && !hasBorder) return undefined;

  return {
    background: hasFill ? bg : undefined,
    border: hasBorder ? style.borderTopColor : undefined,
    borderWidth: hasBorder ? clamp(borderWidth, 1, 12) : undefined,
    radius: clamp(Math.round(px(style.borderTopLeftRadius)), 0, 64) || undefined,
    padding: {
      top: clamp(Math.round(px(style.paddingTop)), 0, 200),
      right: clamp(Math.round(px(style.paddingRight)), 0, 200),
      bottom: clamp(Math.round(px(style.paddingBottom)), 0, 200),
      left: clamp(Math.round(px(style.paddingLeft)), 0, 200),
    },
  };
}

/**
 * Walk a section's content and pick out the pieces worth becoming nodes.
 *
 * Descent stops as soon as something is recognised, which is what keeps a
 * card together instead of scattering it into a heading node and a paragraph
 * node that no longer share a border.
 */
function collectUnits(root: Element, container: Element): Unit[] {
  const units: Unit[] = [];

  const visit = (el: Element) => {
    if (isHidden(el)) return;

    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      units.push({ kind: 'media', el: el as HTMLImageElement | HTMLVideoElement });
      return;
    }

    if (looksLikeButton(el)) {
      units.push({ kind: 'button', el: el as HTMLAnchorElement });
      return;
    }

    const text = textOf(el);
    const hasElementChildren = el.children.length > 0;

    // A painted box with copy in it is a card, and stays one node.
    if (el !== container && el !== root && text) {
      const box = cardStyle(el);
      const holdsMedia = el.querySelector('img, video') !== null;
      if (box && !holdsMedia && text.length < 1200) {
        units.push({ kind: 'text', el, boxStyle: box });
        return;
      }
    }

    if (!hasElementChildren) {
      if (text) units.push({ kind: 'text', el });
      return;
    }

    /*
      A row or grid of several sizeable children is a set of cards, not one
      block of prose. Without this check a four-card audience grid comes
      across as a single text node and every card boundary is lost — which is
      exactly what "the import flattened my page" looks like.
    */
    const display = getComputedStyle(el).display;
    const laidOut = display.includes('grid') || display.includes('flex');
    const sizeableChildren = [...el.children].filter((c) => {
      const r = c.getBoundingClientRect();
      return r.height > 30 && r.width > 60;
    });
    if (laidOut && sizeableChildren.length >= 2) {
      for (const child of el.children) visit(child);
      return;
    }

    // A block of prose: heading plus its paragraphs, and nothing else. `A` is
    // deliberately absent — a block-level link is a card or a button, and both
    // deserve their own node.
    const onlyProse =
      text.length > 0 &&
      el.querySelector('img, video') === null &&
      [...el.children].every((c) => /^(H[1-6]|P|UL|OL|SPAN|STRONG|EM|LI|BR|CODE|SMALL)$/.test(c.tagName));
    if (onlyProse && el !== container && el !== root) {
      units.push({ kind: 'text', el });
      return;
    }

    for (const child of el.children) visit(child);
  };

  for (const child of root.children) visit(child);
  return units;
}

/* --- Sections ------------------------------------------------------------- */

const WIDTH_BY_MAX: ReadonlyArray<[number, SectionWidth]> = [
  [800, 'narrow'],
  [1080, 'normal'],
  [1320, 'wide'],
];

function widthPreset(container: Element): SectionWidth {
  const max = px(getComputedStyle(container).maxWidth);
  if (!max) return 'full';
  for (const [limit, preset] of WIDTH_BY_MAX) if (max <= limit) return preset;
  return 'full';
}

/**
 * The element inside a section that holds the content column.
 *
 * Searching the whole subtree for the narrowest `max-width` finds the wrong
 * thing: a phone mockup capped at 300px, or a card, wins over the column that
 * actually sets the page's rhythm. So look only a few levels down, ignore
 * anything too narrow to be a column, and take the widest of what is left.
 */
function contentContainer(section: Element): Element {
  const MIN_COLUMN = 400;
  let best: Element = section;
  let bestWidth = 0;

  const consider = (el: Element, depth: number) => {
    if (depth > 3) return;
    const max = px(getComputedStyle(el).maxWidth);
    const width = el.getBoundingClientRect().width;
    if (max >= MIN_COLUMN && width > bestWidth) {
      bestWidth = width;
      best = el;
    }
    for (const child of el.children) consider(child, depth + 1);
  };

  for (const child of section.children) consider(child, 1);
  return best;
}

function sidesFrom(style: CSSStyleDeclaration): Sides {
  return {
    top: clamp(Math.round(px(style.paddingTop)), 0, 400),
    bottom: clamp(Math.round(px(style.paddingBottom)), 0, 400),
    left: clamp(Math.round(px(style.paddingLeft)), 0, 200),
    right: clamp(Math.round(px(style.paddingRight)), 0, 200),
  };
}

/** Light text on the section means the section is a dark band. */
function toneOf(section: Element): 'auto' | 'light' | 'dark' {
  const color = getComputedStyle(section).color;
  const m = color.match(/\d+/g);
  if (!m) return 'auto';
  const [r, g, b] = m.map(Number);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? 'dark' : 'auto';
}

/* --- Entry point ---------------------------------------------------------- */

export type ImportResult = { doc: BuilderDoc; sections: number; nodes: number; skipped: number };

export function importPageFromDom(): ImportResult {
  const main = document.querySelector('main');
  if (!main) return { doc: { version: 1, sections: [] }, sections: 0, nodes: 0, skipped: 0 };

  const sections: BuilderSection[] = [];
  let nodes = 0;
  let skipped = 0;

  const sourceSections = [...main.querySelectorAll('section')].filter(
    // Anything the builder already owns is not part of the hand-written page.
    (el) => !el.closest('[data-rm-slot]') && !isHidden(el),
  );

  for (const source of sourceSections) {
    const container = contentContainer(source);
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width < 100) {
      skipped += 1;
      continue;
    }

    const colWidth = containerRect.width / COLS_DESKTOP;
    const style = getComputedStyle(source);
    const units = collectUnits(container, container);
    if (!units.length) {
      skipped += 1;
      continue;
    }

    const sectionNodes: BuilderNode[] = [];

    for (const unit of units) {
      const rect = unit.el.getBoundingClientRect();
      const x = clamp(Math.round((rect.left - containerRect.left) / colWidth), 0, COLS_DESKTOP - 1);
      const w = clamp(Math.round(rect.width / colWidth), 1, COLS_DESKTOP - x);
      const y = Math.max(0, Math.round((rect.top - containerRect.top) / ROW_H));
      const h = Math.max(1, Math.round(rect.height / ROW_H));

      const base = {
        id: newId('n'),
        box: { x, y, w, h },
        // Full width on the phone, always. A card imported at three of twelve
        // columns would otherwise come out three quarters wide on a phone and
        // leave a ragged edge down the page; narrowing individual pieces is a
        // decision worth making by hand, one at a time.
        mobile: { w: COLS_MOBILE, align: 'start' as const, hidden: false },
        valign: 'start' as const,
      };

      if (unit.kind === 'media') {
        const el = unit.el;
        const src = el.getAttribute('src') ?? '';
        if (!src || src.startsWith('data:')) continue;
        sectionNodes.push({
          ...base,
          type: 'media',
          media: el.tagName === 'VIDEO' ? 'video' : 'image',
          src,
          alt: el.getAttribute('alt') ?? '',
          width: (el as HTMLImageElement).naturalWidth || undefined,
          height: (el as HTMLImageElement).naturalHeight || undefined,
          fit: getComputedStyle(el).objectFit === 'contain' ? 'contain' : 'cover',
          radius: clamp(Math.round(px(getComputedStyle(el).borderTopLeftRadius)), 0, 64),
        });
      } else if (unit.kind === 'button') {
        const href = unit.el.getAttribute('href') ?? '#';
        const btnStyle = getComputedStyle(unit.el);
        sectionNodes.push({
          ...base,
          type: 'button',
          label: textOf(unit.el),
          href: delocalize(href),
          variant: isTransparent(btnStyle.backgroundColor) ? 'ghost' : 'primary',
          size: px(btnStyle.paddingTop) > 14 ? 'lg' : 'md',
          align: 'start',
        });
      } else {
        const rich = richFrom(unit.el);
        if (!rich.content?.length) continue;
        sectionNodes.push({ ...base, type: 'text', rich, boxStyle: unit.boxStyle });
      }
      nodes += 1;
    }

    if (!sectionNodes.length) {
      skipped += 1;
      continue;
    }

    const pad = sidesFrom(style);
    sections.push({
      id: newId('s'),
      slot: 'page',
      name: textOf(source.querySelector('h1, h2, h3') ?? source).slice(0, 40) || undefined,
      anchor: source.id || undefined,
      width: widthPreset(container),
      pad,
      // Desktop vertical padding is usually too generous for a phone.
      padMobile: {
        top: Math.round(pad.top * 0.55),
        bottom: Math.round(pad.bottom * 0.55),
        left: 20,
        right: 20,
      },
      background: isTransparent(style.backgroundColor)
        ? { kind: 'none' }
        : { kind: 'color', color: style.backgroundColor },
      tone: toneOf(source),
      nodes: sectionNodes.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x),
    });
  }

  return {
    doc: { version: 1, takeover: sections.length > 0, sections },
    sections: sections.length,
    nodes,
    skipped,
  };
}

