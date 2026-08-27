import { newId } from '@/lib/builder/normalize';
import {
  BUILDER_VERSION,
  COLS_DESKTOP,
  COLS_MOBILE,
  type Box,
  type BuilderDoc,
  type BuilderNode,
  type BuilderSection,
  type NodeKind,
  type SlotName,
} from '@/lib/builder/types';

/** Shown by a media node until a file or URL is chosen for it. */
export const MEDIA_PLACEHOLDER = '/images/media-placeholder.svg';

/**
 * Pure operations on a builder document.
 *
 * Every editor action is expressed as `oldDoc -> newDoc` with structural
 * sharing, which is what makes undo/redo a stack of references rather than a
 * log of inverse operations: the history holds whole documents and costs
 * almost nothing, because untouched sections are the same objects.
 */

export function mapSection(
  doc: BuilderDoc,
  sectionId: string,
  fn: (section: BuilderSection) => BuilderSection,
): BuilderDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => (section.id === sectionId ? fn(section) : section)),
  };
}

export function mapNode(
  doc: BuilderDoc,
  sectionId: string,
  nodeId: string,
  fn: (node: BuilderNode) => BuilderNode,
): BuilderDoc {
  return mapSection(doc, sectionId, (section) => ({
    ...section,
    nodes: section.nodes.map((node) => (node.id === nodeId ? fn(node) : node)),
  }));
}

export function findSection(doc: BuilderDoc, sectionId: string | null): BuilderSection | undefined {
  return sectionId ? doc.sections.find((s) => s.id === sectionId) : undefined;
}

export function findNode(
  doc: BuilderDoc,
  sectionId: string | null,
  nodeId: string | null,
): BuilderNode | undefined {
  if (!nodeId) return undefined;
  return findSection(doc, sectionId)?.nodes.find((n) => n.id === nodeId);
}

/* --- Factories ----------------------------------------------------------- */

export function newSection(slot: SlotName): BuilderSection {
  return {
    id: newId('s'),
    slot,
    width: 'wide',
    pad: { top: 72, bottom: 72, left: 20, right: 20 },
    padMobile: { top: 40, bottom: 40, left: 20, right: 20 },
    background: { kind: 'none' },
    tone: 'auto',
    nodes: [],
  };
}

/**
 * A section that reads as a section on its own, rather than an empty band the
 * admin has to fill before they can tell whether anything worked.
 */
export function starterSection(slot: SlotName, heading: string, body: string): BuilderSection {
  const section = newSection(slot);
  return {
    ...section,
    nodes: [
      {
        ...baseNode({ x: 0, y: 0, w: 14, h: 6 }),
        type: 'text',
        rich: {
          type: 'doc',
          content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] }],
        },
      },
      {
        ...baseNode({ x: 0, y: 6, w: 12, h: 6 }),
        type: 'text',
        rich: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
        },
      },
    ],
  };
}

function baseNode(box: { x: number; y: number; w: number; h: number }) {
  return {
    id: newId('n'),
    box,
    mobile: { w: COLS_MOBILE, align: 'start' as const, hidden: false },
    valign: 'start' as const,
  };
}

/** Next free row in a section, so a new node lands under what is already there. */
export function nextRow(section: BuilderSection): number {
  return section.nodes.reduce((max, node) => Math.max(max, node.box.y + node.box.h), 0);
}

export function newNode(kind: NodeKind, section: BuilderSection, labels: NodeLabels): BuilderNode {
  const y = nextRow(section);

  switch (kind) {
    case 'text':
      return {
        ...baseNode({ x: 0, y, w: 12, h: 8 }),
        type: 'text',
        rich: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: labels.text }] }],
        },
      };
    case 'media':
      return {
        ...baseNode({ x: 0, y, w: 12, h: 20 }),
        type: 'media',
        media: 'image',
        // A shipped placeholder rather than an empty src: the node is visible
        // and selectable the moment it is added, and the picker opens onto it.
        src: MEDIA_PLACEHOLDER,
        alt: '',
        fit: 'cover',
        radius: 12,
        width: 16,
        height: 9,
      };
    case 'button':
      return {
        ...baseNode({ x: 0, y, w: 8, h: 6 }),
        type: 'button',
        label: labels.button,
        href: '/',
        variant: 'primary',
        size: 'md',
        align: 'start',
      };
    case 'divider':
      return { ...baseNode({ x: 0, y, w: 24, h: 2 }), type: 'divider', valign: 'center' };
    case 'spacer':
      return { ...baseNode({ x: 0, y, w: 24, h: 4 }), type: 'spacer' };
  }
}

export type NodeLabels = { text: string; button: string };

/* --- Structural edits ---------------------------------------------------- */

export function addSection(doc: BuilderDoc, section: BuilderSection, afterId?: string): BuilderDoc {
  const sections = [...doc.sections];
  const at = afterId ? sections.findIndex((s) => s.id === afterId) : -1;
  if (at === -1) sections.push(section);
  else sections.splice(at + 1, 0, section);
  return { ...doc, version: BUILDER_VERSION, sections };
}

export function removeSection(doc: BuilderDoc, sectionId: string): BuilderDoc {
  return { ...doc, sections: doc.sections.filter((s) => s.id !== sectionId) };
}

export function duplicateSection(doc: BuilderDoc, sectionId: string): BuilderDoc {
  const section = findSection(doc, sectionId);
  if (!section) return doc;
  const copy: BuilderSection = {
    ...section,
    id: newId('s'),
    // An anchor is a page-unique id; copying it would produce two elements
    // answering to the same `#hash`.
    anchor: undefined,
    nodes: section.nodes.map((node) => ({ ...node, id: newId('n') })),
  };
  return addSection(doc, copy, sectionId);
}

/**
 * Move a section one place in the document.
 *
 * It swaps across slots as well as within one, taking the neighbour's slot on
 * the way. Restricting the move to a section's own slot made the arrows dead
 * whenever a slot held a single section — the button was there, it just did
 * nothing, which is worse than not offering it.
 */
export function moveSection(doc: BuilderDoc, sectionId: string, delta: -1 | 1): BuilderDoc {
  const at = doc.sections.findIndex((s) => s.id === sectionId);
  const to = at + delta;
  if (at === -1 || to < 0 || to >= doc.sections.length) return doc;

  const sections = [...doc.sections];
  const moving = sections[at];
  const neighbour = sections[to];

  sections[at] = { ...neighbour, slot: moving.slot };
  sections[to] = { ...moving, slot: neighbour.slot };

  return { ...doc, sections };
}

export function addNode(doc: BuilderDoc, sectionId: string, node: BuilderNode): BuilderDoc {
  return mapSection(doc, sectionId, (section) => ({ ...section, nodes: [...section.nodes, node] }));
}

export function removeNode(doc: BuilderDoc, sectionId: string, nodeId: string): BuilderDoc {
  return mapSection(doc, sectionId, (section) => ({
    ...section,
    nodes: section.nodes.filter((n) => n.id !== nodeId),
  }));
}

export function copyNodeBelow(doc: BuilderDoc, sectionId: string, nodeId: string): BuilderDoc {
  const node = findNode(doc, sectionId, nodeId);
  if (!node) return doc;
  const copy = { ...node, id: newId('n'), box: { ...node.box, y: node.box.y + node.box.h } };
  return addNode(doc, sectionId, copy);
}

/**
 * Raise or lower a node in paint order. Overlapping boxes are legal — text on
 * top of a photograph is the whole point — so the array index doubles as the
 * stacking order.
 */
export function reorderNode(doc: BuilderDoc, sectionId: string, nodeId: string, delta: -1 | 1): BuilderDoc {
  return mapSection(doc, sectionId, (section) => {
    const at = section.nodes.findIndex((n) => n.id === nodeId);
    const to = at + delta;
    if (at === -1 || to < 0 || to >= section.nodes.length) return section;
    const nodes = [...section.nodes];
    [nodes[at], nodes[to]] = [nodes[to], nodes[at]];
    return { ...section, nodes };
  });
}

/* --- Geometry ------------------------------------------------------------ */

export type DragMode = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Where a box lands after a drag of `dCol` columns and `dRow` rows.
 *
 * Pure, so the arithmetic behind every handle can be checked without a
 * pointer: `move` translates, an edge handle moves that edge only, and a
 * corner handle moves both of its edges.
 */
export function applyDrag(
  mode: DragMode,
  box: { x: number; y: number; w: number; h: number },
  dCol: number,
  dRow: number,
): Box {
  if (mode === 'move') {
    // Translation preserves the size: pushing a box past the right edge slides
    // it up against the edge rather than squeezing it.
    return {
      x: clamp(box.x + dCol, 0, COLS_DESKTOP - box.w),
      y: Math.max(0, box.y + dRow),
      w: box.w,
      h: box.h,
    };
  }

  /*
    Resizing moves edges, not the origin. Working in edge coordinates is what
    keeps the opposite edge still: dragging the west handle past column 0 pins
    the left edge at 0 and leaves the right edge where the admin left it,
    instead of dragging the whole box along.
  */
  let left = box.x;
  let right = box.x + box.w;
  let top = box.y;
  let bottom = box.y + box.h;

  // Each moving edge is clamped against the edge that is staying put, so a
  // handle dragged past the far side collapses the box to one cell instead of
  // turning it inside out.
  if (mode.includes('e')) right = clamp(right + dCol, left + 1, COLS_DESKTOP);
  if (mode.includes('w')) left = clamp(left + dCol, 0, right - 1);
  if (mode.includes('s')) bottom = Math.max(top + 1, Math.round(bottom + dRow));
  if (mode.includes('n')) top = clamp(top + dRow, 0, bottom - 1);

  return { x: left, y: top, w: right - left, h: bottom - top };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Force a box into the grid, keeping its origin and trimming its size. */
export function clampBox(box: { x: number; y: number; w: number; h: number }): Box {
  const x = clamp(box.x, 0, COLS_DESKTOP - 1);
  return {
    x,
    w: clamp(box.w, 1, COLS_DESKTOP - x),
    y: Math.max(0, Math.round(box.y)),
    h: Math.max(1, Math.round(box.h)),
  };
}
