import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { hostKey, store, useRoom } from '../net';
import type { Fx, Print, PublicPlayer, RoundSpec, View } from '../../shared/types';
import { curve } from '../../shared/fit';
import { Chart, type Curve } from '../ui/Chart';
import { Avatar, Logo, MuteButton, QR, RichList, Ring, RoleTag, Stamp, StatusPill, Tape, Tex, tradeTapeItems } from '../ui/bits';
import { liveClock, mmss, money, num, signed, useFrame, vibrate } from '../util';
import { sfx, unlockAudio } from '../sound';
import { Final } from './Final';

export const joinHost = () => location.host.replace(/^www\./, '');

export function equations(spec: RoundSpec) {
  const hype = spec.kind === 'hype';
  return {
    qd: `q_d = ${num(spec.d0)} - ${num(spec.d1)}\\,p${hype ? ` + ${num(spec.d2)}\\,p'` : ''}`,
    qs: `q_s = -${num(spec.s0)} + ${num(spec.s1)}\\,p${hype ? ` - ${num(spec.s2)}\\,p'` : ''}`,
  };
}

export function verdict(spec: RoundSpec, r: NonNullable<View['round']>['result']) {
  if (!r) return null;
  if (spec.kind === 'stable') {
    const shrank = Math.abs(r.gapEnd) < Math.abs(r.gap0) * 0.6;
    return { ok: shrank, label: shrank ? 'STABLE ✓' : 'PLOT TWIST' };
  }
  const peak = Math.abs(r.peak?.gap ?? r.gapEnd);
  const grew = peak > Math.abs(r.gap0) * 1.8;
  return { ok: grew, label: grew ? (r.burst != null ? 'BUBBLE 🫧💥' : 'UNSTABLE 🔥') : 'HELD THE LINE?!' };
}

export function roundCurves(spec: RoundSpec, r: NonNullable<View['round']>['result'], durationS: number, theory = true): Curve[] {
  const out: Curve[] = [];
  if (!r) return out;
  const gap0 = spec.open[spec.open.length - 1] - spec.pStar;
  if (spec.kind === 'hype' && theory) {
    out.push({ fn: curve(spec.pStar, gap0, spec.k), color: 'var(--amber)', dash: '6 6', width: 2, from: 0, to: durationS, label: 'theory' });
  }
  if (r.fit) {
    const to = spec.kind === 'hype' && r.peak ? Math.max(5, r.peak.t) : durationS;
    out.push({ fn: curve(r.fit.P, r.fit.A, r.fit.rate), color: 'var(--cyan)', width: 3, from: -20, to, label: 'class fit' });
  }
  return out;
}

export default function Host({ code, viewer }: { code: string; viewer?: boolean }) {
  const [tokenReady] = useState(() => {
    const m = location.hash.match(/k=([\w-]+)/);
    if (m) {
      store.set(hostKey(code), m[1]);
      history.replaceState(null, '', location.pathname);
    }
    return true;
  });
  const hasToken = !!store.get(hostKey(code));
  const asViewer = viewer || !hasToken;
  const room = useRoom(code, asViewer ? 'viewer' : 'host', asViewer ? null : hostKey(code));
  const { view, status, error } = room;
  const narrow = useNarrow();

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (!tokenReady) return null;
  if (error) {
    return (
      <div className="center-screen">
        <Logo />
        <h2>{error.code === 'no-room' ? 'Floor not found' : 'Hmm.'}</h2>
        <p className="muted">{error.message}</p>
        <a className="btn" href="/">Back to the lobby</a>
      </div>
    );
  }
  if (!view) {
    return (
      <div className="center-screen">
        <Logo />
        <div className="spinner big" />
        <StatusPill status={status} />
      </div>
    );
  }
  if (narrow && !asViewer) return <HostRemote room={room} view={view} />;
  return <Projector room={room} view={view} isHost={!asViewer} />;
}

function useNarrow() {
  const [n, setN] = useState(() => window.innerWidth < 760);
  useEffect(() => {
    const f = () => setN(window.innerWidth < 760);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return n;
}

type Room = ReturnType<typeof useRoom>;

// ---------------- projector ----------------

function Projector({ room, view, isHost }: { room: Room; view: View; isHost: boolean }) {
  const [flash, setFlash] = useState<null | 'open' | 'close'>(null);
  const [toasts, setToasts] = useState<{ id: string; print: Print }[]>([]);

  useEffect(
    () =>
      room.onFx((fx: Fx) => {
        if (fx.kind === 'bell') {
          sfx.bell();
          setFlash('open');
          setTimeout(() => setFlash(null), 2200);
        } else if (fx.kind === 'close') {
          sfx.bell();
          setTimeout(() => sfx.horn(), 300);
          setFlash('close');
          setTimeout(() => setFlash(null), 2600);
        } else if (fx.kind === 'trade') {
          sfx.cash();
          setToasts((t) => [...t.slice(-4), { id: fx.print.id, print: fx.print }]);
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== fx.print.id)), 4200);
        } else if (fx.kind === 'join') {
          sfx.pop();
        } else if (fx.kind === 'stage') {
          sfx.whoosh();
        }
      }),
    [room],
  );

  const stage = view.stage;
  return (
    <div className={`projector stage-${stage} ${isHost ? 'has-dock' : ''}`}>
      <div className="bg-grid" />
      <TopBar view={view} />
      <main className="proj-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage + view.roundIndex + (view.practice ? 'p' : '')}
            className="stage-wrap"
            initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -24, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {stage === 'lobby' && <Lobby room={room} view={view} isHost={isHost} />}
            {stage === 'howto' && <HowTo view={view} />}
            {stage === 'briefing' && <Briefing view={view} />}
            {stage === 'trading' && <Trading room={room} view={view} toasts={toasts} />}
            {stage === 'recap' && (view.practice ? <PracticeRecap view={view} /> : <Recap view={view} />)}
            {stage === 'swap' && <Swap view={view} />}
            {stage === 'final' && <Final view={view} />}
          </motion.div>
        </AnimatePresence>
      </main>
      {stage === 'trading' && view.round && (
        <Tape items={tradeTapeItems(view.round.prints, view.players, view.round.spec.ticker)} />
      )}
      {isHost && <Dock room={room} view={view} />}
      <AnimatePresence>
        {flash && (
          <motion.div className={`flash flash-${flash}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.4, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
              <div className="flash-bell">🔔</div>
              <div className="flash-text">{flash === 'open' ? 'MARKET OPEN' : 'CLOSING BELL'}</div>
              <div className="flash-sub">{flash === 'open' ? 'GO GO GO — FIND A COUNTERPARTY' : 'Pencils down. Phones down. Hands up.'}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <StatusPill status={room.status} />
    </div>
  );
}

function TopBar({ view }: { view: View }) {
  const r = view.round;
  const spec = r?.spec;
  return (
    <header className="topbar">
      <Logo small />
      {spec && (
        <div className="tb-round">
          {view.practice ? (
            <span className="phase-badge practice">PRACTICE · DOESN'T COUNT</span>
          ) : (
            <>
              <span className={`phase-badge ${spec.kind}`}>{spec.kind === 'stable' ? 'BLUE CHIP' : 'MEME MODE'}</span>
              <span className="tb-r mono">
                ROUND {view.roundIndex + 1}/{view.totalRounds}
              </span>
            </>
          )}
          <span className="tb-ticker">${spec.ticker}</span>
          <span className="muted tb-co">{spec.company}</span>
        </div>
      )}
      {view.stage === 'swap' && (
        <div className="tb-round">
          <span className="phase-badge hype">HALFTIME</span>
        </div>
      )}
      <div className="tb-right">
        {view.stage !== 'lobby' && (
          <div className="tb-join">
            join <b>{joinHost()}</b> · PIN <b className="mono">{view.code}</b>
          </div>
        )}
        <span className="tb-count mono">👥 {view.players.length}</span>
        <MuteButton />
      </div>
    </header>
  );
}

// ---------------- lobby ----------------

function Lobby({ room, view, isHost }: { room: Room; view: View; isHost: boolean }) {
  const url = `${location.origin}/play/${view.code}`;
  const humans = view.players.filter((p) => !p.bot);
  const bots = view.players.length - humans.length;
  return (
    <div className="lobby">
      <section className="lobby-join">
        <div className="join-steps">
          <div className="join-line">
            <span className="muted">Go to</span> <b className="join-url">{joinHost()}</b>
          </div>
          <div className="join-line">
            <span className="muted">Game PIN</span>
          </div>
          <div className="pin mono">
            {view.code.split('').map((c, i) => (
              <motion.span key={i} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i, type: 'spring' }}>
                {c}
              </motion.span>
            ))}
          </div>
        </div>
        <QR text={url} className="lobby-qr" />
      </section>
      <section className="lobby-floor">
        <div className="lobby-head">
          <h2>
            The floor <span className="muted mono">{humans.length} trader{humans.length === 1 ? '' : 's'}{bots ? ` + ${bots} bots` : ''}</span>
          </h2>
          <div className="howto">
            <span>① Get a card: your secret limit</span>
            <span>② Find a buyer/seller IRL &amp; haggle</span>
            <span>③ Report the deal → profit</span>
          </div>
        </div>
        <div className="chips">
          <AnimatePresence>
            {view.players.map((p) => (
              <motion.button
                key={p.id}
                layout
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className={`chip ${isHost ? 'kickable' : ''}`}
                style={{ borderColor: p.color }}
                onClick={() => isHost && confirm(`Kick ${p.name}?`) && room.send({ t: 'host', action: 'kick', id: p.id }).catch(alert)}
                title={isHost ? 'Click to kick' : undefined}
              >
                <span className="chip-av">{p.avatar}</span>
                {p.name}
                {!p.online && <span className="offline-dot" />}
              </motion.button>
            ))}
          </AnimatePresence>
          {!view.players.length && <div className="waiting">Waiting for the first trader… scan the code 📱</div>}
        </div>
        {isHost && <Settings room={room} view={view} />}
      </section>
    </div>
  );
}

function Settings({ room, view }: { room: Room; view: View }) {
  const s = view.settings;
  const set = (patch: Partial<View['settings']>) => room.send({ t: 'host', action: 'settings', settings: patch }).catch((e) => alert(e.message));
  const bots = view.players.filter((p) => p.bot).length;
  const Opt = <K extends keyof View['settings']>({ k, label, opts, fmt }: { k: K; label: string; opts: number[]; fmt: (n: number) => string }) => (
    <div className="setting">
      <span className="muted">{label}</span>
      <div className="seg">
        {opts.map((o) => (
          <button key={o} className={s[k] === o ? 'on' : ''} onClick={() => set({ [k]: o } as Partial<View['settings']>)}>
            {fmt(o)}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="settings">
      <Opt k="roundsPerPhase" label="Rounds per half" opts={[1, 2, 3, 4]} fmt={(n) => `${n}`} />
      <Opt k="roundSeconds" label="Round length" opts={[60, 90, 120, 180]} fmt={(n) => mmss(n * 1000)} />
      <Opt k="cardSeconds" label="Card life" opts={[20, 30, 45]} fmt={(n) => `${n}s`} />
      <Opt k="hype" label="Hype β (min)" opts={[0.5, 1, 2]} fmt={(n) => `${n}`} />
      <div className="setting">
        <span className="muted">Practice round</span>
        <div className="seg">
          {[true, false].map((v) => (
            <button key={String(v)} className={s.practice === v ? 'on' : ''} onClick={() => set({ practice: v })}>
              {v ? 'On' : 'Off'}
            </button>
          ))}
        </div>
      </div>
      <div className="setting">
        <span className="muted">Predictions</span>
        <div className="seg">
          {(['choice', 'number'] as const).map((v) => (
            <button key={v} className={s.predictMode === v ? 'on' : ''} onClick={() => set({ predictMode: v })}>
              {v === 'choice' ? 'Shrink/grow' : 'Guess price'}
            </button>
          ))}
        </div>
      </div>
      <div className="setting">
        <span className="muted">Practice bots</span>
        <div className="seg">
          {[0, 2, 6, 12].map((n) => (
            <button key={n} className={bots === n ? 'on' : ''} onClick={() => room.send({ t: 'host', action: 'bots', count: n }).catch((e) => alert(e.message))}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- how to play ----------------

export const HOWTO = [
  { emoji: '🃏', title: 'Check your card', body: 'Buyers: never pay MORE than your number. Sellers: never sell for LESS than your number.' },
  { emoji: '🗣️', title: 'Find someone & haggle', body: 'Buyers find sellers. In person, out loud. Agree on a price.' },
  { emoji: '🤝', title: 'Tap “I made a deal”', body: 'One of you picks the other + types the price. They tap confirm. Ka-ching.' },
];

function HowTo({ view }: { view: View }) {
  return (
    <div className="howto-stage">
      <motion.h1 className="howto-title" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        HOW TO PLAY
      </motion.h1>
      <div className="howto-steps">
        {HOWTO.map((h, i) => (
          <motion.div
            key={h.title}
            className="howto-step"
            initial={{ y: 60, opacity: 0, rotate: -3 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.4 + i * 0.5, type: 'spring', stiffness: 160, damping: 14 }}
          >
            <div className="howto-num">{i + 1}</div>
            <div className="howto-emoji">{h.emoji}</div>
            <h3>{h.title}</h3>
            <p>{h.body}</p>
          </motion.div>
        ))}
      </div>
      <motion.div className="howto-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
        <div className="howto-money">
          💰 Profit = the gap between the price and your card. <b>Most money wins.</b>
        </div>
        <div className="muted">
          You get a new card after every deal, so keep going. Half the room are{' '}
          <RoleTag role="buyer" /> and half are <RoleTag role="seller" />. At halftime you swap.
          {view.settings.practice && <> First up: a <b className="up">45-second practice round</b> that doesn't count.</>}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------- briefing ----------------

function Briefing({ view }: { view: View }) {
  const r = view.round!;
  const spec = r.spec;
  const eq = equations(spec);
  const hype = spec.kind === 'hype';
  const choice = view.settings.predictMode === 'choice';
  const humans = view.players.filter((p) => !p.bot);
  const locked = humans.filter((p) => p.predicted);
  const open = spec.open[spec.open.length - 1];
  const gap = open - spec.pStar;
  return (
    <div className="briefing">
      <div className="brief-left">
        <motion.div className="newsflash" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <span className="breaking">BREAKING</span>
          <span>{spec.headline}</span>
        </motion.div>
        <div className="brief-co">
          <div className="big-ticker">${spec.ticker}</div>
          <div className="muted">{spec.company}</div>
        </div>
        {choice && (
          <div className="priceboard">
            <div>
              <div className="muted small">FAIR PRICE (supply = demand)</div>
              <div className="mono pb-val amber">{money(spec.pStar)}</div>
            </div>
            <div className="pb-arrow">vs</div>
            <div>
              <div className="muted small">OPENS AT</div>
              <div className={`mono pb-val ${gap >= 0 ? 'up' : 'down'}`}>{money(open)}</div>
            </div>
            <div className="pb-gap">
              <div className="muted small">GAP</div>
              <div className="mono pb-val">{signed(gap)}</div>
            </div>
          </div>
        )}
        {hype && (
          <div className="meme-note">
            🚀 <b>Meme mode:</b> everyone's card follows the chart. Price going up → every number goes up.
          </div>
        )}
        <div className={`eq-card ${choice ? 'eq-small' : ''}`}>
          <div className="eq-title">{choice ? 'The math behind it 🤓' : "Today's market"} {hype && <span className="phase-badge hype">cards move with p′</span>}</div>
          <Tex block tex={eq.qd} />
          <Tex block tex={eq.qs} />
          <div className="eq-hint muted">
            {hype ? (
              <>
                Market clears when <Tex tex="q_d = q_s" /> ⇒ <Tex tex="p' = k(p - p^*)" />, <Tex tex={`k = \\frac{d_1+s_1}{d_2+s_2} = ${num(spec.k)}`} />/min
              </>
            ) : (
              <>
                Price adjusts with excess demand: <Tex tex="p' = \lambda(q_d - q_s)" />. Where does it settle?
              </>
            )}
          </div>
        </div>
        {!choice && (
          <div className="premarket">
            <span className="muted">PRE-MARKET PRINTS</span>
            {spec.open.map((p, i) => (
              <motion.span key={i} className="mono pm-print" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.35 }}>
                {money(p)}
                {i < spec.open.length - 1 && <span className="muted"> → </span>}
              </motion.span>
            ))}
            {hype && <span className="pm-trend">{spec.open[2] > spec.open[0] ? '↗ trending up' : '↘ trending down'}</span>}
          </div>
        )}
      </div>
      <div className="brief-right">
        <div className="predict-card">
          {choice ? (
            <>
              <div className="predict-q">🔮 MAKE THE CALL</div>
              <div className="predict-ask">
                By the closing bell, the {money(Math.abs(gap), 0)} gap will…
              </div>
              <div className="call-opts">
                <div className="call-opt shrink">🎯 SHRINK<span>price drifts back to fair</span></div>
                <div className="call-opt grow">🚀 GROW<span>price runs further away</span></div>
              </div>
              <div className="muted">Right call = {money(view.settings.predictBonus, 0)} on the Rich List. Vote on your phone.</div>
            </>
          ) : (
            <>
              <div className="predict-q">🔮 PREDICT THE CLOSE</div>
              <div className="muted">Average price over the last 20 seconds. Within $10 earns up to {money(view.settings.predictBonus, 0)} on the Rich List.</div>
            </>
          )}
          <div className="predict-count">
            <span className="mono big-num">{locked.length}</span>
            <span className="muted">/ {humans.length} locked in</span>
          </div>
          <div className="predict-avs">
            {humans.map((p) => (
              <motion.span key={p.id} animate={{ opacity: p.predicted ? 1 : 0.18, scale: p.predicted ? 1 : 0.85 }} title={p.name}>
                <Avatar p={p} size={34} />
              </motion.span>
            ))}
          </div>
        </div>
        <div className="role-split">
          <div>
            <RoleTag role="buyer" /> <span className="mono">{view.players.filter((p) => p.role === 'buyer').length}</span>
            <div className="muted small">pay less than your card</div>
          </div>
          <div>
            <RoleTag role="seller" /> <span className="mono">{view.players.filter((p) => p.role === 'seller').length}</span>
            <div className="muted small">sell for more than your card</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- trading ----------------

function Trading({ room, view, toasts }: { room: Room; view: View; toasts: { id: string; print: Print }[] }) {
  useFrame(true, 20);
  const r = view.round!;
  const spec = r.spec;
  const clock = liveClock(view, room.serverNow);
  const left = r.durationMs - clock;
  const hype = spec.kind === 'hype';
  const real = r.prints.filter((p) => !p.ghost);
  const last = r.prints[r.prints.length - 1];
  const open = spec.open[spec.open.length - 1];
  const chg = last ? last.price - open : 0;
  const vwap = real.length ? real.reduce((a, p) => a + p.price, 0) / real.length : null;
  const lastSec = useRef(-1);
  const sec = Math.ceil(left / 1000);
  useEffect(() => {
    if (r.running && sec <= 10 && sec > 0 && sec !== lastSec.current) {
      lastSec.current = sec;
      sec <= 3 ? sfx.tock() : sfx.tick();
    }
  }, [sec, r.running]);
  const byId = useMemo(() => new Map(view.players.map((p) => [p.id, p])), [view.players]);

  return (
    <div className="trading">
      <div className="trade-main">
        <div className="quote-bar">
          <div className="quote">
            <div className="muted small">LAST</div>
            <motion.div key={last?.id} className={`quote-px mono ${chg >= 0 ? 'up' : 'down'}`} initial={{ scale: 1.15 }} animate={{ scale: 1 }}>
              {last ? money(last.price) : '—'}
            </motion.div>
            <div className={`mono small ${chg >= 0 ? 'up' : 'down'}`}>
              {chg >= 0 ? '▲' : '▼'} {signed(chg)} ({((chg / open) * 100).toFixed(1)}%) vs open
            </div>
          </div>
          <Stat label="TRADES" value={String(real.length)} />
          <Stat label="AVG PRICE" value={vwap != null ? money(vwap) : '—'} />
          {hype ? (
            <div className={`momentum ${r.shift >= 0 ? 'up' : 'down'}`}>
              <div className="muted small">MOMENTUM p′</div>
              <div className="mono mom-val">
                {r.momentum >= 0 ? '+' : '−'}${Math.abs(r.momentum).toFixed(1)}/min
              </div>
              <MomentumBar shift={r.shift} />
              <div className="small">
                every card <b className="mono">{signed(r.shift)}</b>
              </div>
            </div>
          ) : view.settings.predictMode === 'choice' || view.practice ? (
            <Stat label="FAIR PRICE p*" value={money(spec.pStar)} sub="where supply = demand" />
          ) : (
            <Stat label="EQUILIBRIUM p*" value="???" sub="revealed at the bell" />
          )}
          <div className={`timer ${left < 10500 ? 'hot' : ''} ${!r.running ? 'paused' : ''}`}>
            <Ring frac={left / r.durationMs} size={92} stroke={7} color={left < 10500 ? 'var(--down)' : 'var(--up)'}>
              <span className="mono timer-txt">{r.running ? mmss(left) : '⏸'}</span>
            </Ring>
          </div>
        </div>
        <div className="chart-wrap">
          <Chart prints={r.prints} durationS={r.durationMs / 1000} tNow={clock / 1000} pStar={hype || view.practice || view.settings.predictMode === 'choice' ? spec.pStar : null} live />
          {view.practice && (
            <div className="practice-banner">
              🧪 PRACTICE ROUND · doesn't count · everyone make <b>one deal</b>
            </div>
          )}
          <div className="toasts">
            <AnimatePresence>
              {toasts.map(({ id, print }) => {
                const b = byId.get(print.buyer ?? '');
                const s = byId.get(print.seller ?? '');
                const big = Math.max(print.bp ?? 0, print.sp ?? 0);
                const who = (print.bp ?? 0) >= (print.sp ?? 0) ? b : s;
                return (
                  <motion.div
                    key={id}
                    className={`toast ${big >= 15 ? 'fire' : ''}`}
                    initial={{ x: 80, opacity: 0, scale: 0.8 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: 80, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                  >
                    <div>
                      <b>{s?.avatar} {s?.name}</b> <span className="muted">sold to</span> <b>{b?.avatar} {b?.name}</b>
                    </div>
                    <div className="mono toast-px">{money(print.price)}</div>
                    {big >= 15 && who && (
                      <div className="toast-fire">
                        🔥 {who.name} banked {signed(big)}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {!r.running && <div className="halted">⏸ TRADING HALTED</div>}
        </div>
      </div>
      <aside className="trade-side">
        <div className="side-title">
          💰 RICH LIST <span className="muted small">{view.practice ? 'practice $ shown in green' : 'all rounds'}</span>
        </div>
        <RichList players={view.players} limit={12} showRound />
      </aside>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="muted small">{label}</div>
      <div className="mono stat-val">{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

function MomentumBar({ shift }: { shift: number }) {
  const f = Math.max(-1, Math.min(1, shift / 40));
  return (
    <div className="mombar">
      <div className="mombar-mid" />
      <motion.div
        className={`mombar-fill ${f >= 0 ? 'up' : 'down'}`}
        animate={{ width: `${Math.abs(f) * 50}%`, left: f >= 0 ? '50%' : `${50 - Math.abs(f) * 50}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

// ---------------- recap ----------------

function Recap({ view }: { view: View }) {
  const r = view.round!;
  const spec = r.spec;
  const res = r.result;
  const v = verdict(spec, res);
  const byId = new Map(view.players.map((p) => [p.id, p]));
  useEffect(() => {
    const t = setTimeout(() => {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.3 }, colors: ['#19e68c', '#ffc24b', '#4cc9ff'] });
    }, 700);
    return () => clearTimeout(t);
  }, []);
  if (!res) return null;
  const hype = spec.kind === 'hype';
  const durS = r.durationMs / 1000;
  const peak = res.peak ? Math.abs(res.peak.gap) : Math.abs(res.gapEnd);
  return (
    <div className="recap">
      <div className="recap-chart">
        <div className="recap-chart-head">
          <h2>
            ${spec.ticker} <span className="muted">· round {view.roundIndex + 1}</span>
          </h2>
          <div className="legend">
            <span className="lg pstar-lg">p* = {money(spec.pStar)}</span>
            {res.fit && <span className="lg fit-lg">class fit</span>}
            {hype && <span className="lg theory-lg">theory e^{'{kt}'}</span>}
          </div>
        </div>
        <Chart prints={r.prints} durationS={durS} pStar={spec.pStar} curves={roundCurves(spec, res, durS)} />
        {v && <Stamp kind={spec.kind}>{v.label}</Stamp>}
      </div>
      <div className="recap-side">
        <div className="recap-close">
          <div className="muted small">THE CLOSE</div>
          <div className="mono huge">{money(res.close)}</div>
          <div className="muted">
            equilibrium p* = <b className="mono">{money(spec.pStar)}</b>
          </div>
        </div>
        <div className="gapline">
          <div>
            <div className="muted small">GAP AT OPEN</div>
            <div className="mono gapv">{signed(res.gap0)}</div>
          </div>
          <div className="gap-arrow">→</div>
          <div>
            <div className="muted small">{hype ? 'BIGGEST GAP' : 'GAP AT CLOSE'}</div>
            <div className={`mono gapv ${hype ? 'down' : 'up'}`}>{hype ? signed(res.peak?.gap ?? res.gapEnd) : signed(res.gapEnd)}</div>
          </div>
          <div className="gap-x">
            <div className="mono">
              {hype ? `${(peak / Math.max(0.5, Math.abs(res.gap0))).toFixed(1)}×` : `${Math.round((Math.abs(res.gapEnd) / Math.max(0.5, Math.abs(res.gap0))) * 100)}%`}
            </div>
            <div className="muted small">{hype ? 'gap blew up' : 'of the gap left'}</div>
          </div>
        </div>
        {res.fit && (
          <div className="fitbox">
            <Tex tex={`p(t) \\approx ${num(res.fit.P)} ${res.fit.A >= 0 ? '+' : '-'} ${num(Math.abs(res.fit.A), 1)}\\,e^{${num(res.fit.rate)}\\,t}`} />
            <div className="small muted">
              {hype ? (
                <>
                  class k̂ = <b className="mono">{num(res.fit.rate)}</b>/min vs theory k = <b className="mono">{num(spec.k)}</b>/min
                  {res.fit.rate > 0 && <> · doubles every {Math.round((Math.log(2) / res.fit.rate) * 60)}s</>}
                </>
              ) : (
                <>
                  rate c = <b className="mono">{num(res.fit.rate)}</b>/min {res.fit.rate < 0 && <>· half-life {Math.round((Math.log(2) / -res.fit.rate) * 60)}s</>} · λ̂ ={' '}
                  <b className="mono">{num(-res.fit.rate / (spec.d1 + spec.s1), 3)}</b>
                </>
              )}
              {' '}· R² {res.fit.r2.toFixed(2)}
            </div>
            {hype && res.burst != null && <div className="small burst">💥 Bubble burst at {mmss(res.burst * 1000)}</div>}
          </div>
        )}
        <div className="recap-lists">
          {view.settings.predictMode === 'choice' ? (
            <div>
              <div className="side-title small">🔮 THE CALL</div>
              <div className="call-result">
                The gap <b className={res.grew ? 'grew' : 'shrank'}>{res.grew ? 'GREW 🚀' : 'SHRANK 🎯'}</b>
              </div>
              <div className="muted small">
                {res.preds.filter((p) => p.err === 0).length} of {res.preds.length} called it · +{money(view.settings.predictBonus, 0)} each
              </div>
              <div className="call-winners">
                {res.preds
                  .filter((p) => p.err === 0)
                  .slice(0, 14)
                  .map((p, i) => {
                    const pl = byId.get(p.id);
                    return pl && (
                      <motion.span key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.06 }} title={pl.name}>
                        <Avatar p={pl} size={30} />
                      </motion.span>
                    );
                  })}
              </div>
            </div>
          ) : (
          <div>
            <div className="side-title small">🔮 BEST CALLS</div>
            {res.preds.slice(0, 3).map((p, i) => {
              const pl = byId.get(p.id);
              return (
                pl && (
                  <motion.div key={p.id} className="mini-row" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.2 }}>
                    <span>{pl.avatar} {pl.name}</span>
                    <span className="mono muted">{money(p.guess)}</span>
                    <span className="mono up">+{money(p.bonus)}</span>
                  </motion.div>
                )
              );
            })}
            {!res.preds.length && <div className="muted small">No predictions this round.</div>}
          </div>
          )}
          <div>
            <div className="side-title small">🏆 ROUND'S TOP DESKS</div>
            {res.top.map((t, i) => {
              const pl = byId.get(t.id);
              return (
                pl && (
                  <motion.div key={t.id} className="mini-row" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 + i * 0.2 }}>
                    <span>{pl.avatar} {pl.name}</span>
                    <span className="mono up">{signed(t.profit)}</span>
                  </motion.div>
                )
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PracticeRecap({ view }: { view: View }) {
  const r = view.round!;
  const real = r.prints.filter((p) => !p.ghost);
  const traded = new Set(real.flatMap((p) => [p.buyer, p.seller]));
  const humans = view.players.filter((p) => !p.bot);
  const missing = humans.filter((p) => !traded.has(p.id));
  return (
    <div className="practice-recap">
      <motion.h1 className="howto-title" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
        PRACTICE OVER ✅
      </motion.h1>
      <div className="pr-stats">
        <div>
          <div className="mono big-num up">{real.length}</div>
          <div className="muted">deals made</div>
        </div>
        <div>
          <div className="mono big-num">{humans.length - missing.length}/{humans.length}</div>
          <div className="muted">traders got a deal in</div>
        </div>
      </div>
      {missing.length > 0 && (
        <div className="pr-missing">
          <span className="muted">Still need help:</span>
          {missing.map((p) => (
            <span key={p.id} className="chip small-chip" style={{ borderColor: p.color }}>
              {p.avatar} {p.name}
            </span>
          ))}
        </div>
      )}
      <p className="pr-foot">Everyone is back to <b className="mono">$0.00</b>. Questions? Ask now. <b>Next round counts.</b></p>
    </div>
  );
}

// ---------------- swap ----------------

function Swap({ view }: { view: View }) {
  const s = view.settings;
  return (
    <div className="swap">
      <motion.h1 className="swap-title" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
        HALFTIME: <span className="up">BUYERS</span> ⇄ <span className="down">SELLERS</span>
      </motion.h1>
      <p className="swap-sub">Everyone swaps roles. Check your phone.</p>
      <div className="swap-grid">
        <motion.div className="swap-card" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
          <div className="phase-badge hype">MEME MODE ACTIVATED</div>
          <h3>🚀 Your card now follows the chart</h3>
          <p className="swap-plain">Price going up → every card's number goes up. Price going down → every number goes down.</p>
          <Tex block tex={`\\text{your limit} = \\text{base} + \\beta\\,p', \\qquad \\beta = ${s.hype}\\ \\text{min}`} />
          <ul>
            <li>
              📈 Price <b>rising</b>? Buyers FOMO: they'll <b>pay more</b>. Sellers hold out: they <b>ask more</b>.
            </li>
            <li>
              📉 Price <b>falling</b>? Buyers wait. Sellers dump.
            </li>
          </ul>
        </motion.div>
        <motion.div className="swap-card" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ delay: 0.8, duration: 0.6 }}>
          <h3>That's Part C of the math</h3>
          <Tex block tex="q_d = d_0 - d_1 p + d_2 p'" />
          <Tex block tex="q_s = -s_0 + s_1 p - s_2 p'" />
          <Tex block tex="\Rightarrow\; p' = k\,(p - p^*),\quad k > 0" />
          <p className="muted">Same equilibrium p*. Opposite sign. Predict accordingly. 😈</p>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------- dock & remote ----------------

function primaryFor(view: View): { label: string; action: 'next' | 'bell' | 'start' | 'end' } | null {
  switch (view.stage) {
    case 'lobby':
      return { label: '▶ Start the game', action: 'start' };
    case 'howto':
      return { label: view.settings.practice ? '🧪 Start practice round (45s)' : '▶ Round 1', action: 'next' };
    case 'briefing':
      return { label: '🔔 Ring the opening bell', action: 'bell' };
    case 'trading':
      return null;
    case 'recap': {
      if (view.practice) return { label: '▶ Round 1, for real', action: 'next' };
      const n = view.roundIndex + 1;
      if (n >= view.totalRounds) return { label: '🏆 Final results', action: 'next' };
      if (n === view.settings.roundsPerPhase) return { label: '⇄ Halftime: swap roles', action: 'next' };
      return { label: `▶ Round ${n + 1}`, action: 'next' };
    }
    case 'swap':
      return { label: `▶ Round ${view.roundIndex + 2}`, action: 'next' };
    case 'final':
      return view.finalStep < 3 ? { label: 'Next ▶', action: 'next' } : null;
  }
  return null;
}

function useHostActions(room: Room, view: View) {
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const act = async (msg: Parameters<Room['send']>[0]) => {
    if (busy) return;
    setBusy(true);
    try {
      unlockAudio();
      await room.send(msg);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const endRound = () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 2500);
      return;
    }
    setArmed(false);
    void act({ t: 'host', action: 'end' });
  };
  const primary = primaryFor(view);
  return { act, busy, armed, endRound, primary };
}

function Dock({ room, view }: { room: Room; view: View }) {
  const { act, busy, armed, endRound, primary } = useHostActions(room, view);
  const [remote, setRemote] = useState(false);
  const r = view.round;
  const token = store.get(hostKey(view.code));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if ((e.key === 'ArrowRight' || e.key === 'Enter') && primary) {
        e.preventDefault();
        void act({ t: 'host', action: primary.action });
      } else if (e.key === 'ArrowLeft' && view.stage === 'final') void act({ t: 'host', action: 'prev' });
      else if ((e.key === 'p' || e.key === ' ') && view.stage === 'trading') {
        e.preventDefault();
        void act({ t: 'host', action: r?.running ? 'pause' : 'resume' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div className="dock">
        {view.stage === 'trading' && r && (
          <>
            <button className="btn ghost" onClick={() => act({ t: 'host', action: r.running ? 'pause' : 'resume' })}>
              {r.running ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button className="btn ghost" onClick={() => act({ t: 'host', action: 'addTime', seconds: 30 })}>
              +30s
            </button>
            <button className={`btn ${armed ? 'danger' : 'ghost'}`} onClick={endRound}>
              {armed ? 'Tap again to close' : '🔔 Close market'}
            </button>
          </>
        )}
        {view.stage === 'final' && (
          <>
            <button className="btn ghost" disabled={view.finalStep === 0} onClick={() => act({ t: 'host', action: 'prev' })}>
              ◀
            </button>
            {view.finalStep === 3 && (
              <button className="btn ghost" onClick={() => confirm('Reset scores and play again with the same traders?') && act({ t: 'host', action: 'restart' })}>
                ↻ Play again
              </button>
            )}
          </>
        )}
        {primary && (
          <button
            className="btn primary"
            disabled={busy || (view.stage === 'lobby' && view.players.length < 2)}
            onClick={() => act({ t: 'host', action: primary.action })}
          >
            {primary.label}
          </button>
        )}
        <button className="iconbtn" title="Control from your phone" onClick={() => setRemote(true)}>
          📱
        </button>
      </div>
      <AnimatePresence>
        {remote && token && (
          <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRemote(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Host remote</h3>
              <p className="muted">Scan with <b>your</b> phone to run the game from the room. Anyone who scans this gets host controls, so close it fast.</p>
              <QR text={`${location.origin}/host/${view.code}#k=${token}`} className="remote-qr" />
              <button className="btn" onClick={() => setRemote(false)}>
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HostRemote({ room, view }: { room: Room; view: View }) {
  useFrame(view.stage === 'trading', 4);
  const { act, busy, armed, endRound, primary } = useHostActions(room, view);
  const r = view.round;
  const left = r ? r.durationMs - liveClock(view, room.serverNow) : 0;
  const stageName: Record<string, string> = {
    lobby: 'Lobby', howto: 'How to play', briefing: 'Briefing', trading: 'Trading', recap: 'Round recap', swap: 'Halftime', final: `Results ${view.finalStep + 1}/4`,
  };
  return (
    <div className="remote">
      <Logo small />
      <div className="remote-pin mono">PIN {view.code}</div>
      <div className="remote-stage">
        <div className="muted small">NOW</div>
        <h2>{stageName[view.stage]}</h2>
        {r && (
          <div className="muted">
            {view.practice ? 'Practice round' : `Round ${view.roundIndex + 1}/${view.totalRounds}`} · ${r.spec.ticker}
          </div>
        )}
        {view.stage === 'trading' && r && <div className="mono huge">{r.running ? mmss(left) : 'PAUSED'}</div>}
        <div className="muted">👥 {view.players.length} traders · {view.players.filter((p) => p.online).length} online</div>
      </div>
      {view.stage === 'trading' && r && (
        <div className="remote-row">
          <button className="btn ghost" onClick={() => act({ t: 'host', action: r.running ? 'pause' : 'resume' })}>
            {r.running ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button className="btn ghost" onClick={() => act({ t: 'host', action: 'addTime', seconds: 30 })}>
            +30s
          </button>
          <button className={`btn ${armed ? 'danger' : 'ghost'}`} onClick={endRound}>
            {armed ? 'Tap again' : 'Close market'}
          </button>
        </div>
      )}
      {view.stage === 'final' && (
        <div className="remote-row">
          <button className="btn ghost" onClick={() => act({ t: 'host', action: 'prev' })}>
            ◀ Back
          </button>
        </div>
      )}
      {primary && (
        <button className="btn primary huge-btn" disabled={busy} onClick={() => { vibrate(20); void act({ t: 'host', action: primary.action }); }}>
          {primary.label}
        </button>
      )}
      <a className="muted small" href={`/watch/${view.code}`} target="_blank" rel="noreferrer">
        Open projector view ↗
      </a>
      <StatusPill status={room.status} />
    </div>
  );
}

export function PlayerName({ p }: { p?: PublicPlayer }): ReactNode {
  if (!p) return '—';
  return (
    <>
      {p.avatar} {p.name}
    </>
  );
}
