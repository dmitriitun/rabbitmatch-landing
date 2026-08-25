'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import type { RichDoc } from '@/lib/builder/types';
import { ColorInput, editorStyles as styles } from './ui';

/**
 * Rich text editing for a single text node.
 *
 * Tiptap (ProseMirror) rather than `contenteditable` plus `document.exec-
 * Command`: the editing surface is backed by a schema, so the only things an
 * admin can produce are the nodes and marks the renderer knows how to draw.
 * The document is stored as that schema's JSON, never as an HTML string —
 * which is why the published page can render it without an HTML sanitiser.
 */

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 88];

/*
  Built once at module scope. Tiptap rebuilds its schema when the extension
  array identity changes, and a rebuild mid-typing throws away the selection.
*/
const EXTENSIONS = [
  StarterKit.configure({
    // One `h1` per page already exists and belongs to the page itself.
    heading: { levels: [2, 3, 4] },
    link: { openOnClick: false, autolink: true },
    codeBlock: false,
  }),
  TextStyleKit.configure({ fontFamily: false, lineHeight: false }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
];

export function RichTextEditor({
  doc,
  placeholder,
  autoFocus,
  onChange,
  onCommit,
  onEditorReady,
}: {
  doc: RichDoc;
  placeholder: string;
  autoFocus?: boolean;
  onChange: (doc: RichDoc) => void;
  /** Called when a burst of typing settles, so history gets one entry. */
  onCommit: () => void;
  onEditorReady: (editor: Editor | null) => void;
}) {
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: doc,
    autofocus: autoFocus ? 'end' : false,
    immediatelyRender: false,
    editorProps: { attributes: { 'data-placeholder': placeholder } },
    onUpdate({ editor: instance }) {
      onChange(instance.getJSON() as RichDoc);
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(onCommit, 700);
    },
  });

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );

  return <EditorContent editor={editor} className={styles.prose} />;
}

/* --- Toolbar ------------------------------------------------------------- */

type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  block: string;
  align: string;
  color: string | undefined;
  fontSize: string;
  canUndo: boolean;
  canRedo: boolean;
};

function readState(editor: Editor): ToolbarState {
  const attrs = editor.getAttributes('textStyle') as { color?: string; fontSize?: string };
  const heading = [2, 3, 4].find((level) => editor.isActive('heading', { level }));
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    link: editor.isActive('link'),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    blockquote: editor.isActive('blockquote'),
    block: heading ? `h${heading}` : 'p',
    align: (['left', 'center', 'right', 'justify'] as const).find((a) =>
      editor.isActive({ textAlign: a }),
    ) ?? 'left',
    color: attrs.color,
    fontSize: attrs.fontSize ?? '',
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };
}

/**
 * The format bar, pinned above the node being edited.
 *
 * It is `position: fixed` and portalled to `body` so it is never clipped by
 * the section's own overflow or stacking context, and it follows the node on
 * scroll and resize.
 */
export function TextToolbar({ editor, anchor }: { editor: Editor; anchor: HTMLElement | null }) {
  const state = useEditorState({ editor, selector: ({ editor: e }) => readState(e) });
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = barRef.current?.offsetHeight ?? 40;
      const above = rect.top - height - 10;
      setPos({
        // Below the node when there is no room above it, and never under the
        // editor's own top bar.
        top: above > 56 ? above : Math.min(rect.bottom + 10, window.innerHeight - height - 12),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 24 - (barRef.current?.offsetWidth ?? 480))),
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchor]);

  if (!pos) return null;

  const chain = () => editor.chain().focus();

  const applyLink = () => {
    const href = linkDraft.trim();
    if (!href) {
      chain().extendMarkRange('link').unsetLink().run();
    } else {
      chain().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  return createPortal(
    <div
      ref={barRef}
      className={`${styles.root} ${styles.textbar}`}
      style={{ top: pos.top, left: pos.left }}
      // Keep the selection alive: a mousedown on the bar would otherwise blur
      // the editor and collapse the range the button is about to act on.
      onMouseDown={(e) => e.preventDefault()}
    >
      <select
        className={styles.tselect}
        value={state.block}
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'p') chain().setParagraph().run();
          else chain().setHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run();
        }}
      >
        <option value="p">Абзац</option>
        <option value="h2">Заголовок H2</option>
        <option value="h3">Заголовок H3</option>
        <option value="h4">Заголовок H4</option>
      </select>

      <select
        className={styles.tselect}
        value={state.fontSize}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) chain().unsetFontSize().run();
          else chain().setFontSize(value).run();
        }}
        title="Размер шрифта"
      >
        <option value="">Размер</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={`${size}px`}>
            {size}
          </option>
        ))}
      </select>

      <span className={styles.tsep} />

      <Tool on={state.bold} onClick={() => chain().toggleBold().run()} title="Жирный (Ctrl+B)">
        <Bold size={14} />
      </Tool>
      <Tool on={state.italic} onClick={() => chain().toggleItalic().run()} title="Курсив (Ctrl+I)">
        <Italic size={14} />
      </Tool>
      <Tool
        on={state.underline}
        onClick={() => chain().toggleUnderline().run()}
        title="Подчёркнутый (Ctrl+U)"
      >
        <UnderlineIcon size={14} />
      </Tool>
      <Tool on={state.strike} onClick={() => chain().toggleStrike().run()} title="Зачёркнутый">
        <Strikethrough size={14} />
      </Tool>

      <span className={styles.tsep} />

      <ColorInput
        value={state.color}
        allowClear
        onChange={(value) => {
          if (value) editor.chain().focus().setColor(value).run();
          else editor.chain().focus().unsetColor().run();
        }}
      />

      <span className={styles.tsep} />

      <Tool on={state.align === 'left'} onClick={() => chain().setTextAlign('left').run()} title="По левому краю">
        <AlignLeft size={14} />
      </Tool>
      <Tool on={state.align === 'center'} onClick={() => chain().setTextAlign('center').run()} title="По центру">
        <AlignCenter size={14} />
      </Tool>
      <Tool on={state.align === 'right'} onClick={() => chain().setTextAlign('right').run()} title="По правому краю">
        <AlignRight size={14} />
      </Tool>
      <Tool on={state.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()} title="По ширине">
        <AlignJustify size={14} />
      </Tool>

      <span className={styles.tsep} />

      <Tool on={state.bulletList} onClick={() => chain().toggleBulletList().run()} title="Маркированный список">
        <List size={14} />
      </Tool>
      <Tool on={state.orderedList} onClick={() => chain().toggleOrderedList().run()} title="Нумерованный список">
        <ListOrdered size={14} />
      </Tool>
      <Tool on={state.blockquote} onClick={() => chain().toggleBlockquote().run()} title="Цитата">
        <Quote size={14} />
      </Tool>

      <span className={styles.tsep} />

      <Tool
        on={state.link || linkOpen}
        title="Ссылка"
        onClick={() => {
          setLinkDraft((editor.getAttributes('link').href as string) ?? '');
          setLinkOpen((v) => !v);
        }}
      >
        <Link2 size={14} />
      </Tool>
      {state.link ? (
        <Tool on={false} title="Убрать ссылку" onClick={() => chain().extendMarkRange('link').unsetLink().run()}>
          <Link2Off size={14} />
        </Tool>
      ) : null}
      <Tool
        on={false}
        title="Очистить форматирование"
        onClick={() => chain().unsetAllMarks().unsetTextAlign().run()}
      >
        <RemoveFormatting size={14} />
      </Tool>

      <span className={styles.tsep} />

      <Tool on={false} disabled={!state.canUndo} title="Отменить" onClick={() => chain().undo().run()}>
        <Undo2 size={14} />
      </Tool>
      <Tool on={false} disabled={!state.canRedo} title="Повторить" onClick={() => chain().redo().run()}>
        <Redo2 size={14} />
      </Tool>

      {linkOpen ? (
        <div className={styles.row} style={{ flexBasis: '100%', marginTop: 4 }}>
          <input
            className={styles.input}
            autoFocus
            value={linkDraft}
            placeholder="/pricing, #contact или https://…"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setLinkOpen(false);
              }
            }}
          />
          <button type="button" className={styles.btn} onMouseDown={(e) => e.preventDefault()} onClick={applyLink}>
            OK
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function Tool({
  on,
  onClick,
  title,
  disabled,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      className={`${styles.tbtn} ${on ? styles.tbtnOn : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
