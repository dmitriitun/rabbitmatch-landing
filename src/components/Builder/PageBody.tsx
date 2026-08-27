import type { ReactNode } from 'react';
import { loadBuilderDoc } from '@/lib/builder/store';
import type { Locale } from '@/i18n/config';
import { CodePageChildren } from '@/components/SiteTree/CodePageChildren';
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

  /*
    Sub-pages filed under this route are appended in both modes, because they
    are not part of the body at all — they are the page's children, and
    replacing the body with a document should not make them vanish. On every
    page that has none (which is most of them, most of the time) this renders
    nothing.
  */
  const subPages = <CodePageChildren page={page} locale={locale} />;

  if (doc.takeover) {
    return (
      <>
        <BuilderSlot page={page} slot="page" locale={locale} />
        {subPages}
      </>
    );
  }

  return (
    <>
      {children}
      {subPages}
    </>
  );
}
