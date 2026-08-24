import { getTranslations } from 'next-intl/server';
import type { ElementType } from 'react';

type Props = {
  /** Full i18n key path, e.g. `hero.title` or `pricing.classic.priceMonthlyNew`. */
  tKey: string;
  /** HTML element used to wrap the rendered string. Defaults to `span`. */
  as?: ElementType;
  /** Multiline content — the caller's CSS is expected to set `white-space: pre-wrap`. */
  multiline?: boolean;
  className?: string;
};

/**
 * Renders a translatable string and tags it with its content key.
 *
 * This is a **server** component. It used to be a client component so that
 * admins could edit in place, which meant every headline, label and list item
 * on the page opened its own client boundary — hundreds of them — and every
 * one of those had to be serialised into the RSC payload and hydrated in the
 * browser, for a feature that only a handful of admin sessions ever use.
 *
 * Now the markup is plain server-rendered HTML carrying a `data-rm-key`
 * attribute, and a single client component (`AdminEditLayer`) picks those up
 * by delegation once an admin session is detected. Public visitors download
 * and hydrate nothing.
 */
export async function EditableText({ tKey, as: Tag = 'span', multiline, className }: Props) {
  const lastDotAt = tKey.lastIndexOf('.');
  const namespace = lastDotAt === -1 ? undefined : tKey.slice(0, lastDotAt);
  const leaf = lastDotAt === -1 ? tKey : tKey.slice(lastDotAt + 1);

  const t = await getTranslations(namespace);

  let value: string;
  try {
    value = t(leaf);
  } catch {
    value = '';
  }

  return (
    <Tag className={className} data-rm-key={tKey} data-rm-multiline={multiline ? '1' : undefined}>
      {value}
    </Tag>
  );
}
