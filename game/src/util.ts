import { useEffect, useRef, useState } from 'react';
import type { PublicPlayer, View } from '../shared/types';

export const money = (x: number, digits = 2) =>
  `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export const signed = (x: number, digits = 2) => `${x >= 0 ? '+' : '−'}$${Math.abs(x).toFixed(digits)}`;
export const num = (x: number, d = 2) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(d).replace(/\.?0+$/, ''));
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Re-render on every animation frame (or at a capped fps) while `on`. */
export function useFrame(on = true, fps = 30) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last >= 1000 / fps) {
        last = t;
        set((x) => x + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on, fps]);
}

/** Live trading-clock ms derived from the last snapshot and the server clock offset. */
export function liveClock(view: View | null, serverNow: () => number) {
  const r = view?.round;
  if (!r) return 0;
  const ms = r.running ? r.clockMs + (serverNow() - view!.now) : r.clockMs;
  return Math.min(ms, r.durationMs);
}

/** Smoothly animate a number toward its target. */
export function useTween(target: number, ms = 600) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const cur = useRef(target);
  useEffect(() => {
    from.current = cur.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      cur.current = from.current + (target - from.current) * e;
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export const ranked = (players: PublicPlayer[]) =>
  [...players].sort((a, b) => b.total - a.total || b.trades - a.trades || a.name.localeCompare(b.name));

export function usePrevious<T>(v: T) {
  const r = useRef<T | undefined>(undefined);
  useEffect(() => {
    r.current = v;
  });
  return r.current;
}

export const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};
