import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { links } from '@/lib/site';
import { AppStoreIcon, GooglePlayIcon, TelegramGlyph, WebGlyph } from './StoreIcons';
import { BlockIcon } from './icons';
import { list, text, type FaqItem, type FeatureItem, type StatItem, type StepItem } from './content';
import styles from './blocks.module.css';

/* =========================================================================
   Page building blocks.

   All server components. Content comes from `messages/*.json` by key, so a
   page is a short list of blocks and every string stays translatable and
   editable in the admin CMS. Each rendered string carries `data-rm-key`
   (see `EditableText`) so `AdminEditLayer` can pick it up.
   ========================================================================= */

type Tone = 'default' | 'subtle' | 'tint' | 'dark';

const TONE_CLASS: Record<Tone, string> = {
  default: '',
  subtle: styles.subtle,
  tint: styles.tint,
  dark: styles.dark,
};

export function Section({
  id,
  tone = 'default',
  children,
  labelledBy,
}: {
  id?: string;
  tone?: Tone;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section id={id} className={`${styles.section} ${TONE_CLASS[tone]}`} aria-labelledby={labelledBy}>
      <div className={styles.container}>{children}</div>
    </section>
  );
}

export async function SectionHead({
  eyebrowKey,
  titleKey,
  leadKey,
  centered = false,
  headingId,
  as: Heading = 'h2',
}: {
  eyebrowKey?: string;
  titleKey: string;
  leadKey?: string;
  centered?: boolean;
  headingId?: string;
  as?: 'h2' | 'h3';
}) {
  const [eyebrow, title, lead] = await Promise.all([
    eyebrowKey ? text(eyebrowKey) : Promise.resolve(''),
    text(titleKey),
    leadKey ? text(leadKey) : Promise.resolve(''),
  ]);

  return (
    <div className={`${styles.head} ${centered ? styles.headCentered : ''}`}>
      {eyebrow ? (
        <p className={styles.eyebrow} data-rm-key={eyebrowKey}>
          {eyebrow}
        </p>
      ) : null}
      <Heading id={headingId} className={styles.title} data-rm-key={titleKey}>
        {title}
      </Heading>
      {lead ? (
        <p className={styles.lead} data-rm-key={leadKey}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/* --- Page hero -----------------------------------------------------------
   The `<h1>` of an audience page. Every content page has exactly one, which
   is what gives each URL its own ranking target instead of the whole site
   competing on a single home-page headline.
   ------------------------------------------------------------------------ */

export async function PageHero({
  ns,
  primaryHref = '/#download',
  secondaryHref,
  aside,
}: {
  /** Namespace holding `hero.{eyebrow,title,lead,points,primary,secondary}`. */
  ns: string;
  primaryHref?: string;
  secondaryHref?: string;
  aside?: ReactNode;
}) {
  const base = `${ns}.hero`;
  const [eyebrow, title, lead, primary, secondary] = await Promise.all([
    text(`${base}.eyebrow`),
    text(`${base}.title`),
    text(`${base}.lead`),
    text(`${base}.primary`),
    text(`${base}.secondary`),
  ]);
  const points = await list<string>(`${base}.points`);

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={`${styles.heroInner} ${aside ? styles.heroWithAside : ''}`}>
          <div className={styles.heroCopy}>
            {eyebrow ? (
              <p className={styles.heroBadge} data-rm-key={`${base}.eyebrow`}>
                {eyebrow}
              </p>
            ) : null}

            <h1 className={styles.heroTitle} data-rm-key={`${base}.title`}>
              {title}
            </h1>

            {lead ? (
              <p className={styles.heroLead} data-rm-key={`${base}.lead`}>
                {lead}
              </p>
            ) : null}

            {points.length ? (
              <ul className={styles.heroPoints}>
                {points.map((point, i) => (
                  <li key={`${base}-point-${i}`} className={styles.heroPoint}>
                    <span className={styles.heroPointMark} aria-hidden="true">
                      ✓
                    </span>
                    <span data-rm-key={`${base}.points.${i}`}>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className={styles.heroActions}>
              {primary ? (
                <Link href={primaryHref} className="rm-btn rm-btn--primary">
                  {primary}
                </Link>
              ) : null}
              {secondary && secondaryHref ? (
                <Link href={secondaryHref} className="rm-btn rm-btn--ghost">
                  {secondary}
                </Link>
              ) : null}
            </div>
          </div>

          {aside ? <div>{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}

/* --- Split ---------------------------------------------------------------
   Copy on one side, an illustration on the other. Used wherever the picture
   carries the argument and the text is really a caption — matchmaking weights,
   the court ladder, a venue's hour grid.
   ------------------------------------------------------------------------ */

export async function Split({
  eyebrowKey,
  titleKey,
  leadKey,
  media,
  reversed = false,
  headingId,
  children,
}: {
  eyebrowKey?: string;
  titleKey: string;
  leadKey?: string;
  media: ReactNode;
  reversed?: boolean;
  headingId?: string;
  children?: ReactNode;
}) {
  const [eyebrow, title, lead] = await Promise.all([
    eyebrowKey ? text(eyebrowKey) : Promise.resolve(''),
    text(titleKey),
    leadKey ? text(leadKey) : Promise.resolve(''),
  ]);

  return (
    <div className={`${styles.split} ${reversed ? styles.splitReversed : ''}`}>
      <div className={styles.splitCopy}>
        {eyebrow ? (
          <p className={styles.eyebrow} data-rm-key={eyebrowKey}>
            {eyebrow}
          </p>
        ) : null}
        <h2 id={headingId} className={styles.title} data-rm-key={titleKey}>
          {title}
        </h2>
        {lead ? (
          <p className={styles.lead} data-rm-key={leadKey}>
            {lead}
          </p>
        ) : null}
        {children}
      </div>
      <div className={styles.splitMedia}>{media}</div>
    </div>
  );
}

/* --- Feature grid -------------------------------------------------------- */

export async function FeatureGrid({
  itemsKey,
  columns = 3,
}: {
  itemsKey: string;
  columns?: 2 | 3 | 4;
}) {
  const items = await list<FeatureItem>(itemsKey);
  if (!items.length) return null;

  const columnClass =
    columns === 2 ? styles.featuresTwo : columns === 4 ? styles.featuresFour : '';

  return (
    <ul className={`${styles.features} ${columnClass}`}>
      {items.map((item, i) => (
        <li key={`${itemsKey}-${i}`} className={styles.feature}>
          <span className={styles.featureIcon}>
            <BlockIcon name={item.icon} />
          </span>
          <h3 className={styles.featureTitle} data-rm-key={`${itemsKey}.${i}.title`}>
            {item.title}
          </h3>
          <p className={styles.featureText} data-rm-key={`${itemsKey}.${i}.text`}>
            {item.text}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* --- Audience grid -------------------------------------------------------
   Like FeatureGrid, but every card is a link to that audience's page. This is
   the home page's main internal-linking surface: it is how a visitor — and a
   crawler — gets from the entry point to the four pages that actually rank.
   ------------------------------------------------------------------------ */

export async function AudienceGrid({
  itemsKey,
  hrefs,
  ctaKey,
}: {
  itemsKey: string;
  hrefs: ReadonlyArray<string>;
  ctaKey: string;
}) {
  const items = await list<FeatureItem>(itemsKey);
  if (!items.length) return null;
  const cta = await text(ctaKey);

  return (
    <ul className={`${styles.features} ${styles.featuresFour}`}>
      {items.map((item, i) => (
        <li key={`${itemsKey}-${i}`}>
          <Link href={hrefs[i] ?? '/'} className={styles.audienceCard}>
            <span className={styles.featureIcon}>
              <BlockIcon name={item.icon} />
            </span>
            <h3 className={styles.featureTitle} data-rm-key={`${itemsKey}.${i}.title`}>
              {item.title}
            </h3>
            <p className={styles.featureText} data-rm-key={`${itemsKey}.${i}.text`}>
              {item.text}
            </p>
            <span className={styles.audienceCta} aria-hidden="true">
              {cta} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* --- Steps --------------------------------------------------------------- */

export async function Steps({ itemsKey }: { itemsKey: string }) {
  const items = await list<StepItem>(itemsKey);
  if (!items.length) return null;

  return (
    <ol className={styles.steps}>
      {items.map((item, i) => (
        <li key={`${itemsKey}-${i}`} className={styles.step}>
          <span className={styles.stepNum} aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className={styles.stepBody}>
            <h3 className={styles.stepTitle} data-rm-key={`${itemsKey}.${i}.title`}>
              {item.title}
            </h3>
            <p className={styles.stepText} data-rm-key={`${itemsKey}.${i}.text`}>
              {item.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* --- Stats --------------------------------------------------------------- */

export async function StatStrip({ itemsKey }: { itemsKey: string }) {
  const items = await list<StatItem>(itemsKey);
  if (!items.length) return null;

  return (
    <ul className={styles.stats}>
      {items.map((item, i) => (
        <li key={`${itemsKey}-${i}`} className={styles.statItem}>
          <span className={styles.statValue} data-rm-key={`${itemsKey}.${i}.value`}>
            {item.value}
          </span>
          <span className={styles.statLabel} data-rm-key={`${itemsKey}.${i}.label`}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* --- FAQ -----------------------------------------------------------------
   Built on <details>/<summary>: it is an accordion with zero JavaScript, it
   is keyboard accessible for free, and — the part that matters for search —
   the answers are in the HTML whether or not the item is open, so crawlers
   and answer engines read all of them.
   ------------------------------------------------------------------------ */

export async function Faq({ itemsKey }: { itemsKey: string }) {
  const items = await list<FaqItem>(itemsKey);
  if (!items.length) return null;

  return (
    <div className={styles.faqList}>
      {items.map((item, i) => (
        <details key={`${itemsKey}-${i}`} className={styles.faqItem} name={itemsKey}>
          <summary className={styles.faqSummary} data-rm-key={`${itemsKey}.${i}.question`}>
            {item.question}
          </summary>
          <p className={styles.faqAnswer} data-rm-key={`${itemsKey}.${i}.answer`}>
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

/* --- CTA band ------------------------------------------------------------ */

export async function CtaBand({
  titleKey,
  leadKey,
  primaryHref = '/#download',
  primaryLabelKey,
  secondaryHref,
  secondaryLabelKey,
}: {
  titleKey: string;
  leadKey?: string;
  primaryHref?: string;
  primaryLabelKey: string;
  secondaryHref?: string;
  secondaryLabelKey?: string;
}) {
  const [title, lead, primaryLabel, secondaryLabel] = await Promise.all([
    text(titleKey),
    leadKey ? text(leadKey) : Promise.resolve(''),
    text(primaryLabelKey),
    secondaryLabelKey ? text(secondaryLabelKey) : Promise.resolve(''),
  ]);

  return (
    <section className={`${styles.cta} ${styles.dark}`}>
      <div className={styles.container}>
        <div className={styles.ctaInner}>
          <div>
            <h2 className={styles.ctaTitle} data-rm-key={titleKey}>
              {title}
            </h2>
            {lead ? (
              <p className={styles.ctaLead} data-rm-key={leadKey}>
                {lead}
              </p>
            ) : null}
          </div>
          <div className={styles.heroActions}>
            <Link href={primaryHref} className="rm-btn rm-btn--lime">
              {primaryLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className="rm-btn rm-btn--ghost">
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --- App badges ---------------------------------------------------------- */

type BadgeKey = 'appStore' | 'googlePlay' | 'webApp' | 'telegram';

const BADGES: Array<{ key: BadgeKey; href?: string; smallKey: string; Icon: () => ReactNode }> = [
  { key: 'appStore', href: links.ios, smallKey: 'downloadOn', Icon: AppStoreIcon },
  { key: 'googlePlay', href: links.android, smallKey: 'getItOn', Icon: GooglePlayIcon },
  { key: 'webApp', href: links.web, smallKey: 'openIn', Icon: WebGlyph },
  { key: 'telegram', href: links.telegramApp, smallKey: 'openIn', Icon: TelegramGlyph },
];

export async function AppBadges({ ns = 'hero' }: { ns?: string }) {
  const labels = await Promise.all(
    BADGES.map(async (b) => ({
      small: await text(`${ns}.${b.smallKey}`),
      label: await text(`${ns}.${b.key}`),
    })),
  );

  return (
    <ul className={styles.badges}>
      {BADGES.map((badge, i) => {
        const { small, label } = labels[i];
        const content = (
          <>
            <badge.Icon />
            <span className={styles.badgeText}>
              <span className={styles.badgeSmall}>{small}</span>
              <span className={styles.badgeLabel}>{label}</span>
            </span>
          </>
        );

        return (
          <li key={badge.key}>
            {badge.href ? (
              <a
                href={badge.href}
                className={styles.badge}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${small} ${label}`}
              >
                {content}
              </a>
            ) : (
              <span className={`${styles.badge} ${styles.badgeDisabled}`} aria-disabled="true">
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export { styles as blockStyles };
