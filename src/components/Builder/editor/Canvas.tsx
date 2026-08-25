'use client';

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  Plus,
  Settings2,
  Space,
  Trash2,
  Type,
} from 'lucide-react';
import {
  COLS_DESKTOP,
  COLS_MOBILE,
  ROW_H,
  type BuilderNode,
  type BuilderSection,
  type NodeKind,
  type RichDoc,
} from '@/lib/builder/types';
import { BuilderNodeBody, builderStyles, nodeStyle, sectionStyle } from '../nodes';
import { RichTextEditor } from './RichTextEditor';
import { editorStyles as styles, Menu, MenuItem } from './ui';
import { applyDrag, type DragMode } from './docOps';
import { richToPlain } from '@/lib/builder/normalize';

/**
 * The editable canvas.
 *
 * It renders the same components the published page renders, wrapped in
 * selection chrome — so what an admin drags is literally the published
 * markup, not a preview of it. Dragging and resizing move the node between
 * grid cells rather than to pixel coordinates: the pointer feels free, the
 * stored value stays a fraction of the container.
 */

export type Selection = { sectionId: string; nodeId: string | null };
export type Device = 'desktop' | 'mobile';

export type CanvasApi = {
  device: Device;
  /** The document stands in for the whole page rather than adding to it. */
  takeover: boolean;
  selection: Selection | null;
  editingId: string | null;
  select: (selection: Selection | null) => void;
  setEditing: (nodeId: string | null) => void;
  /** Replace a node; `commit` decides whether history gets an entry. */
  patchNode: (sectionId: string, nodeId: string, patch: Partial<BuilderNode>, commit?: boolean) => void;
  setNodeRich: (sectionId: string, nodeId: string, rich: RichDoc, commit: boolean) => void;
  patchSection: (sectionId: string, patch: Partial<BuilderSection>, commit?: boolean) => void;
  reorderNode: (sectionId: string, nodeId: string, delta: -1 | 1) => void;
  pushHistory: () => void;
  addNode: (sectionId: string, kind: NodeKind) => void;
  removeNode: (sectionId: string, nodeId: string) => void;
  copyNode: (sectionId: string, nodeId: string) => void;
  moveSection: (sectionId: string, delta: -1 | 1) => void;
  duplicateSection: (sectionId: string) => void;
  removeSection: (sectionId: string) => void;
  setActiveTextEditor: (editor: Editor | null, anchor: HTMLElement | null) => void;
};

/* --- Section ------------------------------------------------------------- */

export function SectionFrame({
  section,
  locale,
  api,
}: {
  section: BuilderSection;
  locale: string;
  api: CanvasApi;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const selected = api.selection?.sectionId === section.id;
  const cols = api.device === 'mobile' ? COLS_MOBILE : COLS_DESKTOP;

  const hiddenHere =
    section.hidden || (api.device === 'mobile' ? section.hiddenMobile : false);

  const toneClass =
    section.tone === 'dark' ? builderStyles.toneDark : section.tone === 'light' ? builderStyles.toneLight : '';

  return (
    <div
      className={`${styles.sectionWrap} ${selected ? styles.sectionSelected : ''}`}
      onMouseDown={(event) => {
        // A press on the section's own padding selects the section; a press
        // that started on a node has already stopped propagating.
        if (event.target === event.currentTarget || !(event.target as HTMLElement).closest('[data-rm-node]')) {
          api.select({ sectionId: section.id, nodeId: null });
        }
      }}
    >
      <section
        className={`${builderStyles.section} ${toneClass}`}
        style={{ ...sectionStyle(section), opacity: hiddenHere ? 0.45 : undefined }}
      >
        {section.background.kind === 'image' ? <div className={builderStyles.bg} aria-hidden="true" /> : null}
        <div className={builderStyles.inner}>
          <div className={styles.guides} style={{ ['--rm-cols' as string]: cols }} aria-hidden="true" />
          <div className={builderStyles.grid} ref={gridRef}>
            {section.nodes.map((node) => (
              <NodeFrame
                key={node.id}
                node={node}
                sectionId={section.id}
                locale={locale}
                api={api}
                gridRef={gridRef}
              />
            ))}
          </div>
        </div>
      </section>

      <p className={styles.sectionLabel}>
        {section.name || sectionLabel(section)}
        {section.anchor ? ` · #${section.anchor}` : ''}
        {hiddenHere ? ' · скрыта' : ''}
      </p>

      <div className={styles.sectionTools}>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          title="Настройки секции"
          onClick={() => api.select({ sectionId: section.id, nodeId: null })}
        >
          <Settings2 size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          title="Выше"
          onClick={() => api.moveSection(section.id, -1)}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          title="Ниже"
          onClick={() => api.moveSection(section.id, 1)}
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn}`}
          title="Дублировать секцию"
          onClick={() => api.duplicateSection(section.id)}
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.iconBtn} ${styles.btnDanger}`}
          title="Удалить секцию"
          onClick={() => api.removeSection(section.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className={styles.addHere}>
        <AddNodeMenu onPick={(kind) => api.addNode(section.id, kind)} />
      </div>
    </div>
  );
}

export function AddNodeMenu({ onPick, label = 'Добавить элемент' }: { onPick: (kind: NodeKind) => void; label?: string }) {
  return (
    <Menu label={label} icon={<Plus size={14} />}>
      {(close) => (
        <>
          <MenuItem icon={<Type size={14} />} onClick={() => { onPick('text'); close(); }}>
            Текст
          </MenuItem>
          <MenuItem icon={<ImageIcon size={14} />} onClick={() => { onPick('media'); close(); }}>
            Фото / видео / GIF
          </MenuItem>
          <MenuItem icon={<MousePointerClick size={14} />} onClick={() => { onPick('button'); close(); }}>
            Кнопка
          </MenuItem>
          <MenuItem icon={<Minus size={14} />} onClick={() => { onPick('divider'); close(); }}>
            Разделитель
          </MenuItem>
          <MenuItem icon={<Space size={14} />} onClick={() => { onPick('spacer'); close(); }}>
            Отступ
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

/** Falls back to the section's first line of copy, so the strip is scannable. */
function sectionLabel(section: BuilderSection): string {
  for (const node of section.nodes) {
    if (node.type !== 'text') continue;
    const text = richToPlain(node.rich).split('\n')[0]?.trim();
    if (text) return text.length > 40 ? text.slice(0, 40) + '…' : text;
  }
  return 'Секция';
}

/* --- Node ---------------------------------------------------------------- */

const NODE_LABEL: Record<BuilderNode['type'], string> = {
  text: 'Текст',
  media: 'Медиа',
  button: 'Кнопка',
  divider: 'Разделитель',
  spacer: 'Отступ',
};

function NodeFrame({
  node,
  sectionId,
  locale,
  api,
  gridRef,
}: {
  node: BuilderNode;
  sectionId: string;
  locale: string;
  api: CanvasApi;
  gridRef: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const selected = api.selection?.nodeId === node.id;
  const editing = api.editingId === node.id;
  const mobile = api.device === 'mobile';
  const hiddenHere = mobile ? node.mobile.hidden : node.hiddenDesktop === true;

  const startDrag = useCallback(
    (event: ReactPointerEvent, mode: DragMode) => {
      if (editing) return;
      // Only the primary button drags; a right-click should reach the browser
      // menu the way it does anywhere else.
      if (event.button !== 0) return;

      const grid = gridRef.current;
      if (!grid) return;

      event.preventDefault();
      event.stopPropagation();
      api.select({ sectionId, nodeId: node.id });

      const cols = mobile ? COLS_MOBILE : COLS_DESKTOP;
      const colW = grid.getBoundingClientRect().width / cols;
      const startX = event.clientX;
      const startY = event.clientY;
      const box = { ...node.box };
      const mobileW = node.mobile.w;

      let moved = false;
      let raf = 0;
      let pending: { dx: number; dy: number } | null = null;

      const apply = () => {
        raf = 0;
        if (!pending) return;
        const dCol = Math.round(pending.dx / colW);
        const dRow = Math.round(pending.dy / ROW_H);

        if (mobile) {
          // On the phone grid there is no free placement to adjust — only how
          // many of the four columns the node takes.
          if (mode === 'move') return;
          const delta = mode.includes('w') ? -dCol : dCol;
          const next = Math.min(COLS_MOBILE, Math.max(1, mobileW + delta));
          if (next !== node.mobile.w) {
            api.patchNode(sectionId, node.id, { mobile: { ...node.mobile, w: next } }, false);
          }
          return;
        }

        api.patchNode(sectionId, node.id, { box: applyDrag(mode, box, dCol, dRow) }, false);
      };

      const onMove = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved) {
          // A few pixels of slop, so a click that selects does not also nudge.
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
          moved = true;
          setDragging(true);
          api.pushHistory();
        }
        pending = { dx, dy };
        if (!raf) raf = requestAnimationFrame(apply);
      };

      const onUp = () => {
        if (raf) cancelAnimationFrame(raf);
        setDragging(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [api, editing, gridRef, mobile, node.box, node.id, node.mobile, sectionId],
  );

  const classes = [builderStyles.node, styles.nodeFrame];
  if (!editing) classes.push(styles.nodeStatic);
  if (selected && !editing) classes.push(styles.nodeSelected);
  if (editing) classes.push(styles.nodeEditing);
  if (dragging) classes.push(styles.nodeDragging);
  if (hiddenHere) classes.push(styles.nodeHiddenHere);

  const handles: DragMode[] = mobile ? ['w', 'e'] : ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'];

  return (
    <div
      ref={ref}
      data-rm-node={node.id}
      className={classes.join(' ')}
      style={nodeStyle(node)}
      onPointerDown={(event) => startDrag(event, 'move')}
      onDoubleClick={(event) => {
        if (node.type !== 'text') return;
        event.stopPropagation();
        api.setEditing(node.id);
      }}
    >
      {node.type === 'text' && editing ? (
        <RichTextEditor
          doc={node.rich}
          placeholder="Текст"
          autoFocus
          onChange={(rich) => api.setNodeRich(sectionId, node.id, rich, false)}
          onCommit={() => api.pushHistory()}
          onEditorReady={(editor) => api.setActiveTextEditor(editor, editor ? ref.current : null)}
        />
      ) : (
        <BuilderNodeBody node={node} locale={locale} eager />
      )}

      {selected ? (
        <>
          <span className={styles.nodeBadge}>
            {NODE_LABEL[node.type]}
            {hiddenHere ? ' · скрыт' : ''}
          </span>

          {/*
            Duplicate and delete belong on the element, not only in a panel on
            the far side of the screen: the thing you want to remove is the
            thing you are looking at. `stopPropagation` on pointerdown keeps a
            press on these from starting a drag.
          */}
          <span className={styles.nodeTools} onPointerDown={(event) => event.stopPropagation()}>
            {node.type === 'text' ? (
              <button
                type="button"
                className={styles.nodeTool}
                title="Редактировать текст"
                onClick={() => api.setEditing(node.id)}
              >
                <Type size={13} />
              </button>
            ) : null}
            <button
              type="button"
              className={styles.nodeTool}
              title="Поднять над соседями"
              onClick={() => api.reorderNode(sectionId, node.id, 1)}
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              className={styles.nodeTool}
              title="Опустить под соседей"
              onClick={() => api.reorderNode(sectionId, node.id, -1)}
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              className={styles.nodeTool}
              title="Дублировать"
              onClick={() => api.copyNode(sectionId, node.id)}
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              className={`${styles.nodeTool} ${styles.nodeToolDanger}`}
              title="Удалить элемент"
              onClick={() => api.removeNode(sectionId, node.id)}
            >
              <Trash2 size={13} />
            </button>
          </span>
          {handles.map((mode) => (
            <span
              key={mode}
              role="presentation"
              className={`${styles.handle} ${styles[`h${mode.toUpperCase()}`]}`}
              onPointerDown={(event) => startDrag(event, mode)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
