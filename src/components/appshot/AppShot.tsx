import type { ReactNode } from 'react';
import Image from 'next/image';
import { text } from '@/components/blocks/content';
import manifest from './manifest.json';
import styles from './appshot.module.css';

export type ShotName = keyof typeof manifest;

/** `games-list` → `gamesList`, the key this shot's copy lives under. */
const messageKey = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * A screenshot of the app, exactly as the app drew it.
 *
 * The files in `public/app/` are cut out of real captures by
 * `npm run build:shots` — cropped and nothing else. Alt text and the caption
 * come from `appShots.*` in the message catalogue, so the words around the
 * picture are translated and CMS-editable even though the picture is not.
 *
 * Two shapes exist. A whole screen goes inside a phone: real iPhone 19.5:9,
 * with the status bar and the island in the pixels so nothing is drawn over
 * the app's own header. A cut-out is shown as a plain card — half a screen
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
  const [alt, caption] = await Promise.all([
    text(`appShots.${key}.alt`),
    captioned ? text(`appShots.${key}.caption`) : Promise.resolve(''),
  ]);

  const { w, h, frame } = manifest[name];

  const image = (
    <Image
      src={`/app/${name}.webp`}
      alt={alt}
      width={w}
      height={h}
      priority={priority}
      sizes={sizes ?? (frame ? '(max-width: 720px) 74vw, 300px' : '(max-width: 900px) 90vw, 520px')}
      className={frame ? styles.screen : styles.crop}
      // Never blow a cut-out up past the pixels it actually has.
      style={frame ? undefined : { maxWidth: `${w}px` }}
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
