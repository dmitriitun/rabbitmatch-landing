import type { ReactNode } from 'react';
import Image from 'next/image';
import { getLocale } from 'next-intl/server';
import { text } from '@/components/blocks/content';
import manifest from './manifest.json';
import styles from './appshot.module.css';

export type ShotName = keyof typeof manifest;

/** `games-list` → `gamesList`, the key this shot's copy lives under. */
const messageKey = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * A real screenshot of the app.
 *
 * The files in `public/app/` are built by `npm run build:shots` from captures
 * of the running app — one file per locale, because the interface a visitor
 * sees on the site has to be in the language they picked on the site. Alt text
 * and the caption come from `appShots.*` in the message catalogue, so they are
 * translated and CMS-editable like every other string on the page.
 *
 * Two shapes exist. A full screen goes inside a phone: real iPhone 19.5:9,
 * with the status bar and the island already in the pixels so nothing is drawn
 * over the app's own header. A crop is shown as a plain card — half a screen
 * inside a phone reads as a broken phone.
 */
export async function AppShot({
  name,
  captioned = true,
  className,
  priority,
  sizes,
}: {
  name: ShotName;
  captioned?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const key = messageKey(name);
  const [locale, alt, caption] = await Promise.all([
    getLocale(),
    text(`appShots.${key}.alt`),
    captioned ? text(`appShots.${key}.caption`) : Promise.resolve(''),
  ]);

  const { w, h, frame } = manifest[name];

  const image = (
    <Image
      src={`/app/${name}.${locale}.webp`}
      alt={alt}
      width={w}
      height={h}
      priority={priority}
      sizes={sizes ?? (frame ? '(max-width: 720px) 74vw, 300px' : '(max-width: 900px) 90vw, 520px')}
      className={frame ? styles.screen : styles.crop}
    />
  );

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(' ')}>
      {frame ? <div className={styles.phone}>{image}</div> : image}
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}

/** Two or three shots stacked into one column. */
export function ShotStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.stack, className].filter(Boolean).join(' ')}>{children}</div>;
}
