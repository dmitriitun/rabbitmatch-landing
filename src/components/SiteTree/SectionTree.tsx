import { ChevronRight, FileText, Folder } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/config';
import { nodeSummary, nodeTitle, type TreeNode } from '@/lib/tree/types';
import styles from './tree.module.css';

/**
 * The contents of a section, as deep as it goes.
 *
 * Built on `<details>`/`<summary>` for the same reason the FAQ is: it is an
 * accordion with no JavaScript, it is keyboard-operable and screen-reader
 * announced for free, and — the part that matters for search — every branch is
 * in the HTML whether it is open or closed. A crawler reading a collapsed
 * section sees the whole tree; a visitor sees a tidy list. There is no second
 * rendering path where those two could disagree.
 *
 * Nesting is not capped. A group renders groups, which render groups; the only
 * thing that changes with depth is the indent, and past the third level the
 * indent stops growing so a deep branch cannot walk off a phone screen.
 */

export async function SectionTree({
  nodes,
  locale,
  id,
}: {
  nodes: ReadonlyArray<TreeNode>;
  locale: Locale;
  /** Anchor for the filter, which drives this subtree from the outside. */
  id?: string;
}) {
  const t = await getTranslations('learn');
  if (!nodes.length) return null;

  return (
    <div className={styles.tree} id={id} data-rm-tree="">
      <Branch
        nodes={nodes}
        locale={locale}
        labels={{
          materials: (count: number) => t('materials', { count }),
          views: (count: number) => t('views', { count }),
          openSection: t('openSection'),
        }}
      />
    </div>
  );
}

type Labels = {
  materials: (count: number) => string;
  views: (count: number) => string;
  openSection: string;
};

function Branch({
  nodes,
  locale,
  labels,
}: {
  nodes: ReadonlyArray<TreeNode>;
  locale: Locale;
  labels: Labels;
}) {
  return (
    <ul className={styles.list}>
      {nodes.map((node) => (
        <li
          key={node.id}
          className={styles.item}
          data-rm-tree-item=""
          /*
            The filter matches against this rather than against the rendered
            text: it is already lowercased, it includes the summary the visitor
            can see, and reading it costs one attribute lookup per row instead
            of a `textContent` walk of the whole branch.
          */
          data-rm-search={`${nodeTitle(node, locale)} ${nodeSummary(node, locale)}`.toLowerCase()}
        >
          {node.children.length ? (
            <Group node={node} locale={locale} labels={labels} />
          ) : (
            <Leaf node={node} locale={locale} labels={labels} />
          )}
        </li>
      ))}
    </ul>
  );
}

function Group({ node, locale, labels }: { node: TreeNode; locale: Locale; labels: Labels }) {
  const summary = nodeSummary(node, locale);

  return (
    <details className={styles.group} open={node.openByDefault}>
      <summary className={styles.summary}>
        <span className={styles.chevron} aria-hidden="true">
          <ChevronRight size={16} />
        </span>
        <span className={styles.icon} aria-hidden="true">
          <Folder size={16} />
        </span>
        <span className={styles.main}>
          <span className={styles.title}>{nodeTitle(node, locale)}</span>
          {summary ? <span className={styles.summaryText}>{summary}</span> : null}
        </span>
        <span className={styles.meta}>
          <span className={styles.count}>{labels.materials(node.articleCount)}</span>
          {node.totalViews > 0 ? (
            <span className={styles.views}>{labels.views(node.totalViews)}</span>
          ) : null}
        </span>
      </summary>

      <div className={styles.children}>
        {/*
          The group's own page is reachable from inside the group rather than
          from the title in the summary row. A link in a `<summary>` competes
          with the disclosure it sits in: the same click both navigates and
          toggles, and which one the visitor meant is unknowable.
        */}
        <Link href={node.path} className={styles.groupLink}>
          {labels.openSection}
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
        <Branch nodes={node.children} locale={locale} labels={labels} />
      </div>
    </details>
  );
}

function Leaf({ node, locale, labels }: { node: TreeNode; locale: Locale; labels: Labels }) {
  const summary = nodeSummary(node, locale);

  return (
    <Link href={node.path} className={`${styles.summary} ${styles.leaf}`}>
      <span className={styles.icon} aria-hidden="true">
        {node.kind === 'article' ? <FileText size={16} /> : <Folder size={16} />}
      </span>
      <span className={styles.main}>
        <span className={styles.title}>{nodeTitle(node, locale)}</span>
        {summary ? <span className={styles.summaryText}>{summary}</span> : null}
      </span>
      <span className={styles.meta}>
        {node.views > 0 ? <span className={styles.views}>{labels.views(node.views)}</span> : null}
      </span>
    </Link>
  );
}
