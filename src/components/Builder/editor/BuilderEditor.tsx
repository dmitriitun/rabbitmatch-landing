'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import {
  Loader,
  Monitor,
  PanelsTopLeft,
  Redo2,
  Save,
  Smartphone,
  Undo2,
  X,
} from 'lucide-react';
import {
  emptyDoc,
  type BuilderDoc,
  type BuilderNode,
  type BuilderSection,
  type NodeKind,
  type SlotName,
} from '@/lib/builder/types';
import { builderStyles } from '../nodes';
import {
  addNode as addNodeOp,
  addSection,
  copyNodeBelow,
  duplicateSection as duplicateSectionOp,
  findNode,
  findSection,
  mapNode,
  mapSection,
  moveSection as moveSectionOp,
  newNode,
  removeNode as removeNodeOp,
  removeSection as removeSectionOp,
  reorderNode as reorderNodeOp,
  starterSection,
} from './docOps';
import { AddNodeMenu, SectionFrame, type CanvasApi, type Device, type Selection } from './Canvas';
import { Inspector } from './Inspector';
import { TextToolbar } from './RichTextEditor';
import { editorStyles as styles, Menu, MenuItem } from './ui';

/**
 * The builder shell: state, history, saving, and the chrome around the canvas.
 *
 * It does not render the page — the page is already on screen, server-rendered.
 * What it does is find the `data-rm-slot` markers a page put there, hide the
 * server-rendered copy of the builder sections, and portal a live, editable
 * copy into the same place. Nothing outside the slots is touched, so the
 * hand-written parts of the page stay exactly as they are while an admin
 * works.
 */

const NODE_LABELS = { text: 'Новый текст', button: 'Кнопка' };
const PANEL_WIDTH = 300;
const BAR_HEIGHT = 47;

type SlotMount = { slot: SlotName; wrapper: HTMLElement; el: HTMLElement };

/** Find the slot markers a server-rendered page left in the DOM for this path. */
function collectMounts(page: string): SlotMount[] {
  if (typeof document === 'undefined') return [];
  const found: SlotMount[] = [];
  for (const wrapper of document.querySelectorAll<HTMLElement>('[data-rm-slot]')) {
    const [wrapperPage, slot] = (wrapper.dataset.rmSlot ?? '').split('|');
    if (wrapperPage !== page) continue;
    const el = wrapper.querySelector<HTMLElement>('[data-rm-slot-mount]');
    if (el) found.push({ slot: slot as SlotName, wrapper, el });
  }
  return found;
}

export default function BuilderEditor({
  page,
  locale,
  onExit,
}: {
  page: string;
  locale: string;
  onExit: () => void;
}) {
  const router = useRouter();

  const [doc, setDoc] = useState<BuilderDoc | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [textEditor, setTextEditor] = useState<{ editor: Editor; anchor: HTMLElement | null } | null>(null);

  /**
   * The document also lives in a ref.
   *
   * Every mutation needs to read the current document, push the old one onto
   * the undo stack and set the new one — three things a `setState` updater
   * must not do, because an updater has to be pure and React is free to run it
   * twice. Reading from a ref keeps the updater out of it entirely.
   */
  const docRef = useRef<BuilderDoc | null>(null);
  const past = useRef<BuilderDoc[]>([]);
  const future = useRef<BuilderDoc[]>([]);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });

  const dirty = doc ? JSON.stringify(doc) !== saved : false;

  /** Mirror the stack depths into state so the toolbar can disable buttons. */
  const syncHistory = useCallback(() => {
    setHistory({ undo: past.current.length, redo: future.current.length });
  }, []);

  const commitDoc = useCallback((next: BuilderDoc) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const rememberForUndo = useCallback((current: BuilderDoc) => {
    const last = past.current[past.current.length - 1];
    // A drag pushes once at the start; typing pushes on each pause. Either way
    // an identical consecutive snapshot is not worth an entry.
    if (last && last === current) return;
    past.current.push(current);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    syncHistory();
  }, [syncHistory]);

  /* --- Load ------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/builder?page=${encodeURIComponent(page)}&locale=${locale}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { doc: BuilderDoc };
        if (cancelled) return;
        docRef.current = data.doc;
        setDoc(data.doc);
        setSaved(JSON.stringify(data.doc));
      } catch {
        if (cancelled) return;
        const blank = emptyDoc();
        docRef.current = blank;
        setDoc(blank);
        setLoadError('Не удалось прочитать сохранённый макет. Проверьте подключение к базе.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, page]);

  /* --- Slots ------------------------------------------------------------ */

  /*
    Read once, when the editor mounts. The launcher keys the editor to the
    current path and unmounts it on navigation, so the set of slots cannot
    change underneath us while this component is alive.
  */
  const [mounts] = useState<SlotMount[]>(() => collectMounts(page));

  useEffect(() => {
    for (const mount of mounts) mount.wrapper.setAttribute('data-rm-editing', '1');
    return () => {
      for (const mount of mounts) mount.wrapper.removeAttribute('data-rm-editing');
    };
  }, [mounts]);

  /* --- Layout room for the chrome --------------------------------------- */

  useEffect(() => {
    const body = document.body;
    const prevTop = body.style.paddingTop;
    const prevRight = body.style.paddingRight;
    body.style.paddingTop = `${BAR_HEIGHT}px`;
    body.style.paddingRight = `${PANEL_WIDTH}px`;
    return () => {
      body.style.paddingTop = prevTop;
      body.style.paddingRight = prevRight;
    };
  }, []);

  /* --- History ---------------------------------------------------------- */

  /** Snapshot the current document before a gesture that will edit it live. */
  const pushHistory = useCallback(() => {
    if (docRef.current) rememberForUndo(docRef.current);
  }, [rememberForUndo]);

  const undo = useCallback(() => {
    const current = docRef.current;
    const prev = past.current.pop();
    if (!prev || !current) return;
    future.current.push(current);
    syncHistory();
    commitDoc(prev);
    setEditingId(null);
  }, [commitDoc, syncHistory]);

  const redo = useCallback(() => {
    const current = docRef.current;
    const next = future.current.pop();
    if (!next || !current) return;
    past.current.push(current);
    syncHistory();
    commitDoc(next);
    setEditingId(null);
  }, [commitDoc, syncHistory]);

  /* --- Mutations -------------------------------------------------------- */

  const api = useMemo<CanvasApi>(() => {
    const withDoc = (fn: (current: BuilderDoc) => BuilderDoc, commit = true) => {
      const current = docRef.current;
      if (!current) return;
      const next = fn(current);
      if (next === current) return;
      if (commit) rememberForUndo(current);
      commitDoc(next);
    };

    return {
      device,
      selection,
      editingId,
      select: (next) => {
        setSelection(next);
        if (!next || next.nodeId !== editingId) setEditingId(null);
      },
      setEditing: (nodeId) => setEditingId(nodeId),
      patchNode: (sectionId, nodeId, patch, commit = true) =>
        withDoc(
          (current) => mapNode(current, sectionId, nodeId, (node) => ({ ...node, ...patch }) as BuilderNode),
          commit,
        ),
      setNodeRich: (sectionId, nodeId, rich, commit) =>
        withDoc(
          (current) =>
            mapNode(current, sectionId, nodeId, (node) =>
              node.type === 'text' ? { ...node, rich } : node,
            ),
          commit,
        ),
      patchSection: (sectionId, patch, commit = true) =>
        withDoc((current) => mapSection(current, sectionId, (section) => ({ ...section, ...patch })), commit),
      reorderNode: (sectionId, nodeId, delta) =>
        withDoc((current) => reorderNodeOp(current, sectionId, nodeId, delta)),
      pushHistory,
      addNode: (sectionId, kind: NodeKind) => {
        let createdId: string | null = null;
        withDoc((current) => {
          const section = findSection(current, sectionId);
          if (!section) return current;
          const node = newNode(kind, section, NODE_LABELS);
          createdId = node.id;
          return addNodeOp(current, sectionId, node);
        });
        if (createdId) {
          setSelection({ sectionId, nodeId: createdId });
          if (kind === 'text') setEditingId(createdId);
        }
      },
      removeNode: (sectionId, nodeId) => {
        withDoc((current) => removeNodeOp(current, sectionId, nodeId));
        setSelection({ sectionId, nodeId: null });
        setEditingId(null);
      },
      copyNode: (sectionId, nodeId) => withDoc((current) => copyNodeBelow(current, sectionId, nodeId)),
      moveSection: (sectionId, delta) => withDoc((current) => moveSectionOp(current, sectionId, delta)),
      duplicateSection: (sectionId) => withDoc((current) => duplicateSectionOp(current, sectionId)),
      removeSection: (sectionId) => {
        withDoc((current) => removeSectionOp(current, sectionId));
        setSelection(null);
        setEditingId(null);
      },
      setActiveTextEditor: (editor, anchor) =>
        setTextEditor(editor ? { editor, anchor } : null),
    };
  }, [commitDoc, device, editingId, pushHistory, rememberForUndo, selection]);

  const addSectionTo = useCallback(
    (slot: SlotName) => {
      const current = docRef.current;
      if (!current) return;
      rememberForUndo(current);
      const section = starterSection(slot, 'Заголовок секции', 'Текст. Двойной клик — чтобы править.');
      commitDoc(addSection(current, section));
      setSelection({ sectionId: section.id, nodeId: null });
    },
    [commitDoc, rememberForUndo],
  );

  /* --- Save ------------------------------------------------------------- */

  const save = useCallback(async () => {
    if (!doc || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/builder', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ page, locale, doc }),
      });
      if (!res.ok) {
        setLoadError(
          res.status === 401 || res.status === 403
            ? 'Сохранить не удалось: сессия истекла, войдите заново.'
            : res.status === 503
              ? 'Сохранить не удалось: база данных недоступна. Правки остались в редакторе.'
              : `Сохранить не удалось (ошибка ${res.status}).`,
        );
        return;
      }
      // The server hands back the normalised document — what it stored, not
      // what was sent. Adopting it keeps the canvas honest about anything the
      // validator clamped or dropped.
      const data = (await res.json()) as { doc: BuilderDoc };
      commitDoc(data.doc);
      setSaved(JSON.stringify(data.doc));
      setLoadError(null);
      router.refresh();
    } catch {
      setLoadError('Сохранить не удалось: сеть недоступна.');
    } finally {
      setSaving(false);
    }
  }, [commitDoc, doc, locale, page, router, saving]);

  const exit = useCallback(() => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Выйти и потерять их?')) return;
    onExit();
  }, [dirty, onExit]);

  /* --- Keyboard --------------------------------------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (event.key === 'Escape') {
        if (editingId) setEditingId(null);
        else if (selection) setSelection(null);
        return;
      }

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
        return;
      }

      // Inside the text editor, undo belongs to ProseMirror: it has finer
      // granularity than the document history and the two would fight.
      if (mod && event.key.toLowerCase() === 'z' && !typing) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && !typing && selection?.nodeId) {
        event.preventDefault();
        api.removeNode(selection.sectionId, selection.nodeId);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [api, editingId, redo, save, selection, undo]);

  /* --- Render ----------------------------------------------------------- */

  const selectedSection = findSection(doc ?? emptyDoc(), selection?.sectionId ?? null);
  const selectedNode = findNode(doc ?? emptyDoc(), selection?.sectionId ?? null, selection?.nodeId ?? null);

  const bar = (
    <div className={`${styles.root} ${styles.bar}`}>
      <div className={styles.barTitle}>
        <PanelsTopLeft size={15} />
        <strong>Конструктор</strong>
        <code className={styles.barPath}>{page}</code>
        <span className={styles.barLocale}>{locale}</span>
      </div>

      <Menu label="Добавить секцию">
        {(close) => (
          <>
            <MenuItem
              hint="над контентом"
              onClick={() => {
                addSectionTo('top');
                close();
              }}
            >
              Сверху страницы
            </MenuItem>
            <MenuItem
              hint="под контентом"
              onClick={() => {
                addSectionTo('bottom');
                close();
              }}
            >
              Снизу страницы
            </MenuItem>
          </>
        )}
      </Menu>

      {selectedSection ? (
        <AddNodeMenu onPick={(kind) => api.addNode(selectedSection.id, kind)} />
      ) : null}

      <span className={styles.tsep} />

      <div className={styles.segmented} style={{ height: 30 }}>
        <button
          type="button"
          className={`${styles.segment} ${device === 'desktop' ? styles.segmentOn : ''}`}
          onClick={() => setDevice('desktop')}
          title="Десктоп"
        >
          <Monitor size={14} />
        </button>
        <button
          type="button"
          className={`${styles.segment} ${device === 'mobile' ? styles.segmentOn : ''}`}
          onClick={() => setDevice('mobile')}
          title="Телефон, 390px"
        >
          <Smartphone size={14} />
        </button>
      </div>

      <button
        type="button"
        className={`${styles.btn} ${styles.iconBtn}`}
        onClick={undo}
        disabled={history.undo === 0}
        title="Отменить (Ctrl+Z)"
      >
        <Undo2 size={14} />
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.iconBtn}`}
        onClick={redo}
        disabled={history.redo === 0}
        title="Повторить (Ctrl+Shift+Z)"
      >
        <Redo2 size={14} />
      </button>

      <span className={styles.spacer} />

      {loadError ? <span className={styles.error}>{loadError}</span> : null}
      {dirty ? <span className={styles.dirty}>есть несохранённое</span> : null}

      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => void save()}
        disabled={saving || !dirty}
      >
        {saving ? <Loader size={14} /> : <Save size={14} />}
        Сохранить
      </button>
      <button type="button" className={styles.btn} onClick={exit}>
        <X size={14} />
        Закрыть
      </button>
    </div>
  );

  return (
    <>
      {createPortal(bar, document.body)}

      <Inspector section={selectedSection} node={selectedNode} api={api} />

      {textEditor && editingId ? (
        <TextToolbar editor={textEditor.editor} anchor={textEditor.anchor} />
      ) : null}

      {doc
        ? mounts.map(({ slot, el }) =>
            createPortal(
              <SlotCanvas
                key={slot}
                slot={slot}
                sections={doc.sections.filter((section) => section.slot === slot)}
                locale={locale}
                device={device}
                api={api}
                onAddSection={() => addSectionTo(slot)}
              />,
              el,
            ),
          )
        : null}
    </>
  );
}

function SlotCanvas({
  slot,
  sections,
  locale,
  device,
  api,
  onAddSection,
}: {
  slot: SlotName;
  sections: BuilderSection[];
  locale: string;
  device: Device;
  api: CanvasApi;
  onAddSection: () => void;
}) {
  return (
    <div
      className={`${builderStyles.frame} ${styles.canvas} ${device === 'mobile' ? styles.deviceMobile : ''}`}
      data-rm-slot-canvas={slot}
    >
      {sections.map((section) => (
        <SectionFrame key={section.id} section={section} locale={locale} api={api} />
      ))}
      <div className={`${styles.root} ${styles.slotAdd}`}>
        <button type="button" className={styles.btn} onClick={onAddSection}>
          Добавить секцию {slot === 'top' ? 'сверху' : 'снизу'}
        </button>
      </div>
    </div>
  );
}
