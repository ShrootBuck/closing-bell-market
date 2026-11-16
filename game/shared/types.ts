export type Role = 'buyer' | 'seller';
export type Kind = 'stable' | 'hype';
export type Stage = 'lobby' | 'howto' | 'briefing' | 'trading' | 'recap' | 'swap' | 'final';
export type PredictMode = 'choice' | 'number';

export interface Settings {
  roundsPerPhase: number; // rounds in each phase (2 phases)
  roundSeconds: number; // trading time per round
  cardSeconds: number; // card lifetime before it is re-dealt
  hype: number; // beta (minutes): card shift = beta * p'
  predictBonus: number; // max $ for a perfect close prediction
  practice: boolean; // 45s practice round before round 1
  predictMode: PredictMode; // 'choice' = will the gap shrink or grow; 'number' = guess the close
}

export const DEFAULT_SETTINGS: Settings = {
  roundsPerPhase: 3,
  roundSeconds: 120,
  cardSeconds: 30,
  hype: 1,
  predictBonus: 25,
  practice: true,
  predictMode: 'choice',
};

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  desk: number;
  role0: Role; // role during phase 1; flipped in phase 2
  bot?: boolean;
  kicked?: boolean;
  joinedAt: number;
  profit: number; // trading profit
  bonus: number; // prediction bonus
  trades: number;
  best: number; // best single-trade profit
  pp: [number, number]; // profit by phase
  predErr: number[]; // abs prediction errors
}

export interface Card {
  id: string;
  base: number; // value (buyer) or cost (seller)
  issuedMs: number; // trading clock ms
  expiresMs: number; // trading clock ms
}

/** A print on the tape. Ghost prints are the pre-market opening (no traders). */
export interface Print {
  id: string;
  t: number; // trading clock seconds (ghost prints are <= 0)
  price: number;
  ghost?: boolean;
  buyer?: string;
  seller?: string;
  bp?: number; // buyer profit
  sp?: number; // seller profit
  hype?: number; // card shift at trade time
}

export interface RoundSpec {
  index: number;
  phase: 0 | 1;
  kind: Kind;
  ticker: string;
  company: string;
  headline: string;
  nb: number;
  ns: number;
  bLo: number;
  bHi: number;
  sLo: number;
  sHi: number;
  d0: number;
  d1: number;
  s0: number;
  s1: number;
  d2: number;
  s2: number;
  pStar: number;
  k: number; // theoretical k = (d1+s1)/(d2+s2) per minute (hype only, else 0)
  open: number[]; // ghost prices at t = -20, -10, 0
}

export interface Fit {
  rate: number; // per minute: gap ~ e^{rate t}
  A: number; // fitted initial gap
  P: number; // equilibrium used (anchored = p*)
  r2: number;
  n: number;
}

export interface FreeFit extends Fit {}

export interface PredResult {
  id: string;
  guess: number;
  err: number;
  bonus: number;
}

export interface RoundResult {
  close: number;
  vwap: number | null;
  n: number;
  gap0: number;
  gapEnd: number;
  fit: Fit | null; // anchored at p*
  free: FreeFit | null; // free equilibrium
  peak: { gap: number; t: number } | null; // hype: biggest gap reached in the push direction
  burst: number | null; // hype: time the bubble burst back through p*
  preds: PredResult[];
  top: { id: string; profit: number }[];
  best: { id: string; profit: number; price: number } | null;
  grew: boolean; // did |close - p*| end bigger than the opening gap?
}

export interface Proposal {
  id: string;
  from: string;
  to: string;
  price: number;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

// ---------- views sent to clients ----------

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  desk: number;
  role: Role;
  bot: boolean;
  online: boolean;
  profit: number;
  bonus: number;
  total: number;
  trades: number;
  best: number;
  pp: [number, number];
  predErr: number[];
  roundProfit: number;
  rankBefore: number | null;
  predicted: boolean;
}

export interface RoundView {
  spec: RoundSpec;
  prints: Print[];
  clockMs: number;
  running: boolean;
  durationMs: number;
  momentum: number; // smoothed p' ($/min)
  shift: number; // card shift = clamp(beta * p')
  result: RoundResult | null;
}

export interface PastRound {
  spec: RoundSpec;
  prints: Print[];
  result: RoundResult | null;
  durationMs: number;
}

export interface MeView {
  id: string;
  role: Role;
  card: Card | null;
  incoming: Proposal[];
  outgoing: Proposal | null;
  prediction: number | null;
}

export interface View {
  v: number;
  code: string;
  now: number;
  stage: Stage;
  settings: Settings;
  roundIndex: number;
  totalRounds: number;
  finalStep: number;
  players: PublicPlayer[];
  round: RoundView | null;
  history: PastRound[]; // completed rounds (prints included)
  me: MeView | null;
  isHost: boolean;
  practice: boolean; // the current round is the practice round
}

// ---------- protocol ----------

export type HostAction =
  | { action: 'start' }
  | { action: 'bell' }
  | { action: 'end' }
  | { action: 'next' }
  | { action: 'prev' }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'addTime'; seconds: number }
  | { action: 'kick'; id: string }
  | { action: 'bots'; count: number }
  | { action: 'settings'; settings: Partial<Settings> }
  | { action: 'restart' }
  | { action: 'lobby' };

export type ClientMsg =
  | { t: 'hello'; code: string; as: 'host' | 'player' | 'viewer'; token?: string }
  | { t: 'join'; rid: number; name: string; avatar: string }
  | { t: 'propose'; rid: number; to: string; price: number }
  | { t: 'respond'; rid: number; id: string; accept: boolean }
  | { t: 'cancel'; rid: number; id: string }
  | { t: 'predict'; rid: number; value: number }
  | ({ t: 'host'; rid: number } & HostAction)
  | { t: 'ping'; at: number };

export type Fx =
  | { kind: 'trade'; print: Print }
  | { kind: 'proposal'; proposal: Proposal }
  | { kind: 'declined'; id: string; by: string; reason?: string }
  | { kind: 'bell' }
  | { kind: 'close' }
  | { kind: 'join'; id: string }
  | { kind: 'stage'; stage: Stage };

export type ServerMsg =
  | { t: 'state'; view: View }
  | { t: 'ack'; rid: number; ok: boolean; error?: string; data?: unknown }
  | { t: 'fx'; fx: Fx }
  | { t: 'welcome'; as: 'host' | 'player' | 'viewer'; playerId?: string }
  | { t: 'error'; code: 'no-room' | 'bad-token' | 'kicked' | 'full'; message: string }
  | { t: 'pong'; at: number; now: number };
