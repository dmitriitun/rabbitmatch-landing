'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  durationMs?: number;
};

type Parsed = { prefix: string; num: number; suffix: string };

function parseAnimatable(value: string): Parsed | null {
  const m = /^(\D*)(\d+)(\D*)$/.exec(value.trim());
  if (!m) return null;
  const num = Number(m[2]);
  if (!Number.isFinite(num)) return null;
  return { prefix: m[1] ?? '', num, suffix: m[3] ?? '' };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function AnimatedCounter({ value, durationMs = 1200 }: Props) {
  const parsed = parseAnimatable(value);

  // Initial display:
  //  - server / first paint: full value (avoids hydration mismatch and animation flash)
  //  - after mount (effect): if animatable & motion allowed, snap to "0" and animate on view.
  const [display, setDisplay] = useState<string>(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!parsed || startedRef.current) return;
    if (prefersReducedMotion()) return; // already showing final value
    const node = ref.current;
    if (!node) return;

    const animate = () => {
      startedRef.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(parsed.num * eased);
        setDisplay(`${parsed.prefix}${current}${parsed.suffix}`);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            obs.disconnect();
            animate();
            return;
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [parsed, durationMs]);

  return <span ref={ref}>{display}</span>;
}
