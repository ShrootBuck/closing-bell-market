import type { Fit, Print } from './types';

interface Pt {
  t: number; // minutes
  p: number;
}

const toPts = (prints: Print[]): Pt[] => prints.map((x) => ({ t: x.t / 60, p: x.price }));

function sst(pts: Pt[]) {
  const m = pts.reduce((a, q) => a + q.p, 0) / pts.length;
  return pts.reduce((a, q) => a + (q.p - m) ** 2, 0);
}

/** Fit p(t) = P + A e^{rt} with P fixed (the theoretical equilibrium). */
export function fitAnchored(prints: Print[], P: number): Fit | null {
  const pts = toPts(prints);
  if (pts.length < 4) return null;
  const evalRate = (r: number) => {
    let sxy = 0;
    let sxx = 0;
    for (const q of pts) {
      const x = Math.exp(r * q.t);
      sxy += x * (q.p - P);
      sxx += x * x;
    }
    const A = sxx > 0 ? sxy / sxx : 0;
    let sse = 0;
    for (const q of pts) sse += (q.p - P - A * Math.exp(r * q.t)) ** 2;
    return { A, sse };
  };
  return search(pts, evalRate, (r, A) => ({ rate: r, A, P }));
}

/** Fit p(t) = P + A e^{rt} with P free (where the class thinks equilibrium is). */
export function fitFree(prints: Print[]): Fit | null {
  const pts = toPts(prints);
  if (pts.length < 5) return null;
  let bestP = 0;
  const evalRate = (r: number) => {
    const xs = pts.map((q) => Math.exp(r * q.t));
    const n = pts.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = pts.reduce((a, q) => a + q.p, 0) / n;
    let sxy = 0;
    let sxx = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (pts[i].p - my);
      sxx += (xs[i] - mx) ** 2;
    }
    if (sxx < 1e-9) return { A: 0, sse: Infinity };
    const A = sxy / sxx;
    const P = my - A * mx;
    let sse = 0;
    for (let i = 0; i < n; i++) sse += (pts[i].p - P - A * xs[i]) ** 2;
    bestP = P;
    return { A, sse, P };
  };
  return search(pts, evalRate, (r, A, P) => ({ rate: r, A, P: P ?? bestP }), -8, -0.05);
}

function search(
  pts: Pt[],
  f: (r: number) => { A: number; sse: number; P?: number },
  make: (r: number, A: number, P?: number) => Omit<Fit, 'r2' | 'n'>,
  lo = -8,
  hi = 12,
): Fit | null {
  let best = { r: 0, sse: Infinity, A: 0, P: undefined as number | undefined };
  for (let r = lo; r <= hi + 1e-9; r += 0.02) {
    const res = f(r);
    if (res.sse < best.sse) best = { r, sse: res.sse, A: res.A, P: res.P };
  }
  // golden-section refine
  let a = best.r - 0.02;
  let b = best.r + 0.02;
  for (let i = 0; i < 30; i++) {
    const m1 = a + (b - a) * 0.382;
    const m2 = a + (b - a) * 0.618;
    if (f(m1).sse < f(m2).sse) b = m2;
    else a = m1;
  }
  const r = (a + b) / 2;
  const res = f(r);
  const fin = res.sse <= best.sse ? { r, ...res } : { ...best };
  const tot = sst(pts);
  const r2 = tot > 0 ? Math.max(0, 1 - fin.sse / tot) : 0;
  return { ...make(fin.r, fin.A, fin.P), r2, n: pts.length };
}

export const curve = (P: number, A: number, rate: number) => (tSec: number) => P + A * Math.exp((rate * tSec) / 60);

/**
 * The first runaway leg of a hype round: from the open until the first big excursion
 * from p* peaks, stopping when the price snaps back through p* (the bubble bursts).
 */
export function runawayLeg(prints: Print[], pStar: number) {
  const empty = { leg: prints, peak: null as null | { gap: number; t: number }, burst: null as null | number };
  if (prints.length < 2) return empty;
  const gaps = prints.map((p) => p.price - pStar);
  const gap0 = Math.abs(gaps[Math.min(2, gaps.length - 1)]);
  let j = gaps.findIndex((g, i) => prints[i].t > 0 && Math.abs(g) >= Math.max(3 * gap0, 12));
  if (j < 0) {
    j = 0;
    for (let i = 1; i < gaps.length; i++) if (Math.abs(gaps[i]) > Math.abs(gaps[j])) j = i;
  }
  const s = Math.sign(gaps[j]) || 1;
  let peak = j;
  let burst: number | null = null;
  for (let i = j; i < gaps.length; i++) {
    const g = gaps[i] * s;
    if (g < -3) {
      burst = prints[i].t;
      break;
    }
    if (g > gaps[peak] * s) peak = i;
  }
  return { leg: prints.slice(0, peak + 1), peak: { gap: gaps[peak], t: prints[peak].t }, burst };
}
