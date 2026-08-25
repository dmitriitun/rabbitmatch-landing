import type { ReactNode } from 'react';
import { loadBuilderDoc } from '@/lib/builder/store';
import type { Locale } from '@/i18n/config';
import { BuilderSlot } from './BuilderSlot';

/**
 * The body of a page — either as written in code, or as composed in the
 * builder.
 *
 * A page hands its hand-written markup to this component as `children`. React
 * builds the element tree but does not invoke those components, so when a
 * document has taken the page over none of the original body runs: no
 * translations resolved, no blocks rendered. What renders instead is the
 * document, through the same `BuilderSlot` the partial mode uses.
 *
 * What deliberately stays outside this component on every page: `generate-
 * Metadata`, the `hreflang` alternates and the JSON-LD blocks. Those describe
 * the page rather than fill it, and losing them to an edit in the builder
 * would cost far more than it saves.
 *
 * The extra `loadBuilderDoc` here is free in practice — `BuilderSlot` asks for
 * the same (page, locale) a moment later and the store answers both from one
 * cache entry.
 */
export async function PageBody({
  page,
  locale,
  children,
}: {
  page: string;
  locale: Locale;
  children: ReactNode;
}) {
  const doc = await loadBuilderDoc(page, locale);

  if (doc.takeover) {
    return <BuilderSlot page={page} slot="page" locale={locale} />;
  }

  return <>{children}</>;
}
