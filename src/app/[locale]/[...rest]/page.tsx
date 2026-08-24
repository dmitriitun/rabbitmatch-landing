import { notFound } from 'next/navigation';

/**
 * Catch-all inside the locale segment.
 *
 * Without it, a URL like `/ru/nope` matches no route at all and Next falls
 * back to the *root* `not-found.tsx`, which sits outside the locale layout —
 * so the visitor gets an unbranded, untranslated page. This route matches, then
 * immediately calls `notFound()`, which renders `app/[locale]/not-found.tsx`
 * inside the locale layout with the header, footer and the right language.
 */
export default function CatchAllNotFound() {
  notFound();
}
