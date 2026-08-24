import { defaultLocale, localeHreflang } from '@/i18n/config';
import './globals.css';

/**
 * Root-level 404, for requests that never reached the `[locale]` segment.
 *
 * The root layout is a pass-through — `<html>` and `<body>` live in
 * `app/[locale]/layout.tsx` — so this page has to supply them itself, or the
 * browser receives a fragment with no document structure. Locale-aware 404s
 * are handled by `app/[locale]/not-found.tsx`; this one is the last resort and
 * stays deliberately dependency-free.
 */
export default function RootNotFound() {
  return (
    <html lang={localeHreflang[defaultLocale]}>
      <body>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>404</h1>
          <p style={{ color: 'var(--ink-2)' }}>This page does not exist.</p>
          <a href={`/${defaultLocale}`} className="rm-btn rm-btn--primary">
            Go to RabbitMatch
          </a>
        </main>
      </body>
    </html>
  );
}
