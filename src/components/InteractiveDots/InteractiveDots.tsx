'use client';

import { useEffect, useRef } from 'react';
import styles from './InteractiveDots.module.css';

type Dot = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: 'lime' | 'white';
  alpha: number;
};

// Antigravity-style interactive starfield: dots are pushed away from the
// cursor, then spring back to their resting position. Pure canvas — no DOM
// nodes per dot — so it stays cheap on mobile.
const SPACING = 28; // px between dots in resting grid
const MAX_RADIUS = 140; // px — cursor influence radius
const REPEL_FORCE = 18; // px — peak push at cursor
const RETURN = 0.08; // spring strength toward baseX/baseY
const DAMPING = 0.82; // velocity damping per frame
const LIME = 'rgba(185, 233, 1, ALPHA)';
const WHITE = 'rgba(255, 255, 255, ALPHA)';

export function InteractiveDots() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;

    const buildDots = () => {
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      const dots: Dot[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = c * SPACING;
          const baseY = r * SPACING;
          // Deterministic-ish color split: ~25% lime, rest white
          const colorRoll = (c * 73 + r * 131) % 100;
          const color: Dot['color'] = colorRoll < 25 ? 'lime' : 'white';
          const alpha = color === 'lime' ? 0.55 : 0.32;
          dots.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            vx: 0,
            vy: 0,
            radius: color === 'lime' ? 1.4 : 1.1,
            color,
            alpha,
          });
        }
      }
      dotsRef.current = dots;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const onLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const dots = dotsRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouseActive = mouseRef.current.active;

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];

        if (mouseActive) {
          const dx = d.x - mx;
          const dy = d.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < MAX_RADIUS * MAX_RADIUS && distSq > 0.001) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / MAX_RADIUS) * REPEL_FORCE;
            d.vx += (dx / dist) * force * 0.08;
            d.vy += (dy / dist) * force * 0.08;
          }
        }

        // Spring back to base position
        d.vx += (d.baseX - d.x) * RETURN;
        d.vy += (d.baseY - d.y) * RETURN;
        d.vx *= DAMPING;
        d.vy *= DAMPING;
        d.x += d.vx;
        d.y += d.vy;

        // Distance-from-base modulates alpha → dots near cursor glow a bit
        const offset = Math.hypot(d.x - d.baseX, d.y - d.baseY);
        const boost = Math.min(offset / 18, 1);
        const alpha = d.alpha + boost * (d.color === 'lime' ? 0.4 : 0.5);
        const template = d.color === 'lime' ? LIME : WHITE;
        ctx.fillStyle = template.replace('ALPHA', alpha.toFixed(3));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius + boost * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    if (reduceMotion) {
      // Single static render — no animation loop.
      draw();
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    } else {
      rafRef.current = window.requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
