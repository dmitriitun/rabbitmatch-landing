'use client';

export function tap(duration: number = 8): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(duration);
    } catch {
      /* no-op */
    }
  }
}
