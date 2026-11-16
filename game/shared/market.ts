import type { Kind, Print, RoundSpec, Role } from './types';

export const round2 = (x: number) => Math.round(x * 100) / 100;
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export const AVATARS = [
  '🐂', '🐻', '🦈', '🐺', '🦅', '🦁', '🐯', '🦊', '🐸', '🐙', '🦄', '🐲', '🦍', '🐳', '🐝', '🦖',
  '🤑', '💎', '🚀', '🎩', '🦩', '🐆', '🦉', '🐧', '🦝', '🐼', '🐹', '🦚', '🐊', '🦬', '🐗', '🦂',
];
export const COLORS = [
  '#19e68c', '#4cc9ff', '#ffc24b', '#ff5ea8', '#b18cff', '#ff8a3d', '#5ef0e0', '#e6ff4d',
  '#ff6b6b', '#7aa2ff', '#ffd6a5', '#9bff7a',
];

const STABLE_CO: [string, string][] = [
  ['TOST', 'Consolidated Toast Corp.'],
  ['ROCK', 'Midwest Gravel Trust'],
  ['KNIT', 'Beige Cardigan Holdings'],
  ['PIRO', "Grandma's Pierogi Inc."],
  ['STPL', 'Big Box of Staples Ltd.'],
  ['DIRT', 'Premium Topsoil Partners'],
];
const HYPE_CO: [string, string][] = [
  ['MOON', 'Moonshot Llama Labs'],
  ['YOLO', 'YOLO Robotics'],
  ['APEZ', 'Ape Pizza Delivery'],
  ['HYPE', 'HypeBeast Drones'],
  ['GLXY', 'Galaxy Brain AI'],
  ['RKET', 'Rocket Emoji Capital'],
];
const STABLE_NEWS_UP = [
  'Overnight buyers went wild — opens hot. Analysts: "this is a boring company."',
  'A rumor of a buyout spikes the open. Fundamentals have not changed.',
  'Fat-finger order at the open! Somebody added a zero.',
];
const STABLE_NEWS_DOWN = [
  'Panic at the open after a CEO sneezed on live TV. Fundamentals unchanged.',
  'A fund dumped shares overnight to make payroll. Opens cold.',
  'Misread earnings headline tanks the open. The earnings were fine.',
];
const HYPE_NEWS_UP = [
  'A celebrity posted 🚀🚀🚀. Pre-market is creeping up. Everyone is watching the chart.',
  'Forum thread "this is going to $1000" hits #1. Small pre-market uptick.',
  'Short sellers rumored to be trapped. The chart is ticking up.',
];
const HYPE_NEWS_DOWN = [
  'An influencer called it "mid". Pre-market is slipping. Everyone is watching the chart.',
  'Rumor: the founder sold a yacht. Small pre-market dip.',
  'A meme about the CEO went viral, and not in a good way. Chart is ticking down.',
];

const NICE = [0.05, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5, 2, 2.5, 3];
function pickSlope(n: number, rng: () => number) {
  const ok = NICE.filter((s) => n / s >= 26 && n / s <= 60);
  return ok.length ? ok[Math.floor(rng() * ok.length)] : round2(n / 40);
}

export function genSpec(opts: {
  index: number;
  phase: 0 | 1;
  kind: Kind;
  nb: number;
  ns: number;
  hype: number;
  sign: 1 | -1;
  rng: () => number;
  used: string[];
}): RoundSpec {
  const { index, phase, kind, hype, sign, rng } = opts;
  const nb = Math.max(1, opts.nb);
  const ns = Math.max(1, opts.ns);
  const pool = (kind === 'stable' ? STABLE_CO : HYPE_CO).filter(([t]) => !opts.used.includes(t));
  const [ticker, company] = (pool.length ? pool : kind === 'stable' ? STABLE_CO : HYPE_CO)[
    Math.floor(rng() * (pool.length || 6))
  ];
  const d1 = pickSlope(nb, rng);
  const s1 = pickSlope(ns, rng);
  const Rb = nb / d1;
  const Rs = ns / s1;
  const target = 30 + Math.floor(rng() * 45);
  const x = Rb * (0.4 + rng() * 0.2);
  let y = (d1 * x) / s1;
  y = clamp(y, Rs * 0.2, Rs * 0.8);
  const bHi = Math.round(target + x);
  const sLo = Math.max(2, Math.round(target - y));
  const bLo = round2(bHi - Rb);
  const sHi = round2(sLo + Rs);
  const d0 = round2(d1 * bHi);
  const s0 = round2(s1 * sLo);
  const pStar = round2((d0 + s0) / (d1 + s1));
  const d2 = kind === 'hype' ? round2(d1 * hype) : 0;
  const s2 = kind === 'hype' ? round2(s1 * hype) : 0;
  const k = kind === 'hype' ? round2((d1 + s1) / (d2 + s2)) : 0;
  let open: number[];
  let headline: string;
  if (kind === 'stable') {
    const o = sign * (12 + Math.round(rng() * 8));
    open = [pStar + o + (rng() < 0.5 ? -1 : 1), pStar + o + (rng() < 0.5 ? -1 : 1), pStar + o].map(round2);
    const list = sign > 0 ? STABLE_NEWS_UP : STABLE_NEWS_DOWN;
    headline = list[Math.floor(rng() * list.length)];
  } else {
    const o = sign * (4 + Math.round(rng() * 2));
    open = [pStar + o / 3, pStar + (2 * o) / 3, pStar + o].map(round2);
    const list = sign > 0 ? HYPE_NEWS_UP : HYPE_NEWS_DOWN;
    headline = list[Math.floor(rng() * list.length)];
  }
  return {
    index, phase, kind, ticker, company, headline, nb, ns,
    bLo, bHi, sLo, sHi, d0, d1, s0, s1, d2, s2, pStar, k, open,
  };
}

export function drawBase(spec: RoundSpec, role: Role, rng: () => number) {
  const lo = Math.ceil(role === 'buyer' ? spec.bLo : spec.sLo);
  const hi = Math.floor(role === 'buyer' ? spec.bHi : spec.sHi);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export const GHOST_T = [-20, -10, 0];
export const MOMENTUM_WINDOW = 30; // seconds
export const MAX_SHIFT = 40;

/** Least-squares slope of recent prints, in $/minute. */
export function rawSlope(prints: Print[], tNow: number): number {
  const past = prints.filter((p) => p.t <= tNow);
  if (past.length < 2) return 0;
  const last = past[past.length - 1];
  if (tNow - last.t > MOMENTUM_WINDOW) return 0;
  let pts = past.filter((p) => p.t >= tNow - MOMENTUM_WINDOW);
  if (pts.length < 3 || pts[pts.length - 1].t - pts[0].t < 6) pts = past.slice(-3);
  const n = pts.length;
  if (n < 2) return 0;
  const mt = pts.reduce((a, p) => a + p.t, 0) / n;
  const mp = pts.reduce((a, p) => a + p.price, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sxy += (p.t - mt) * (p.price - mp);
    sxx += (p.t - mt) ** 2;
  }
  if (sxx < 4) return 0;
  return clamp((sxy / sxx) * 60, -MAX_SHIFT * 2, MAX_SHIFT * 2);
}

export const cardShift = (kind: Kind, beta: number, momentum: number) =>
  kind === 'hype' ? round2(clamp(beta * momentum, -MAX_SHIFT, MAX_SHIFT)) : 0;

export const effective = (base: number, shift: number) => round2(Math.max(1, base + shift));

export const profitFor = (role: Role, limit: number, price: number) =>
  round2(role === 'buyer' ? limit - price : price - limit);

export const flip = (r: Role): Role => (r === 'buyer' ? 'seller' : 'buyer');
export const roleIn = (role0: Role, phase: 0 | 1): Role => (phase === 0 ? role0 : flip(role0));

export const CLOSE_WINDOW = 20; // seconds at end used for the close

export function closePrice(prints: Print[], durationS: number): number {
  const real = prints.filter((p) => !p.ghost);
  const tail = real.filter((p) => p.t >= durationS - CLOSE_WINDOW);
  if (tail.length) return round2(tail.reduce((a, p) => a + p.price, 0) / tail.length);
  const last = prints[prints.length - 1];
  return last ? last.price : 0;
}

export const predictionBonus = (max: number, err: number) => round2(Math.max(0, max * (1 - err / 10)));

export function rankTitle(rank: number, n: number): string {
  if (rank === 1) return 'Wolf of the Floor';
  if (n > 2 && rank === n) return 'Certified Bagholder';
  const q = rank / n;
  if (q <= 0.2) return 'Managing Director';
  if (q <= 0.45) return 'Vice President';
  if (q <= 0.75) return 'Analyst';
  return 'Unpaid Intern';
}
