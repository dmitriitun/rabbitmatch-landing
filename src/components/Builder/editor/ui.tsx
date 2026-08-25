'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import { X } from 'lucide-react';
import styles from './editor.module.css';

/** Small shared controls for the inspector and the modals. */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <p className={styles.groupTitle}>{title}</p>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className={styles.input}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      className={styles.input}
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const next = Number(e.target.value);
        onChange(Number.isFinite(next) ? Math.min(max, Math.max(min, next)) : min);
      }}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode; title?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-pressed={value === option.value}
          className={`${styles.segment} ${value === option.value ? styles.segmentOn : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <label className={styles.check} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/**
 * Colour swatch with a picker in a popover.
 *
 * The popover is portalled to `body` and positioned from the swatch's own
 * rect, because the inspector scrolls and a popover clipped by its scroll
 * container is worse than no popover.
 */
export function ColorInput({
  value,
  onChange,
  allowClear,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-rm-color-popover]') || target === btnRef.current) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.swatch}
        aria-label="Colour"
        onClick={() => {
          setRect(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen((v) => !v);
        }}
      >
        <span className={styles.swatchInner} style={{ background: value ?? 'transparent' }} />
      </button>

      {open && rect
        ? createPortal(
            <div
              data-rm-color-popover=""
              /*
                `styles.root` matters here: the popover is portalled to `body`,
                so without it the editor palette is undefined and the hex field
                renders as bare text — a box you cannot tell is a box, let
                alone type into.
              */
              className={`${styles.root} ${styles.popover}`}
              style={{
                top: Math.min(rect.bottom + 8, window.innerHeight - 300),
                left: Math.max(12, Math.min(rect.left - 130, window.innerWidth - 240)),
              }}
            >
              <HexColorPicker color={value ?? '#000000'} onChange={onChange} />
              <label className={styles.field}>
                <span className={styles.label}>Код цвета</span>
                <input
                  className={styles.input}
                  value={value ?? ''}
                  placeholder="#B9E901"
                  spellCheck={false}
                  onChange={(e) => onChange(e.target.value || undefined)}
                />
              </label>
              {allowClear ? (
                <button type="button" className={styles.btn} onClick={() => onChange(undefined)}>
                  Убрать цвет
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function Modal({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      // Marks the modal as the owner of Escape while it is open.
      data-rm-modal=""
      className={`${styles.root} ${styles.modalBackdrop}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.modalHead}>
          <strong>{title}</strong>
          <span className={styles.spacer} />
          {actions}
          <button type="button" className={`${styles.btn} ${styles.iconBtn}`} onClick={onClose} aria-label="Закрыть">
            <X size={15} />
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Menu({
  label,
  children,
  icon,
}: {
  label: ReactNode;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button type="button" className={styles.btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {icon}
        {label}
      </button>
      {open ? <div className={styles.menu}>{children(() => setOpen(false))}</div> : null}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  hint,
  icon,
}: {
  onClick: () => void;
  children: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <button type="button" className={styles.menuItem} onClick={onClick}>
      {icon}
      {children}
      {hint ? <span className={styles.menuHint}>{hint}</span> : null}
    </button>
  );
}

export { styles as editorStyles };
