/**
 * Store glyphs as inline SVG using `currentColor`.
 *
 * They have to invert with their badge — the same badge is dark-on-light in
 * normal sections and light-on-dark inside `.dark` bands — which a flat white
 * PNG/SVG asset cannot do. Inline also means no extra network request.
 */

const SIZE = 22;

export function AppStoreIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.63c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.77 2.29-1.61 2.79-.41 6.92 1.15 9.19.76 1.11 1.67 2.35 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 2.99.72 1.23-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.41-.93-2.43-3.71z" />
      <path d="M14.12 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.96 2.79 1.02.08 2.06-.51 2.69-1.26z" />
    </svg>
  );
}

export function GooglePlayIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.6 2.3c-.25.27-.4.68-.4 1.22v16.96c0 .54.15.95.4 1.22l.06.05 9.5-9.5v-.5l-9.5-9.5-.06.05z" />
      <path d="M16.36 15.5l-3.2-3.2v-.5l3.2-3.2.07.04 3.79 2.15c1.08.61 1.08 1.62 0 2.24l-3.79 2.15-.07.04z" />
      <path d="M16.43 15.46L13.16 12.2 3.6 21.75c.36.38.94.42 1.6.05l11.23-6.34z" />
      <path d="M16.43 8.54L5.2 2.2c-.66-.37-1.24-.33-1.6.05l9.56 9.55 3.27-3.26z" />
    </svg>
  );
}

export function WebGlyph() {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.4 2.5 3.6 5.6 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.6-3.6-9S9.6 5.5 12 3z" />
    </svg>
  );
}

export function TelegramGlyph() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 4.3L2.9 11.5c-.9.35-.9 1.62.02 1.93l4.55 1.5 1.75 5.35c.24.72 1.16.9 1.65.32l2.5-2.93 4.68 3.44c.6.44 1.46.11 1.62-.62l3.1-14.6c.17-.8-.6-1.47-1.27-1.19zM8.9 14.3l9.1-5.6c.2-.12.4.15.24.31l-7.5 6.9c-.16.15-.26.35-.29.57l-.26 1.9-1.3-4.08z" />
    </svg>
  );
}
