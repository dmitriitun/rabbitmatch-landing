import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * Every real page lives under `app/[locale]`, which is where `<html>` and
 * `<body>` are rendered — the lang attribute has to follow the URL locale.
 * Next still requires a root layout for the segment above it, so this one is
 * a pass-through.
 *
 * It does carry `metadataBase`, though: routes that sit outside the locale
 * segment — the root 404 and the OG image — otherwise resolve their absolute
 * URLs against `http://localhost:3000` and warn about it on every render.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
