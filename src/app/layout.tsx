/**
 * Every real page lives under `app/[locale]`, which is where `<html>` and
 * `<body>` are rendered — the lang attribute has to follow the URL locale.
 * Next still requires a root layout for the segment above it, so this one is
 * a pass-through.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
