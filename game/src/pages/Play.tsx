import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { playerKey, store, useRoom } from '../net';
import type { Fx, Proposal, PublicPlayer, View } from '../../shared/types';
import { AVATARS, effective, profitFor, rankTitle } from '../../shared/market';
import { Avatar, Logo, Money, RoleTag, StatusPill, Tex } from '../ui/bits';
import { Chart } from '../ui/Chart';
import { liveClock, mmss, money, num, ranked, signed, useFrame, vibrate } from '../util';
import { sfx, unlockAudio } from '../sound';
import { equations, HOWTO, MemeLoop, ProfitExample } from './Host';
import { awards } from './Final';

type Room = ReturnType<typeof useRoom>;

export default function Play({ code }: { code: string }) {
  const room = useRoom(code, 'player', playerKey(code));
  const { view, error, status } = room;
  const me = view?.me;

  if (error) {
    return (
      <div className="phone center-screen">
        <Logo />
        <h2>{error.code === 'kicked' ? 'You got margin-called 🫠' : 'Floor not found'}</h2>
        <p className="muted">{error.message}</p>
        <a className="btn primary" href="/">Back</a>
      </div>
    );
  }
  if (!view) {
    return (
      <div className="phone center-screen">
        <Logo />
        <div className="spinner big" />
        <StatusPill status={status} />
      </div>
    );
  }
  if (!me) return <JoinForm room={room} view={view} />;
  return <Desk room={room} view={view} />;
}

// ---------------- join ----------------

function JoinForm({ room, view }: { room: Room; view: View }) {
  const [name, setName] = useState(() => store.get('cb:name') ?? '');
  const [avatar, setAvatar] = useState(() => store.get('cb:avatar') ?? AVATARS[Math.floor(Math.random() * 16)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudio();
    if (!name.trim()) return setErr('Every trader needs a name.');
    setBusy(true);
    setErr('');
    try {
      const res = await room.send<{ id: string; token: string }>({ t: 'join', name: name.trim(), avatar });
      if (res?.token) store.set(playerKey(view.code), res.token);
      store.set('cb:name', name.trim());
      store.set('cb:avatar', avatar);
      sfx.pop();
      vibrate(30);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="phone join">
      <Logo />
      <div className="muted">
        Floor <b className="mono">{view.code}</b> · {view.players.length} traders in
      </div>
      <form onSubmit={submit} className="join-form">
        <label className="muted small">YOUR TRADER NAME</label>
        <input className="name-input" value={name} maxLength={16} autoFocus placeholder="e.g. Gordon" onChange={(e) => setName(e.target.value)} />
        <label className="muted small">PICK YOUR SPIRIT ANIMAL</label>
        <div className="av-grid">
          {AVATARS.map((a) => (
            <button type="button" key={a} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>
              {a}
            </button>
          ))}
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn primary huge-btn" disabled={busy}>
          {busy ? 'Opening your desk…' : 'Enter the floor →'}
        </button>
      </form>
      <StatusPill status={room.status} />
    </div>
  );
}

// ---------------- desk ----------------

function Desk({ room, view }: { room: Room; view: View }) {
  const me = view.me!;
  const mine = view.players.find((p) => p.id === me.id);
  const [boom, setBoom] = useState<{ id: string; profit: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const stage = view.stage;

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(
    () =>
      room.onFx((fx: Fx) => {
        if (fx.kind === 'trade' && (fx.print.buyer === me.id || fx.print.seller === me.id)) {
          const profit = (fx.print.buyer === me.id ? fx.print.bp : fx.print.sp) ?? 0;
          sfx.cash();
          vibrate([40, 40, 80]);
          setBoom({ id: fx.print.id, profit });
          const emoji = confetti.shapeFromText({ text: '💵', scalar: 2 });
          confetti({ particleCount: 40, spread: 100, origin: { y: 0.6 }, shapes: [emoji], scalar: 2 });
          setTimeout(() => setBoom((b) => (b?.id === fx.print.id ? null : b)), 1600);
        } else if (fx.kind === 'proposal' && fx.proposal.to === me.id) {
          sfx.offer();
          vibrate([60, 60, 60]);
        } else if (fx.kind === 'declined') {
          if (fx.reason && fx.reason !== 'withdrawn' && fx.by !== me.id) {
            const by = view.players.find((p) => p.id === fx.by);
            const msg =
              fx.reason === 'declined' ? `${by?.name ?? 'They'} passed on your offer.` :
              fx.reason === 'expired' ? 'Offer expired.' :
              fx.reason === 'New card dealt' ? `${by?.name ?? 'Their'} card changed — offer voided.` : fx.reason;
            setNotice(msg);
            sfx.nope();
            setTimeout(() => setNotice((n) => (n === msg ? null : n)), 3200);
          }
        } else if (fx.kind === 'bell') {
          sfx.bell();
          vibrate(200);
        } else if (fx.kind === 'close') {
          sfx.bell();
          vibrate([100, 50, 100]);
        }
      }),
    [room, me.id, view.players],
  );

  const ranks = ranked(view.players);
  const rank = ranks.findIndex((p) => p.id === me.id) + 1;

  return (
    <div className={`phone desk role-${me.role}`}>
      <header className="desk-head">
        <div className="dh-me">
          {mine && <Avatar p={mine} size={38} />}
          <div>
            <div className="dh-name">{mine?.name}</div>
            <div className="muted small mono">DESK #{mine?.desk}</div>
          </div>
        </div>
        <div className="dh-money">
          <Money value={mine?.total ?? 0} className={`dh-total ${(mine?.total ?? 0) < 0 ? 'down' : ''}`} />
          <div className="muted small mono">
            #{rank} of {view.players.length}
          </div>
        </div>
      </header>
      <div className="desk-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage + view.roundIndex + (view.practice ? 'p' : '')}
            className="desk-stage"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {stage === 'lobby' && <PhoneLobby view={view} />}
            {stage === 'howto' && <PhoneHowTo view={view} />}
            {stage === 'briefing' && <PhoneBriefing room={room} view={view} />}
            {stage === 'trading' && <PhoneTrading room={room} view={view} />}
            {stage === 'recap' && (view.practice ? <PhonePracticeRecap view={view} /> : <PhoneRecap view={view} />)}
            {stage === 'swap' && <PhoneSwap view={view} />}
            {stage === 'final' && <PhoneFinal view={view} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {stage === 'trading' && <Incoming room={room} view={view} />}
      <AnimatePresence>
        {boom && (
          <motion.div key={boom.id} className="boom" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -80 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
            <div className="boom-deal">DEAL!</div>
            <div className={`boom-amt mono ${boom.profit >= 0 ? 'up' : 'down'}`}>{signed(boom.profit)}</div>
          </motion.div>
        )}
        {notice && (
          <motion.div className="notice" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      <StatusPill status={room.status} />
    </div>
  );
}

function PhoneLobby({ view }: { view: View }) {
  const me = view.players.find((p) => p.id === view.me!.id)!;
  return (
    <div className="p-lobby">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -10, 10, 0] }} transition={{ type: 'spring' }}>
        <Avatar p={me} size={120} />
      </motion.div>
      <h1>You're in.</h1>
      <p className="muted">Eyes on the projector. The bell rings soon.</p>
      <Steps />
    </div>
  );
}

function Steps() {
  return (
    <div className="rules">
      {HOWTO.map((h, i) => (
        <motion.div key={h.title} className="rule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.25 }}>
          <span className="rule-emoji">{h.emoji}</span>
          <div>
            <b>
              {i + 1}. {h.title}
            </b>
            <div className="muted small">{h.body}</div>
          </div>
        </motion.div>
      ))}
      <div className="rule-money">💰 Profit = gap between the price and your card. Most money wins.</div>
      <ProfitExample />
    </div>
  );
}

function PhoneHowTo({ view }: { view: View }) {
  const me = view.me!;
  return (
    <div className="p-lobby">
      <div className="muted small">YOU ARE A</div>
      <RoleTag role={me.role} big />
      <p className="role-plain">{me.role === 'buyer' ? 'You buy. Pay LESS than your card.' : 'You sell. Get MORE than your card.'}</p>
      <Steps />
      {view.settings.practice && <p className="muted">First up: a 45-second practice round. It doesn't count.</p>}
    </div>
  );
}

function PhonePracticeRecap({ view }: { view: View }) {
  const me = view.me!;
  const r = view.round!;
  const mine = r.prints.filter((p) => p.buyer === me.id || p.seller === me.id);
  const made = mine.reduce((a, p) => a + ((p.buyer === me.id ? p.bp : p.sp) ?? 0), 0);
  return (
    <div className="p-recap">
      <h1 className="practice-done">{mine.length ? 'Nailed it ✅' : 'Practice over'}</h1>
      {mine.length ? (
        <p>
          You made {mine.length} deal{mine.length > 1 ? 's' : ''} for <b className="up">{signed(made)}</b> of practice money.
        </p>
      ) : (
        <p>No deal yet. That's fine! Next round, find someone on the other side and tap 🤝.</p>
      )}
      <div className="recap-big">
        Scores reset to <b className="mono">$0.00</b>. <b>Next round counts.</b>
      </div>
    </div>
  );
}

function PhoneBriefing({ room, view }: { room: Room; view: View }) {
  const r = view.round!;
  const spec = r.spec;
  const me = view.me!;
  const eq = equations(spec);
  const [val, setVal] = useState<string>(me.prediction != null ? String(me.prediction) : '');
  const [editing, setEditing] = useState(me.prediction == null);
  const [err, setErr] = useState('');
  const choice = view.settings.predictMode === 'choice';
  const open = spec.open[spec.open.length - 1];
  const call = async (v: 1 | -1) => {
    try {
      await room.send({ t: 'predict', value: v });
      sfx.pop();
      vibrate(20);
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const lock = async () => {
    const v = Number(val);
    if (!val || !Number.isFinite(v)) return setErr('Enter a price.');
    try {
      await room.send({ t: 'predict', value: v });
      setEditing(false);
      setErr('');
      sfx.pop();
      vibrate(20);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="p-brief">
      <div className="p-role-banner">
        <span className="muted small">THIS ROUND YOU ARE A</span>
        <RoleTag role={me.role} big />
        <span className="role-plain">{me.role === 'buyer' ? 'You buy. Pay LESS than your card.' : 'You sell. Get MORE than your card.'}</span>
      </div>
      <div className="p-co">
        <span className={`phase-badge ${spec.kind}`}>{spec.kind === 'stable' ? 'BLUE CHIP' : 'MEME MODE'}</span>
        <b>${spec.ticker}</b> <span className="muted">round {view.roundIndex + 1} of {view.totalRounds}</span>
      </div>
      {spec.kind === 'hype' && (
        <div className="meme-note">
          <div className="meme-head">🚀 MEME MODE: your card follows the chart</div>
          Price rising $5 a minute → your card +$5. Falling → your card goes down. Rising prices push cards up, which pushes prices up more.
        </div>
      )}
      {choice ? (
        <div className="predict-card phone-predict">
          <div className="pp-board">
            <div>
              <div className="muted small">FAIR PRICE</div>
              <div className="mono amber pp-num">{money(spec.pStar)}</div>
            </div>
            <div>
              <div className="muted small">OPENS AT</div>
              <div className="mono pp-num">{money(open)}</div>
            </div>
          </div>
          <div className="predict-q">🔮 Make the call</div>
          <div className="muted small">
            It opens {money(Math.abs(open - spec.pStar), 0)} {open >= spec.pStar ? 'above' : 'below'} fair. At the closing bell, will it be closer to {money(spec.pStar, 0)} or farther? Right call = {money(view.settings.predictBonus, 0)}.
          </div>
          <div className="call-btns">
            <button className={`call-btn shrink ${me.prediction === -1 ? 'on' : ''}`} onClick={() => call(-1)}>
              🎯 SHRINK<span>ends closer to fair</span>
            </button>
            <button className={`call-btn grow ${me.prediction === 1 ? 'on' : ''}`} onClick={() => call(1)}>
              🚀 GROW<span>ends farther away</span>
            </button>
          </div>
          {me.prediction != null && <div className="muted small">🔒 Locked in. Tap the other one to switch.</div>}
          {err && <div className="err">{err}</div>}
        </div>
      ) : (
      <>
      <div className="eq-card small-eq">
        <Tex block tex={eq.qd} />
        <Tex block tex={eq.qs} />
        <div className="muted small">
          Pre-market: {spec.open.map((p) => money(p)).join(' → ')}
          {spec.kind === 'hype' && <> · k = {num(spec.k)}/min</>}
        </div>
      </div>
      <div className="predict-card phone-predict">
        <div className="predict-q">🔮 Predict the close</div>
        <div className="muted small">Avg price of the last 20s. Up to {money(view.settings.predictBonus, 0)} bonus.</div>
        {editing ? (
          <div className="predict-row">
            <span className="dollar">$</span>
            <input type="number" inputMode="decimal" className="predict-input mono" value={val} placeholder="0.00" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lock()} />
            <button className="btn primary" onClick={lock}>
              Lock
            </button>
          </div>
        ) : (
          <button className="locked" onClick={() => setEditing(true)}>
            🔒 <span className="mono">{money(me.prediction ?? Number(val))}</span> <span className="muted small">tap to change</span>
          </button>
        )}
        {err && <div className="err">{err}</div>}
      </div>
      </>
      )}
    </div>
  );
}

function PhoneTrading({ room, view }: { room: Room; view: View }) {
  useFrame(true, 10);
  const r = view.round!;
  const spec = r.spec;
  const me = view.me!;
  const clock = liveClock(view, room.serverNow);
  const left = r.durationMs - clock;
  const card = me.card;
  const limit = card ? effective(card.base, r.shift) : null;
  const life = card ? Math.max(0, (card.expiresMs - clock) / (card.expiresMs - card.issuedMs)) : 0;
  const last = r.prints[r.prints.length - 1];
  const [dealOpen, setDealOpen] = useState(false);
  const out = me.outgoing;
  const outTo = out ? view.players.find((p) => p.id === out.to) : null;
  const myTrades = r.prints.filter((p) => p.buyer === me.id || p.seller === me.id).reverse();
  const hype = spec.kind === 'hype';
  const nowS = room.serverNow();

  return (
    <div className="p-trade">
      {view.practice && <div className="practice-banner phone">🧪 PRACTICE · doesn't count · make one deal!</div>}
      <div className="mkt-strip">
        <div>
          <span className="muted small">${spec.ticker}</span>{' '}
          <span className="mono mkt-last">{last ? money(last.price) : '—'}</span>
        </div>
        {hype && (
          <div className={`mono small ${r.momentum >= 0 ? 'up' : 'down'}`}>
            {r.momentum >= 0 ? '📈 rising' : '📉 falling'}
          </div>
        )}
        <div className={`mono mkt-timer ${left < 10500 ? 'down pulse' : ''}`}>{r.running ? mmss(left) : '⏸ HALT'}</div>
      </div>
      <div className="mini-chart">
        <Chart prints={r.prints} durationS={r.durationMs / 1000} tNow={clock / 1000} pStar={hype || view.practice || view.settings.predictMode === 'choice' ? spec.pStar : null} live compact />
      </div>
      <AnimatePresence mode="wait">
        {card && limit != null && (
          <motion.div
            key={card.id}
            className={`card ${me.role}`}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-top">
              <span className="card-role">{me.role === 'buyer' ? "YOU'RE BUYING" : "YOU'RE SELLING"}</span>
              <span className="muted small">{me.role === 'buyer' ? 'profit if you pay less than' : 'profit if you sell above'}</span>
            </div>
            <Money value={limit} className="card-limit" />
            <div className="card-tip">
              {me.role === 'buyer' ? 'Every $1 under this = $1 profit for you' : 'Every $1 over this = $1 profit for you'}
            </div>
            {hype && (
              <div className="card-hype mono small">
                base {money(card.base, 0)} <span className={r.shift >= 0 ? 'up' : 'down'}>{r.shift >= 0 ? '+' : '−'} hype {money(Math.abs(r.shift))} {r.shift >= 0 ? '📈' : '📉'}</span>
              </div>
            )}
            <div className="card-life">
              <div className="card-life-fill" style={{ width: `${life * 100}%` }} />
            </div>
            <div className="muted small">new card in {Math.max(0, Math.ceil((card.expiresMs - clock) / 1000))}s · use it or lose it</div>
          </motion.div>
        )}
      </AnimatePresence>
      {out && outTo ? (
        <div className="outgoing">
          <div>
            Offer to <b>{outTo.avatar} {outTo.name}</b> @ <b className="mono">{money(out.price)}</b>
          </div>
          <div className="muted small">waiting for them to confirm… {Math.max(0, Math.ceil((out.expiresAt - nowS) / 1000))}s</div>
          <button className="btn ghost small-btn" onClick={() => room.send({ t: 'cancel', id: out.id }).catch(() => {})}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn deal-btn" disabled={!r.running || !card} onClick={() => { unlockAudio(); vibrate(15); setDealOpen(true); }}>
          🤝 I MADE A DEAL
        </button>
      )}
      {myTrades.length > 0 && (
        <div className="my-trades">
          <div className="muted small">YOUR DEALS THIS ROUND</div>
          {myTrades.slice(0, 5).map((p) => {
            const other = view.players.find((x) => x.id === (p.buyer === me.id ? p.seller : p.buyer));
            const prof = p.buyer === me.id ? p.bp! : p.sp!;
            return (
              <div key={p.id} className="mini-row">
                <span>{other?.avatar} {other?.name}</span>
                <span className="mono muted">{money(p.price)}</span>
                <span className={`mono ${prof >= 0 ? 'up' : 'down'}`}>{signed(prof)}</span>
              </div>
            );
          })}
        </div>
      )}
      <AnimatePresence>{dealOpen && card && <DealSheet room={room} view={view} limit={limit!} onClose={() => setDealOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function DealSheet({ room, view, limit, onClose }: { room: Room; view: View; limit: number; onClose: () => void }) {
  const me = view.me!;
  const [who, setWho] = useState<PublicPlayer | null>(null);
  const [q, setQ] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const others = useMemo(
    () =>
      view.players
        .filter((p) => p.id !== me.id && p.role !== me.role)
        .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.desk) === q.trim())
        .sort((a, b) => Number(b.online) - Number(a.online) || a.desk - b.desk),
    [view.players, me.id, me.role, q],
  );
  const r = view.round!;
  const liveLimit = me.card ? effective(me.card.base, r.shift) : limit;
  const p = Number(price);
  const prof = price ? profitFor(me.role, liveLimit, p) : null;
  const press = (k: string) => {
    vibrate(8);
    setErr('');
    setPrice((s) => {
      if (k === '⌫') return s.slice(0, -1);
      if (k === '.') return s.includes('.') ? s : (s || '0') + '.';
      if (s.includes('.') && s.split('.')[1].length >= 2) return s;
      if (s.replace('.', '').length >= 6) return s;
      return s === '0' ? k : s + k;
    });
  };
  const submit = async () => {
    if (!who || !price) return;
    setBusy(true);
    try {
      await room.send({ t: 'propose', to: who.id, price: p });
      sfx.pop();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      sfx.nope();
      vibrate([30, 30, 30]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {!who ? (
          <>
            <h3>Who'd you trade with?</h3>
            <input className="search" placeholder={`Search ${me.role === 'buyer' ? 'sellers' : 'buyers'} by name or desk #`} value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="who-grid">
              {others.map((o) => (
                <button key={o.id} className={`who ${o.online ? '' : 'off'}`} style={{ borderColor: o.color }} onClick={() => { setWho(o); vibrate(10); }}>
                  <span className="who-av">{o.avatar}</span>
                  <span className="who-name">{o.name}</span>
                  <span className="muted small mono">#{o.desk}</span>
                </button>
              ))}
              {!others.length && <div className="muted">No {me.role === 'buyer' ? 'sellers' : 'buyers'} match.</div>}
            </div>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
          </>
        ) : (
          <>
            <button className="back-link" onClick={() => setWho(null)}>← {who.avatar} {who.name}</button>
            <div className="muted small">{me.role === 'buyer' ? 'YOU BUY FROM THEM FOR' : 'YOU SELL TO THEM FOR'}</div>
            <div className="price-display mono">${price || '0'}</div>
            <div className={`profit-preview ${prof == null ? '' : prof >= 0 ? 'up' : 'down'}`}>
              {prof == null ? (
                <span className="muted">Your card: {money(liveLimit)}</span>
              ) : prof >= 0 ? (
                <>Your profit {signed(prof)}</>
              ) : (
                <>⚠️ You'd LOSE {money(-prof)} on this</>
              )}
            </div>
            <div className="keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
                <button key={k} onClick={() => press(k)}>
                  {k}
                </button>
              ))}
            </div>
            {err && <div className="err">{err}</div>}
            <button className="btn primary huge-btn" disabled={busy || !price || prof == null || p < 1} onClick={submit}>
              {busy ? 'Sending…' : `Send to ${who.name} →`}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Incoming({ room, view }: { room: Room; view: View }) {
  useFrame(true, 4);
  const me = view.me!;
  const r = view.round!;
  const list = me.incoming;
  const pr: Proposal | undefined = list[0];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (pr?.id !== lastId.current) {
      lastId.current = pr?.id ?? null;
      setErr('');
    }
  }, [pr?.id]);
  if (!pr || !me.card) return null;
  const from = view.players.find((p) => p.id === pr.from);
  const limit = effective(me.card.base, r.shift);
  const prof = profitFor(me.role, limit, pr.price);
  const left = Math.max(0, pr.expiresAt - room.serverNow());
  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      await room.send({ t: 'respond', id: pr.id, accept });
      if (!accept) vibrate(10);
    } catch (e) {
      setErr((e as Error).message);
      sfx.nope();
    } finally {
      setBusy(false);
    }
  };
  return (
    <AnimatePresence>
      <motion.div key={pr.id} className="incoming-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="incoming" initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
          <div className="inc-from">
            {from && <Avatar p={from} size={64} />}
            <div>
              <b>{from?.name}</b> <span className="muted mono">#{from?.desk}</span>
              <div className="muted small">says you made a deal</div>
            </div>
          </div>
          <div className="inc-what">
            You <b>{me.role === 'buyer' ? 'BUY' : 'SELL'}</b> 1 share for
          </div>
          <div className="inc-price mono">{money(pr.price)}</div>
          <div className={`profit-preview big ${prof >= 0 ? 'up' : 'down'}`}>
            {prof >= 0 ? <>Your profit {signed(prof)}</> : <>⚠️ You'd LOSE {money(-prof)} on this</>}
          </div>
          <div className="inc-timer">
            <div style={{ width: `${(left / 20000) * 100}%` }} />
          </div>
          {err && <div className="err">{err}</div>}
          <div className="inc-btns">
            <button className="btn ghost" disabled={busy} onClick={() => answer(false)}>
              ✗ Nope
            </button>
            <button className={`btn ${prof < 0 ? 'danger-soft' : 'primary'}`} disabled={busy} onClick={() => answer(true)}>
              ✓ CONFIRM
            </button>
          </div>
          {list.length > 1 && <div className="muted small">+{list.length - 1} more offer{list.length > 2 ? 's' : ''} waiting</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PhoneRecap({ view }: { view: View }) {
  const me = view.me!;
  const r = view.round!;
  const res = r.result;
  const mine = view.players.find((p) => p.id === me.id)!;
  const pred = res?.preds.find((p) => p.id === me.id);
  const ranks = ranked(view.players);
  const rank = ranks.findIndex((p) => p.id === me.id) + 1;
  const delta = mine.rankBefore != null ? mine.rankBefore - rank : 0;
  useEffect(() => {
    if (mine.roundProfit > 0) confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
  }, [mine.roundProfit]);
  return (
    <div className="p-recap">
      <div className="muted small">ROUND {view.roundIndex + 1} · ${r.spec.ticker} CLOSED AT</div>
      <div className="mono huge">{res ? money(res.close) : '—'}</div>
      <div className="muted">p* was {money(r.spec.pStar)}</div>
      <div className="recap-big">
        <div className="muted small">YOUR ROUND</div>
        <Money value={mine.roundProfit} sign className={`huge ${mine.roundProfit >= 0 ? 'up' : 'down'}`} />
      </div>
      {pred && view.settings.predictMode === 'choice' ? (
        <div className="pred-res">
          🔮 You said <b>{pred.guess > 0 ? 'GROW' : 'SHRINK'}</b>. The gap {res?.grew ? 'grew' : 'shrank'}.{' '}
          {pred.err === 0 ? <b className="up">Correct! +{money(pred.bonus)}</b> : <b className="down">Wrong call.</b>}
        </div>
      ) : pred ? (
        <div className="pred-res">
          🔮 You called {money(pred.guess)}, off by {money(pred.err)} → <b className="up">+{money(pred.bonus)}</b>
        </div>
      ) : (
        <div className="muted small">No prediction this round. Free money left on the table!</div>
      )}
      <div className="rank-big">
        #{rank} <span className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>{delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : '–'}</span>
      </div>
      <div className="muted">{rankTitle(rank, view.players.length)}</div>
    </div>
  );
}

function PhoneSwap({ view }: { view: View }) {
  const me = view.me!;
  return (
    <div className="p-swap">
      <div className="muted">HALFTIME</div>
      <motion.div initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ duration: 0.9, delay: 0.3 }}>
        <div className="muted small">YOU ARE NOW A</div>
        <RoleTag role={me.role} big />
      </motion.div>
      <div className="phase-badge hype">MEME MODE</div>
      <p className="muted small">Your card now follows the chart:</p>
      <MemeLoop compact vertical />
      <p className="muted small">On your card: base + hype. Profit works the same as before.</p>
    </div>
  );
}

function PhoneFinal({ view }: { view: View }) {
  const me = view.me!;
  const ranks = ranked(view.players);
  const rank = ranks.findIndex((p) => p.id === me.id) + 1;
  const mine = ranks[rank - 1];
  const mineAwards = awards(view.players, view.settings.predictMode).filter((a) => a.who.id === me.id);
  useEffect(() => {
    if (rank <= 3) {
      const t = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.4 } }), 3500);
      return () => clearTimeout(t);
    }
  }, [rank]);
  if (!mine) return null;
  return (
    <div className="p-final">
      <div className="muted small">FINAL RANK</div>
      <motion.div className="final-rank mono" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
        #{rank}
      </motion.div>
      <div className="final-title-p">{rankTitle(rank, view.players.length)}</div>
      <Money value={mine.total} className="huge" />
      <div className="breakdown">
        <div>
          <span className="muted">Blue chip</span> <span className="mono">{money(mine.pp[0])}</span>
        </div>
        <div>
          <span className="muted">Meme mode</span> <span className="mono">{money(mine.pp[1])}</span>
        </div>
        <div>
          <span className="muted">Prediction bonus</span> <span className="mono">{money(mine.bonus)}</span>
        </div>
        <div>
          <span className="muted">Trades</span> <span className="mono">{mine.trades}</span>
        </div>
      </div>
      {mineAwards.map((a) => (
        <div key={a.title} className="award">
          <div className="award-emoji">{a.emoji}</div>
          <div>
            <div className="award-title">{a.title}</div>
            <div className="muted small">{a.stat}</div>
          </div>
        </div>
      ))}
      <p className="muted small">Look up at the projector for the math reveal.</p>
    </div>
  );
}
