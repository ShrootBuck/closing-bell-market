import { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import type { PastRound, PublicPlayer, View } from '../../shared/types';
import { rankTitle } from '../../shared/market';
import { Chart } from '../ui/Chart';
import { Avatar, Money, RichList, Tex } from '../ui/bits';
import { money, num, ranked, signed } from '../util';
import { sfx } from '../sound';
import { roundCurves, verdict } from './Host';

export interface Award {
  emoji: string;
  title: string;
  who: PublicPlayer;
  stat: string;
}

export function awards(players: PublicPlayer[], mode: 'choice' | 'number' = 'number'): Award[] {
  const pool = players;
  if (!pool.length) return [];
  const best = <T,>(f: (p: PublicPlayer) => T, cmp: (a: T, b: T) => boolean, list = pool) =>
    list.reduce((a, b) => (cmp(f(b), f(a)) ? b : a));
  const out: Award[] = [];
  const wolf = ranked(pool)[0];
  out.push({ emoji: '🐺', title: 'Wolf of the Floor', who: wolf, stat: money(wolf.total) });
  const quants = pool.filter((p) => p.predErr.length >= 1);
  if (quants.length && mode === 'choice') {
    const hits = (p: PublicPlayer) => p.predErr.filter((e) => e === 0).length;
    const q = best(hits, (a, b) => a > b, quants);
    if (hits(q) > 0) out.push({ emoji: '🧮', title: 'Best Quant', who: q, stat: `${hits(q)}/${q.predErr.length} calls right` });
  } else if (quants.length) {
    const avg = (p: PublicPlayer) => p.predErr.reduce((a, b) => a + b, 0) / p.predErr.length;
    const q = best(avg, (a, b) => a < b, quants);
    out.push({ emoji: '🧮', title: 'Best Quant', who: q, stat: `avg miss ${money(avg(q))}` });
  }
  const flow = best((p) => p.trades, (a, b) => a > b);
  if (flow.trades) out.push({ emoji: '🌊', title: 'Flow Monster', who: flow, stat: `${flow.trades} trades` });
  const deal = best((p) => p.best, (a, b) => a > b);
  if (deal.best > 0) out.push({ emoji: '💎', title: 'Deal of the Day', who: deal, stat: `${signed(deal.best)} in one trade` });
  const blue = best((p) => p.pp[0], (a, b) => a > b);
  if (blue.pp[0] > 0) out.push({ emoji: '🏦', title: 'Blue-Chip Banker', who: blue, stat: `${money(blue.pp[0])} in half 1` });
  const meme = best((p) => p.pp[1], (a, b) => a > b);
  if (meme.pp[1] > 0) out.push({ emoji: '🚀', title: 'Meme Lord', who: meme, stat: `${money(meme.pp[1])} in half 2` });
  if (pool.length > 2) {
    const bag = ranked(pool)[pool.length - 1];
    out.push({ emoji: '🎒', title: 'Certified Bagholder', who: bag, stat: money(bag.total) });
  }
  return out;
}

export function summarize(history: PastRound[]) {
  const stable = history.filter((h) => h.spec.kind === 'stable' && h.result);
  const hype = history.filter((h) => h.spec.kind === 'hype' && h.result);
  const sOk = stable.filter((h) => verdict(h.spec, h.result)?.ok).length;
  const hOk = hype.filter((h) => verdict(h.spec, h.result)?.ok).length;
  const rates = (list: PastRound[]) => list.map((h) => h.result!.fit?.rate).filter((x): x is number => x != null);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const lambdas = stable
    .map((h) => (h.result!.fit ? -h.result!.fit.rate / (h.spec.d1 + h.spec.s1) : null))
    .filter((x): x is number => x != null);
  return {
    stable, hype, sOk, hOk,
    cMean: mean(rates(stable)),
    kMean: mean(rates(hype)),
    kTheory: hype.length ? hype[0].spec.k : null,
    lambda: mean(lambdas),
  };
}

export function Final({ view }: { view: View }) {
  const step = view.finalStep;
  return (
    <div className="final">
      {step === 0 && <Podium players={view.players} />}
      {step === 1 && <Board players={view.players} mode={view.settings.predictMode} />}
      {step === 2 && <MathVsClass history={view.history} />}
      {step === 3 && <Verdict history={view.history} />}
    </div>
  );
}

function Podium({ players }: { players: PublicPlayer[] }) {
  const top = ranked(players).slice(0, 3);
  useEffect(() => {
    sfx.drumroll(2.6);
    const t1 = setTimeout(() => {
      sfx.fanfare();
      const end = Date.now() + 2500;
      const shoot = () => {
        confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#19e68c', '#ffc24b', '#ffffff'] });
        confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#19e68c', '#ffc24b', '#ffffff'] });
        if (Date.now() < end) setTimeout(shoot, 250);
      };
      shoot();
    }, 3300);
    return () => clearTimeout(t1);
  }, []);
  const order = [1, 0, 2];
  const delays = [2.3, 3.3, 1.3];
  const heights = [62, 82, 46];
  return (
    <div className="podium-wrap">
      <motion.h1 className="final-title" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        THE RICHEST PEOPLE IN THIS ROOM
      </motion.h1>
      <div className="podium">
        {order.map((i) => {
          const p = top[i];
          if (!p) return <div key={i} className="pod-col" />;
          return (
            <div key={p.id} className={`pod-col pod-${i + 1}`}>
              <motion.div className="pod-who" initial={{ opacity: 0, y: 40, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: delays[i], type: 'spring', stiffness: 200, damping: 12 }}>
                {i === 0 && <div className="crown">👑</div>}
                <Avatar p={p} size={i === 0 ? 120 : 90} />
                <div className="pod-name">{p.name}</div>
                <Money value={p.total} className="pod-money" />
                <div className="muted small">{rankTitle(i + 1, players.length)}</div>
              </motion.div>
              <motion.div className="pod-block" initial={{ height: 0 }} animate={{ height: `${heights[i]}%` }} transition={{ delay: delays[i] - 0.6, duration: 0.7, ease: 'backOut' }}>
                <span>{i + 1}</span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Board({ players, mode }: { players: PublicPlayer[]; mode: 'choice' | 'number' }) {
  const aw = awards(players, mode);
  return (
    <div className="board">
      <div className="board-list">
        <div className="side-title">💰 FINAL RICH LIST</div>
        <RichList players={players} limit={16} />
      </div>
      <div className="awards">
        {aw.map((a, i) => (
          <motion.div key={a.title} className="award" initial={{ opacity: 0, y: 30, rotateX: 50 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.15 * i }}>
            <div className="award-emoji">{a.emoji}</div>
            <div>
              <div className="award-title">{a.title}</div>
              <div className="award-who">
                {a.who.avatar} {a.who.name}
              </div>
              <div className="muted small mono">{a.stat}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RoundMini({ h, i }: { h: PastRound; i: number }) {
  const v = verdict(h.spec, h.result);
  const r = h.result!;
  const durS = h.durationMs / 1000;
  return (
    <motion.div className={`mini ${h.spec.kind}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 * i }}>
      <div className="mini-head">
        <b>${h.spec.ticker}</b>
        <span className={`mini-v ${v?.ok ? 'ok' : 'twist'}`}>{v?.label}</span>
      </div>
      <Chart prints={h.prints} durationS={durS} pStar={h.spec.pStar} curves={roundCurves(h.spec, r, durS)} compact />
      <div className="mini-foot mono small">
        {r.fit ? (
          <>
            {h.spec.kind === 'stable' ? 'c' : 'k̂'} = {num(r.fit.rate)}/min
            {h.spec.kind === 'hype' && <span className="muted"> (theory {num(h.spec.k)})</span>}
          </>
        ) : (
          <span className="muted">not enough trades to fit</span>
        )}
        <span className="muted"> · gap {signed(r.gap0, 0)} → {signed(h.spec.kind === 'hype' ? r.peak?.gap ?? r.gapEnd : r.gapEnd, 0)}</span>
      </div>
    </motion.div>
  );
}

function MathVsClass({ history }: { history: PastRound[] }) {
  const s = summarize(history);
  return (
    <div className="mvc">
      <h1 className="final-title small-t">THE MATH vs. YOUR CLASS</h1>
      <div className="mvc-row">
        <div className="mvc-label">
          <div className="phase-badge stable">HALF 1 · BLUE CHIP</div>
          <Tex block tex="p' = -\lambda(d_1+s_1)(p-p^*)" />
          <div className="muted small">Theory: <Tex tex="c<0" />, so the gap shrinks like <Tex tex="e^{ct}" /></div>
          {s.lambda != null && (
            <div className="mvc-stat">
              your class's λ̂ ≈ <b className="mono">{num(s.lambda, 3)}</b>
            </div>
          )}
        </div>
        <div className="mvc-charts">{s.stable.map((h, i) => <RoundMini key={i} h={h} i={i} />)}</div>
      </div>
      <div className="mvc-row">
        <div className="mvc-label">
          <div className="phase-badge hype">HALF 2 · MEME MODE</div>
          <Tex block tex="p' = k(p-p^*),\ k=\frac{d_1+s_1}{d_2+s_2}" />
          <div className="muted small">Theory: <Tex tex="k>0" />, so the gap grows like <Tex tex="e^{kt}" /></div>
          {s.kMean != null && (
            <div className="mvc-stat">
              avg k̂ = <b className="mono">{num(s.kMean)}</b> vs k = <b className="mono">{num(s.kTheory ?? 0)}</b>
            </div>
          )}
        </div>
        <div className="mvc-charts">{s.hype.map((h, i) => <RoundMini key={i} h={h} i={i + 3} />)}</div>
      </div>
      <div className="mvc-legend muted small">
        <span className="lg pstar-lg">fair price <Tex tex="p^*" /></span> <span className="lg fit-lg">curve fit to your trades</span> <span className="lg theory-lg">theory <Tex tex="p^* + (p_0 - p^*)e^{kt}" /></span>
      </div>
    </div>
  );
}

function Verdict({ history }: { history: PastRound[] }) {
  const s = summarize(history);
  useEffect(() => {
    sfx.fanfare();
  }, []);
  return (
    <div className="verdict">
      <h1 className="final-title">SAME p*. OPPOSITE SIGN. OPPOSITE WORLDS.</h1>
      <div className="verdict-grid">
        <motion.div className="vcard stable" initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="phase-badge stable">PRICE ADJUSTMENT</div>
          <Tex block tex="p(t) = p^* + (p_0 - p^*)e^{ct},\ c<0" />
          <div className="vbig">
            {s.sOk}/{s.stable.length}
          </div>
          <div>rounds where the gap shrank</div>
          {s.cMean != null && (
            <div className="muted mono">
              avg fitted c = {num(s.cMean)}/min {s.cMean < 0 ? '✓ negative' : '✗ hmm'}
            </div>
          )}
          <div className="vtag">GLOBALLY STABLE 🏔️→⚪</div>
        </motion.div>
        <motion.div className="vcard hype" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="phase-badge hype">MARKET CLEARING + EXPECTATIONS</div>
          <Tex block tex="p(t) = p^* + (p_0 - p^*)e^{kt},\ k>0" />
          <div className="vbig">
            {s.hOk}/{s.hype.length}
          </div>
          <div>rounds where the gap blew up</div>
          {s.kMean != null && (
            <div className="muted mono">
              avg fitted k̂ = {num(s.kMean)}/min {s.kMean > 0 ? '✓ positive' : '✗ hmm'}
            </div>
          )}
          <div className="vtag">UNSTABLE ⚪⛰️💨</div>
        </motion.div>
      </div>
      <motion.p className="verdict-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        Knowing where the curves cross isn't enough. The <b>sign of the coefficient on (p − p*)</b> decides whether a shock fades or grows.
      </motion.p>
    </div>
  );
}
