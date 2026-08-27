import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { loadTree } from '@/lib/tree/store';
import { nodeTitle } from '@/lib/tree/types';
import { SectionTree } from './SectionTree';
import styles from './tree.module.css';

/**
 * Sub-pages an admin filed under a hand-written page.
 *
 * A page like `/players` is a route with its own file, so nothing on it knows
 * about the site tree. When someone adds `/players/kak-vybrat-raketku` in the
 * tree manager, that page is reachable by URL and by the header dropdown — but
 * unless it is also listed on `/players` itself, a reader who lands there has
 * no way to discover it and a crawler has no internal link to follow.
 *
 * This renders nothing at all until such a page exists, which is why it can sit
 * unconditionally in `PageBody` and cost every hand-written page one cached
 * tree lookup and an early return.
 */
export async function CodePageChildren({ page, locale }: { page: string; locale: Locale }) {
  const anchor = (await loadTree()).find((node) => node.codePage && node.path === page);
  if (!anchor?.children.length) return null;

  const t = await getTranslations('learn');

  return (
    <section className={styles.body} aria-labelledby="code-page-children">
      <div className={styles.container}>
        <h2 id="code-page-children" className={styles.bodyTitle}>
          {t('contents')}
        </h2>
        <p className={styles.siblingsParent}>{nodeTitle(anchor, locale)}</p>
        <SectionTree nodes={anchor.children} locale={locale} />
      </div>
    </section>
  );
}
