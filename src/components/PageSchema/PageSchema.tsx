import { getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { list, type FaqItem, type StepItem } from '@/components/blocks/content';
import type { Locale } from '@/i18n/config';
import {
  breadcrumbNode,
  faqNode,
  graph,
  howToNode,
  webPageNode,
} from '@/lib/structured-data';

/**
 * Per-page structured data.
 *
 * Emits a `WebPage`, a two-level `BreadcrumbList`, and — when the page has
 * them — `FAQPage` and `HowTo` nodes built from the same content the page
 * renders. Keeping them derived from the message catalogue rather than
 * duplicated by hand means the markup can never drift out of sync with the
 * visible answers, which is exactly the mismatch that gets rich results
 * pulled.
 */
export async function PageSchema({
  locale,
  path,
  ns,
  faqKey,
  howToKey,
}: {
  locale: Locale;
  path: string;
  ns: string;
  /** Full key of an array of `{ question, answer }`, e.g. `players.faq.items`. */
  faqKey?: string;
  /** Full key of an array of `{ title, text }` rendered as an ordered process. */
  howToKey?: string;
}) {
  const tMeta = await getTranslations({ locale, namespace: `${ns}.meta` });
  const tHero = await getTranslations({ locale, namespace: `${ns}.hero` });

  const title = tMeta('title');
  const description = tMeta('description');

  const nodes = [
    webPageNode(locale, path, title, description),
    breadcrumbNode(locale, [
      { name: 'RabbitMatch', path: '/' },
      { name: title, path },
    ]),
  ];

  if (faqKey) {
    const items = await list<FaqItem>(faqKey);
    if (items.length) nodes.push(faqNode(items));
  }

  if (howToKey) {
    const steps = await list<StepItem>(howToKey);
    if (steps.length) {
      nodes.push(
        howToNode(
          tHero('title'),
          steps.map((s) => ({ name: s.title, text: s.text })),
        ),
      );
    }
  }

  return <JsonLd data={graph(nodes)} />;
}
