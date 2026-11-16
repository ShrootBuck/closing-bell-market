import katex from 'katex';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type { Print, PublicPlayer } from '../../shared/types';
import { money, ranked, signed, useTween } from '../util';
import { isMuted, setMuted } from '../sound';

export function Tex({ tex, block }: { tex: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: !!block, throwOnError: false }), [tex, block]);
  return <span className={block ? 'tex tex-block' : 'tex'} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function QR({ text, className }: { text: string; className?: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#04120b', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [text]);
  return <div className={`qr ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className={`logo ${small ? 'logo-sm' : ''}`}>
      <span className="logo-bell">🔔</span>
      <span className="logo-text">
        CLOSING<span>BELL</span>
      </span>
    </div>
  );
}

export function Money({ value, className, digits = 2, sign }: { value: number; className?: string; digits?: number; sign?: boolean }) {
  const v = useTween(value, 700);
  return <span className={`mono ${className ?? ''}`}>{sign ? signed(v, digits) : money(v, digits)}</span>;
}

export function Avatar({ p, size = 36 }: { p: Pick<PublicPlayer, 'avatar' | 'color'>; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.58, background: `${p.color}22`, borderColor: p.color }}>
      {p.avatar}
    </span>
  );
}

export function RoleTag({ role, big }: { role: 'buyer' | 'seller'; big?: boolean }) {
  return <span className={`roletag ${role} ${big ? 'big' : ''}`}>{role === 'buyer' ? 'BUYER' : 'SELLER'}</span>;
}

export function Ring({ frac, size = 64, stroke = 6, color = 'var(--up)', children }: { frac: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function MuteButton() {
  const [m, setM] = useState(isMuted());
  return (
    <button className="iconbtn" onClick={() => { setMuted(!m); setM(!m); }} title={m ? 'Unmute' : 'Mute'}>
      {m ? '🔇' : '🔊'}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  if (status === 'live') return null;
  return (
    <div className="statuspill">
      <span className="spinner" /> {status === 'connecting' ? 'Connecting to the exchange…' : 'Reconnecting… your desk is safe'}
    </div>
  );
}

/** Scrolling ticker tape of trades and headlines. */
export function Tape({ items }: { items: ReactNode[] }) {
  const content = items.length ? items : [<span key="x">MARKET OPEN SOON · STAY LIQUID · NOT FINANCIAL ADVICE</span>];
  return (
    <div className="tape">
      <div className="tape-track" style={{ animationDuration: `${Math.max(30, content.length * 4)}s` }}>
        {[0, 1].map((k) => (
          <div className="tape-seg" key={k} aria-hidden={k === 1}>
            {content.map((c, i) => (
              <span className="tape-item" key={i}>
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function tradeTapeItems(prints: Print[], players: PublicPlayer[], ticker: string) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const real = prints.filter((p) => !p.ghost).slice(-18).reverse();
  return real.map((p, i) => {
    const prev = prints[prints.indexOf(p) - 1];
    const up = !prev || p.price >= prev.price;
    const b = byId.get(p.buyer ?? '');
    const s = byId.get(p.seller ?? '');
    return (
      <span key={p.id + i}>
        <b>{ticker}</b> <span className={up ? 'up' : 'down'}>{up ? '▲' : '▼'} {money(p.price)}</span>{' '}
        <span className="muted">
          {s?.avatar}
          {s?.name} → {b?.avatar}
          {b?.name}
        </span>
      </span>
    );
  });
}

export function RichList({ players, limit = 10, highlight, showRound }: { players: PublicPlayer[]; limit?: number; highlight?: string; showRound?: boolean }) {
  const list = ranked(players);
  const shown = list.slice(0, limit);
  const me = highlight ? list.findIndex((p) => p.id === highlight) : -1;
  return (
    <div className="richlist">
      <LayoutGroup>
        <AnimatePresence initial={false}>
          {shown.map((p, i) => (
            <RichRow key={p.id} p={p} rank={i + 1} me={p.id === highlight} showRound={showRound} />
          ))}
          {me >= limit && <RichRow key={list[me].id} p={list[me]} rank={me + 1} me showRound={showRound} />}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

function RichRow({ p, rank, me, showRound }: { p: PublicPlayer; rank: number; me?: boolean; showRound?: boolean }) {
  const delta = p.rankBefore != null ? p.rankBefore - rank : 0;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      className={`richrow ${me ? 'me' : ''} ${rank <= 3 ? `top${rank}` : ''}`}
    >
      <span className="rank mono">{rank === 1 ? '👑' : rank}</span>
      <span className="rr-av" style={{ borderColor: p.color }}>{p.avatar}</span>
      <span className="rr-name">
        {p.name}
        {!p.online && <span className="offline-dot" title="offline" />}
      </span>
      {delta !== 0 && <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? `▲${delta}` : `▼${-delta}`}</span>}
      {showRound && p.roundProfit !== 0 && <span className="rr-round mono up">{signed(p.roundProfit, 0)}</span>}
      <Money value={p.total} className={`rr-total ${p.total < 0 ? 'down' : ''}`} />
    </motion.div>
  );
}

export function Stamp({ kind, children }: { kind: 'stable' | 'hype'; children: ReactNode }) {
  return (
    <motion.div
      className={`stamp ${kind}`}
      initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
