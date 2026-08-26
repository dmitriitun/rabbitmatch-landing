import { ArrowLeft, ArrowRight, Eye, FileText, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { BuilderSlot } from '@/components/Builder/BuilderSlot';
import { PageBody } from '@/components/Builder/PageBody';
import { CtaBand } from '@/components/blocks';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { flatten, nodeSummary, nodeTitle, type TreeNode } from '@/lib/tree/types';
import { Breadcrumbs } from './Breadcrumbs';
import { SectionTree } from './SectionTree';
import { TreeFilter } from './TreeFilter';
import styles from './tree.module.css';

/**
 * A page that came from the site tree.
 *
 * Two shapes, one component, because they share more than they differ: the
 * same breadcrumbs, the same builder slots, the same closing call to action.
 * What changes is the middle — an index lists what is inside it, an article is
 * a document with a counter and a way onwards.
 *
 * Where the admin's own content goes: the `top` slot, between the heading and
 * the listing. That is the body of the page. `bottom` sits under everything,
 * for whatever an author wants after the payload. Both are ordinary builder
 * slots, so writing one of these pages is the same gesture as editing any
 * other page on the site.
 */

const TREE_ID = 'section-tree';
/** Enough rows that scanning them is work, which is when search earns its JS. */
const FILTER_THRESHOLD = 8;

export async function NodePage({
  node,
  trail,
  locale,
}: {
  node: TreeNode;
  /** Root → this node, inclusive. */
  trail: ReadonlyArray<TreeNode>;
  locale: Locale;
}) {
  const t = await getTranslations('learn');
  const title = nodeTitle(node, locale);
  const summary = nodeSummary(node, locale);

  const crumbs = [
    { name: t('home'), path: '/' },
    ...trail.map((step) => ({ name: nodeTitle(step, locale), path: step.path })),
  ];

  const isArticle = node.kind === 'article' && node.children.length === 0;

  return (
    <main>
      <PageBody page={node.path} locale={locale}>
        <header className={`${styles.hero} ${isArticle ? styles.heroArticle : ''}`}>
          <div className={styles.container}>
            <Breadcrumbs trail={crumbs} label={t('breadcrumbs')} />

            <h1 className={styles.heroTitle}>{title}</h1>
            {summary ? <p className={styles.heroLead}>{summary}</p> : null}

            <p className={styles.heroMeta}>
              {isArticle ? (
                <span className={styles.metaItem}>
                  <Eye size={15} aria-hidden="true" />
                  {t('views', { count: node.views })}
                </span>
              ) : (
                <>
                  <span className={styles.metaItem}>
                    <FileText size={15} aria-hidden="true" />
                    {t('materials', { count: node.articleCount })}
                  </span>
                  {node.totalViews > 0 ? (
                    <span className={styles.metaItem}>
                      <Eye size={15} aria-hidden="true" />
                      {t('views', { count: node.totalViews })}
                    </span>
                  ) : null}
                </>
              )}
            </p>
          </div>
        </header>

        {/* The page body an admin composes in the builder. */}
        <BuilderSlot page={node.path} slot="top" locale={locale} />

        {isArticle ? (
          <ArticleFooter node={node} trail={trail} locale={locale} />
        ) : (
          <SectionIndex node={node} locale={locale} />
        )}

        <BuilderSlot page={node.path} slot="bottom" locale={locale} />

        <CtaBand
          titleKey="learn.cta.title"
          leadKey="learn.cta.lead"
          primaryLabelKey="learn.cta.primary"
          secondaryHref="/pricing"
          secondaryLabelKey="learn.cta.secondary"
        />
      </PageBody>
    </main>
  );
}

/* --- Index --------------------------------------------------------------- */

async function SectionIndex({ node, locale }: { node: TreeNode; locale: Locale }) {
  const t = await getTranslations('learn');
  const descendants = flatten(node.children);
  const articles = descendants.filter((item) => item.kind === 'article');
  const popular = articles
    .filter((item) => item.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return (
    <section className={styles.body} aria-labelledby="section-contents">
      <div className={styles.container}>
        <div className={styles.bodyHead}>
          <h2 id="section-contents" className={styles.bodyTitle}>
            {t('contents')}
          </h2>
          {descendants.length >= FILTER_THRESHOLD ? (
            <TreeFilter
              targetId={TREE_ID}
              labels={{
                placeholder: t('searchPlaceholder'),
                expandAll: t('expandAll'),
                collapseAll: t('collapseAll'),
                clear: t('searchClear'),
                empty: t('searchEmpty'),
                found: t.raw('searchFound') as string,
              }}
            />
          ) : null}
        </div>

        {node.children.length ? (
          <SectionTree nodes={node.children} locale={locale} id={TREE_ID} />
        ) : (
          <p className={styles.empty}>{t('emptySection')}</p>
        )}

        {popular.length >= 3 ? (
          <div className={styles.popular}>
            <h2 className={styles.popularTitle}>
              <Sparkles size={16} aria-hidden="true" />
              {t('popular')}
            </h2>
            <ul className={styles.popularList}>
              {popular.map((item) => (
                <li key={item.id}>
                  <Link href={item.path} className={styles.popularCard}>
                    <span className={styles.popularName}>{nodeTitle(item, locale)}</span>
                    <span className={styles.popularViews}>
                      <Eye size={13} aria-hidden="true" />
                      {t('views', { count: item.views })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* --- Article ------------------------------------------------------------- */

/**
 * What follows an article: its neighbours, and the way back up.
 *
 * A reader who finished one guide is the cheapest reader the site will ever
 * get for the next one, and "previous / next in this section" is the whole
 * mechanism — no recommendation engine, just the order the author already
 * chose in the tree.
 */
async function ArticleFooter({
  node,
  trail,
  locale,
}: {
  node: TreeNode;
  trail: ReadonlyArray<TreeNode>;
  locale: Locale;
}) {
  const t = await getTranslations('learn');
  const parent = trail.length >= 2 ? trail[trail.length - 2] : null;
  const siblings = parent ? parent.children : [];
  const index = siblings.findIndex((item) => item.id === node.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  if (!parent) return null;

  return (
    <section className={styles.body}>
      <div className={styles.container}>
        {prev || next ? (
          <nav className={styles.pager} aria-label={t('pager')}>
            {prev ? (
              <Link href={prev.path} className={`${styles.pagerLink} ${styles.pagerPrev}`}>
                <ArrowLeft size={15} aria-hidden="true" />
                <span>
                  <span className={styles.pagerLabel}>{t('previous')}</span>
                  <span className={styles.pagerName}>{nodeTitle(prev, locale)}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={next.path} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                <span>
                  <span className={styles.pagerLabel}>{t('next')}</span>
                  <span className={styles.pagerName}>{nodeTitle(next, locale)}</span>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        {siblings.length > 1 ? (
          <div className={styles.siblings}>
            <h2 className={styles.bodyTitle}>{t('inThisSection')}</h2>
            <p className={styles.siblingsParent}>
              <Link href={parent.path} className={styles.crumbLink}>
                {nodeTitle(parent, locale)}
              </Link>
            </p>
            <SectionTree nodes={siblings} locale={locale} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
