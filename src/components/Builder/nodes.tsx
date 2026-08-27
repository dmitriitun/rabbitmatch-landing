import { Fragment, type CSSProperties, type ReactNode } from 'react';
import {
  COLS_DESKTOP,
  ROW_H,
  SECTION_MAX_WIDTH,
  type BuilderNode,
  type BuilderSection,
  type MediaNode,
  type RichBlockNode,
  type RichDoc,
  type RichInline,
  type RichMark,
} from '@/lib/builder/types';
import styles from './builder.module.css';

/**
 * Presentation for builder content.
 *
 * Nothing in this file is server-only and nothing is a client component, so
 * the same code renders the published page on the server and the live canvas
 * inside the editor. One implementation means what an admin drags is exactly
 * what a visitor gets — the usual builder failure mode, where the editor
 * preview and the published page drift apart, has no room to happen.
 */

/* --- Links --------------------------------------------------------------- */

const LOCALE_PREFIX = /^\/(?:en|ru)(?:\/|$)/;

/**
 * Site-internal paths are authored without the locale (`/players`), because
 * the same document is edited per language and the admin should not have to
 * remember the prefix. Anchors, external URLs and API paths are left alone.
 */
export function localizeHref(href: string, locale: string): string {
  if (!href.startsWith('/')) return href;
  if (href.startsWith('/api/') || LOCALE_PREFIX.test(href)) return href;
  if (href === '/') return `/${locale}`;
  return `/${locale}${href}`;
}

/* --- Rich text ----------------------------------------------------------- */

function markStyle(marks: RichMark[] | undefined): CSSProperties | undefined {
  const style = marks?.find((m) => m.type === 'textStyle');
  if (!style || style.type !== 'textStyle') return undefined;
  const css: CSSProperties = {};
  if (style.attrs.color) css.color = style.attrs.color;
  if (style.attrs.backgroundColor) css.backgroundColor = style.attrs.backgroundColor;
  if (style.attrs.fontSize) css.fontSize = style.attrs.fontSize;
  return Object.keys(css).length ? css : undefined;
}

function renderInline(nodes: RichInline[] | undefined, locale: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  nodes?.forEach((node, i) => {
    const key = `${keyBase}-${i}`;
    if (node.type === 'hardBreak') {
      out.push(<br key={key} />);
      return;
    }

    let el: ReactNode = node.text;
    const marks = node.marks ?? [];

    const style = markStyle(marks);
    if (style) el = <span style={style}>{el}</span>;
    if (marks.some((m) => m.type === 'code')) el = <code>{el}</code>;
    if (marks.some((m) => m.type === 'strike')) el = <s>{el}</s>;
    if (marks.some((m) => m.type === 'underline')) el = <u>{el}</u>;
    if (marks.some((m) => m.type === 'italic')) el = <em>{el}</em>;
    if (marks.some((m) => m.type === 'bold')) el = <strong>{el}</strong>;

    const link = marks.find((m) => m.type === 'link');
    if (link && link.type === 'link') {
      el = (
        <a
          href={localizeHref(link.attrs.href, locale)}
          target={link.attrs.target ?? undefined}
          rel={link.attrs.rel ?? undefined}
        >
          {el}
        </a>
      );
    }

    // A Fragment rather than a wrapper element: the published markup should
    // carry the tags the formatting implies and nothing else.
    out.push(<Fragment key={key}>{el}</Fragment>);
  });
  return out;
}

function renderBlocks(blocks: RichBlockNode[] | undefined, locale: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  blocks?.forEach((block, i) => {
    const key = `${keyBase}-${i}`;
    switch (block.type) {
      case 'paragraph': {
        const align = block.attrs?.textAlign;
        out.push(
          <p key={key} style={align ? { textAlign: align } : undefined}>
            {renderInline(block.content, locale, key)}
          </p>,
        );
        break;
      }
      case 'heading': {
        // `h1` is reachable only on a page the builder has taken over, where
        // the document supplies the page's single top-level heading.
        const level = block.attrs?.level ?? 2;
        const Tag = (level === 1 ? 'h1' : level === 3 ? 'h3' : level === 4 ? 'h4' : 'h2') as
          | 'h1'
          | 'h2'
          | 'h3'
          | 'h4';
        const align = block.attrs?.textAlign;
        out.push(
          <Tag key={key} style={align ? { textAlign: align } : undefined}>
            {renderInline(block.content, locale, key)}
          </Tag>,
        );
        break;
      }
      case 'bulletList':
        out.push(
          <ul key={key}>
            {block.content?.map((item, j) => (
              <li key={`${key}-${j}`}>{renderBlocks(item.content, locale, `${key}-${j}`)}</li>
            ))}
          </ul>,
        );
        break;
      case 'orderedList':
        out.push(
          <ol key={key} start={block.attrs?.start ?? 1}>
            {block.content?.map((item, j) => (
              <li key={`${key}-${j}`}>{renderBlocks(item.content, locale, `${key}-${j}`)}</li>
            ))}
          </ol>,
        );
        break;
      case 'blockquote':
        out.push(<blockquote key={key}>{renderBlocks(block.content, locale, key)}</blockquote>);
        break;
      case 'horizontalRule':
        out.push(<hr key={key} />);
        break;
    }
  });
  return out;
}

export function RichText({
  doc,
  locale,
  className,
}: {
  doc: RichDoc | undefined;
  locale: string;
  className?: string;
}) {
  if (!doc?.content?.length) return null;
  return (
    <div className={className ? `${styles.rich} ${className}` : styles.rich}>
      {renderBlocks(doc.content, locale, 'b')}
    </div>
  );
}

/* --- Geometry ------------------------------------------------------------ */

const FLEX_ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end' } as const;

/** CSS custom properties describing one node's rectangle on both grids. */
export function nodeStyle(node: BuilderNode): CSSProperties {
  const style: Record<string, string | number> = {
    '--rm-x': node.box.x + 1,
    '--rm-w': node.box.w,
    '--rm-y': node.box.y + 1,
    '--rm-h': node.box.h,
    '--rm-mw': node.mobile.w,
    '--rm-ai-m': FLEX_ALIGN[node.mobile.align],
    '--rm-jc': FLEX_ALIGN[node.valign ?? 'start'],
  };
  if (node.type === 'button') {
    style['--rm-ai'] = FLEX_ALIGN[node.align];
  }

  const box = node.boxStyle;
  if (box) {
    if (box.background) style['--rm-node-bg'] = box.background;
    if (box.border && box.borderWidth) {
      style['--rm-node-border'] = `${box.borderWidth}px solid ${box.border}`;
    }
    if (box.radius) style['--rm-node-radius'] = `${box.radius}px`;
    if (box.padding) {
      const { top, right, bottom, left } = box.padding;
      style['--rm-node-pad'] = `${top}px ${right}px ${bottom}px ${left}px`;
    }
    if (box.shadow && box.shadow !== 'none') {
      style['--rm-node-shadow'] = `var(--shadow-${box.shadow})`;
    }
  }

  return style as CSSProperties;
}

export function nodeClassName(node: BuilderNode): string {
  const classes = [styles.node];
  if (node.mobile.hidden) classes.push(styles.hiddenMobileNode);
  if (node.hiddenDesktop) classes.push(styles.hiddenDesktop);
  return classes.join(' ');
}

/** CSS custom properties describing one section's frame. */
export function sectionStyle(section: BuilderSection): CSSProperties {
  const style: Record<string, string | number> = {
    '--rm-pt': `${section.pad.top}px`,
    '--rm-pb': `${section.pad.bottom}px`,
    '--rm-pl': `${section.pad.left}px`,
    '--rm-pr': `${section.pad.right}px`,
    '--rm-pt-m': `${section.padMobile.top}px`,
    '--rm-pb-m': `${section.padMobile.bottom}px`,
    '--rm-pl-m': `${section.padMobile.left}px`,
    '--rm-pr-m': `${section.padMobile.right}px`,
    '--rm-maxw': SECTION_MAX_WIDTH[section.width],
  };
  if (section.minHeight) style['--rm-minh'] = `${section.minHeight}px`;
  if (section.minHeightMobile) style['--rm-minh-m'] = `${section.minHeightMobile}px`;
  if (section.background.kind === 'color' && section.background.color) {
    style['--rm-bg'] = section.background.color;
  }
  if (section.background.kind === 'image') {
    if (section.background.color) style['--rm-bg'] = section.background.color;
    style['--rm-bg-img'] = `url("${section.background.src}")`;
    style['--rm-bg-size'] = section.background.size ?? 'cover';
    style['--rm-bg-pos'] = section.background.position ?? 'center';
    style['--rm-bg-repeat'] = section.background.repeat ? 'repeat' : 'no-repeat';
    style['--rm-overlay'] = String(section.background.overlay ?? 0);
  }
  return style as CSSProperties;
}

export function sectionClassName(section: BuilderSection, extra?: string): string {
  const classes = [styles.section];
  if (section.tone === 'dark') classes.push(styles.toneDark);
  if (section.tone === 'light') classes.push(styles.toneLight);
  if (section.hiddenMobile) classes.push(styles.hiddenMobile);
  if (extra) classes.push(extra);
  return classes.join(' ');
}

/* --- Media --------------------------------------------------------------- */

/** Roughly one desktop column, in px, on a `wide` section. */
const COL_PX = 1200 / COLS_DESKTOP;

function aspectRatio(node: MediaNode): string {
  if (node.width && node.height) return `${node.width} / ${node.height}`;
  // No intrinsic size (an external URL, a video, an embed): fall back to the
  // proportions of the rectangle the admin drew, converting both spans to px
  // so the phone gets a similar shape rather than a default.
  const w = node.box.w * COL_PX;
  const h = node.box.h * ROW_H;
  return h > 0 ? `${w} / ${h}` : '16 / 9';
}

/**
 * `eager` is set by the editor canvas.
 *
 * Lazy loading is right for a published page and wrong while composing one:
 * an admin scrolling to a block should find the image there, not a gap that
 * fills in a moment later — and an animation that has not been fetched yet
 * looks exactly like an animation that stopped.
 */
function MediaInner({ node, eager }: { node: MediaNode; eager?: boolean }) {
  if (node.media === 'video') {
    return (
      <video
        src={node.src}
        poster={node.poster}
        autoPlay={node.autoplay}
        loop={node.loop}
        muted={node.muted}
        controls={node.controls}
        playsInline
        preload={eager || node.autoplay ? 'auto' : 'metadata'}
        aria-label={node.alt || undefined}
      />
    );
  }
  if (node.media === 'embed') {
    return (
      <iframe
        src={node.src}
        title={node.alt || 'Embedded media'}
        loading={eager ? 'eager' : 'lazy'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }
  /*
    A plain `<img>`: `images.unoptimized` is on for the whole project (see
    next.config.ts), so `next/image` would add a wrapper and a client
    component for no benefit. `width`/`height` come from the upload, which is
    what actually prevents the layout shift `next/image` is usually reached
    for.
  */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={node.src}
      alt={node.alt}
      width={node.width}
      height={node.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
    />
  );
}

export function BuilderMedia({
  node,
  locale,
  eager,
}: {
  node: MediaNode;
  locale: string;
  eager?: boolean;
}) {
  const box = (
    <div
      className={styles.mediaBox}
      style={
        {
          '--rm-ar': aspectRatio(node),
          '--rm-fit': node.fit,
          '--rm-radius': `${node.radius}px`,
          '--rm-h': node.box.h,
        } as CSSProperties
      }
    >
      <MediaInner node={node} eager={eager} />
    </div>
  );

  const framed = node.href ? (
    <a className={styles.mediaLink} href={localizeHref(node.href, locale)}>
      {box}
    </a>
  ) : (
    box
  );

  if (!node.caption?.content?.length) return framed;

  return (
    <figure className={styles.figure}>
      {framed}
      <figcaption className={styles.caption}>
        <RichText doc={node.caption} locale={locale} />
      </figcaption>
    </figure>
  );
}

/* --- Node ---------------------------------------------------------------- */

const BTN_VARIANT = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
} as const;

const BTN_SIZE = { sm: styles.btnSm, md: styles.btnMd, lg: styles.btnLg } as const;

export function BuilderNodeBody({
  node,
  locale,
  eager,
}: {
  node: BuilderNode;
  locale: string;
  eager?: boolean;
}) {
  switch (node.type) {
    case 'text':
      return <RichText doc={node.rich} locale={locale} />;
    case 'media':
      return <BuilderMedia node={node} locale={locale} eager={eager} />;
    case 'button':
      return (
        <a
          className={`${styles.btn} ${BTN_VARIANT[node.variant]} ${BTN_SIZE[node.size]}`}
          href={localizeHref(node.href, locale)}
          target={node.newTab ? '_blank' : undefined}
          rel={node.newTab ? 'noopener noreferrer' : undefined}
        >
          {node.label}
        </a>
      );
    case 'divider':
      return (
        <hr
          className={styles.divider}
          style={node.color ? ({ '--rm-line': node.color } as CSSProperties) : undefined}
        />
      );
    case 'spacer':
      return <div className={styles.spacer} aria-hidden="true" />;
  }
}

export function BuilderNodeView({ node, locale }: { node: BuilderNode; locale: string }) {
  return (
    <div className={nodeClassName(node)} style={nodeStyle(node)} data-rm-node={node.id}>
      <BuilderNodeBody node={node} locale={locale} />
    </div>
  );
}

/* --- Section ------------------------------------------------------------- */

export function BuilderSectionView({
  section,
  locale,
}: {
  section: BuilderSection;
  locale: string;
}) {
  if (section.hidden) return null;
  return (
    <section id={section.anchor} className={sectionClassName(section)} style={sectionStyle(section)}>
      {section.background.kind === 'image' ? <div className={styles.bg} aria-hidden="true" /> : null}
      <div className={styles.inner}>
        <div className={styles.grid}>
          {section.nodes.map((node) => (
            <BuilderNodeView key={node.id} node={node} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}

export { styles as builderStyles };
