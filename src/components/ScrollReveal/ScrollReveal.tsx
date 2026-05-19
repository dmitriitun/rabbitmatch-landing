'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './ScrollReveal.module.css';

type Props = {
  children: ReactNode;
  delayMs?: number;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** translation amount in pixels (default 24) */
  offset?: number;
};

export function ScrollReveal({
  children,
  delayMs = 0,
  as = 'div',
  className,
  offset = 24,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Reduced-motion users see the content immediately via CSS (no transition).
    // We still trigger the "shown" state so it's applied without delay.
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            obs.disconnect();
            setShown(true);
            return;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const Tag = as as 'div';

  const style: CSSProperties = {
    '--reveal-delay': `${delayMs}ms`,
    '--reveal-offset': `${offset}px`,
  } as CSSProperties;

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${styles.reveal} ${shown ? styles.shown : ''} ${className ?? ''}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
