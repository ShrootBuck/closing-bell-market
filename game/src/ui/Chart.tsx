import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Print } from '../../shared/types';

export interface Curve {
  fn: (t: number) => number;
  color: string;
  dash?: string;
  width?: number;
  from?: number;
  to?: number;
  label?: string;
}

interface Props {
  prints: Print[];
  durationS: number;
  tNow?: number;
  pStar?: number | null;
  pStarLabel?: string;
  curves?: Curve[];
  compact?: boolean;
  live?: boolean;
  className?: string;
  lineColor?: string;
  yExtra?: number[];
}

function niceStep(span: number, target: number) {
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Chart({
  prints, durationS, tNow, pStar, pStarLabel, curves = [], compact, live, className, lineColor = 'var(--up)', yExtra = [],
}: Props) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const uid = useId().replace(/:/g, '');
  const sorted = useMemo(() => [...prints].sort((a, b) => a.t - b.t), [prints]);

  const pad = compact ? { l: 6, r: 44, t: 10, b: 18 } : { l: 10, r: 78, t: 18, b: 30 };
  const x0 = -25;
  const x1 = Math.max(durationS, (tNow ?? 0) + 1);
  const ys = [...sorted.map((p) => p.price), ...(pStar != null ? [pStar] : []), ...yExtra];
  let lo = ys.length ? Math.min(...ys) : 0;
  let hi = ys.length ? Math.max(...ys) : 100;
  const span = Math.max(hi - lo, compact ? 10 : 16);
  const mid = (hi + lo) / 2;
  lo = mid - span * 0.62;
  hi = mid + span * 0.62;
  const iw = Math.max(1, w - pad.l - pad.r);
  const ih = Math.max(1, h - pad.t - pad.b);
  const X = (t: number) => pad.l + ((t - x0) / (x1 - x0)) * iw;
  const Y = (p: number) => pad.t + (1 - (p - lo) / (hi - lo)) * ih;

  const step = niceStep(hi - lo, compact ? 3 : 5);
  const yTicks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push(v);
  const xStep = x1 > 200 ? 60 : 30;
  const xTicks: number[] = [];
  for (let t = 0; t <= x1; t += xStep) xTicks.push(t);

  const pts = sorted.map((p) => [X(p.t), Y(p.price)] as const);
  const end = live && tNow != null && pts.length ? X(Math.max(tNow, sorted[sorted.length - 1].t)) : null;
  let line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  if (end != null && pts.length) line += `L${end.toFixed(1)},${pts[pts.length - 1][1].toFixed(1)}`;
  const lastX = end ?? (pts.length ? pts[pts.length - 1][0] : 0);
  const area = pts.length ? `${line}L${lastX.toFixed(1)},${pad.t + ih}L${pts[0][0].toFixed(1)},${pad.t + ih}Z` : '';
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const dir = last && prev ? Math.sign(last.price - prev.price) : 0;

  const curvePaths = curves.map((c) => {
    const a = c.from ?? -20;
    const b = c.to ?? x1;
    const n = 140;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const t = a + ((b - a) * i) / n;
      const v = c.fn(t);
      if (!Number.isFinite(v)) continue;
      const yy = Math.max(-2000, Math.min(4000, Y(v)));
      d += `${d ? 'L' : 'M'}${X(t).toFixed(1)},${yy.toFixed(1)}`;
    }
    return { ...c, d };
  });

  return (
    <div ref={ref} className={`chart ${compact ? 'chart-compact' : ''} ${className ?? ''}`}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <linearGradient id={`fill${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
            <filter id={`glow${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={compact ? 2 : 4} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id={`clip${uid}`}>
              <rect x={pad.l} y={pad.t} width={iw} height={ih} />
            </clipPath>
          </defs>
          {/* pre-market shading */}
          <rect x={X(x0)} y={pad.t} width={X(0) - X(x0)} height={ih} fill="var(--premarket)" />
          {!compact && (
            <text x={X(-12.5)} y={pad.t + 14} className="axis" textAnchor="middle">
              PRE
            </text>
          )}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + iw} y1={Y(v)} y2={Y(v)} className="grid" />
              <text x={pad.l + iw + 8} y={Y(v) + 4} className="axis">
                ${v % 1 ? v.toFixed(1) : v}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={X(t)} y={h - (compact ? 4 : 8)} className="axis" textAnchor="middle">
              {Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}
            </text>
          ))}
          <line x1={X(0)} x2={X(0)} y1={pad.t} y2={pad.t + ih} className="grid strong" />
          {tNow != null && live && (
            <line x1={X(tNow)} x2={X(tNow)} y1={pad.t} y2={pad.t + ih} className="nowline" />
          )}
          <g clipPath={`url(#clip${uid})`}>
            {pStar != null && (
              <line x1={pad.l} x2={pad.l + iw} y1={Y(pStar)} y2={Y(pStar)} className="pstar" />
            )}
            {curvePaths.map((c, i) => (
              <path key={i} d={c.d} fill="none" stroke={c.color} strokeWidth={c.width ?? 2.5} strokeDasharray={c.dash} opacity={0.95} />
            ))}
            {area && <path d={area} fill={`url(#fill${uid})`} />}
            {line && <path d={line} fill="none" stroke={lineColor} strokeWidth={compact ? 2 : 3} filter={`url(#glow${uid})`} strokeLinejoin="round" />}
            {sorted.map((p, i) => {
              const up = i === 0 || p.price >= sorted[i - 1].price;
              const isLast = i === sorted.length - 1;
              return (
                <g key={p.id}>
                  {p.ghost ? (
                    <circle cx={X(p.t)} cy={Y(p.price)} r={compact ? 2.5 : 4} fill="var(--bg)" stroke="var(--muted)" strokeWidth={1.5} />
                  ) : (
                    <circle cx={X(p.t)} cy={Y(p.price)} r={compact ? 2.2 : 3.6} fill={up ? 'var(--up)' : 'var(--down)'} className="dot-in" />
                  )}
                  {isLast && live && !p.ghost && (
                    <circle key={`ping${p.id}`} cx={X(p.t)} cy={Y(p.price)} r={6} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} className="ping" />
                  )}
                </g>
              );
            })}
          </g>
          {pStar != null && (
            <g transform={`translate(${pad.l + iw - (compact ? 52 : 84)}, ${Math.max(pad.t + 10, Math.min(pad.t + ih - 10, Y(pStar)))})`}>
              <rect x={0} y={-10} width={compact ? 48 : 80} height={20} rx={4} className="chip-pstar" />
              <text x={compact ? 24 : 40} y={4} textAnchor="middle" className="chip-text dark">
                {pStarLabel ?? `p* ${pStar.toFixed(compact ? 0 : 2)}`}
              </text>
            </g>
          )}
          {last && (
            <g transform={`translate(${pad.l + iw + 2}, ${Math.max(pad.t, Math.min(pad.t + ih, Y(last.price)))})`}>
              <rect x={0} y={-11} width={pad.r - 4} height={22} rx={4} fill={dir < 0 ? 'var(--down)' : 'var(--up)'} />
              <text x={(pad.r - 4) / 2} y={5} textAnchor="middle" className="chip-text dark">
                ${last.price.toFixed(compact ? 0 : 2)}
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
