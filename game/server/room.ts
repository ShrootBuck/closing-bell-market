import {
  AVATARS, COLORS, GHOST_T, cardShift, clamp, closePrice, drawBase, effective, flip, genSpec,
  predictionBonus, profitFor, rawSlope, roleIn, round2,
} from '../shared/market';
import { fitAnchored, fitFree, runawayLeg } from '../shared/fit';
import {
  DEFAULT_SETTINGS,
  type Card, type Fx, type HostAction, type MeView, type PastRound, type Player, type Print,
  type Proposal, type PublicPlayer, type Role, type RoundResult, type RoundSpec, type ServerMsg,
  type Settings, type Stage, type View,
} from '../shared/types';

export interface RoundState {
  spec: RoundSpec;
  prints: Print[];
  result: RoundResult | null;
  elapsedMs: number;
  runningSince: number | null;
  durationMs: number;
  predictions: Record<string, number>;
  roundProfit: Record<string, number>;
  rankBefore: Record<string, number>;
  momentum: number;
}

export interface RoomData {
  code: string;
  hostToken: string;
  createdAt: number;
  updatedAt: number;
  stage: Stage;
  settings: Settings;
  players: Player[];
  tokens: Record<string, string>; // token -> player id
  roundIndex: number;
  rounds: RoundState[];
  proposals: Proposal[];
  cards: Record<string, Card>;
  finalStep: number;
  signStart: 1 | -1;
  deskNext: number;
  seq: number;
  practice?: RoundState | null;
  inPractice?: boolean;
}

export interface Client {
  as: 'host' | 'player' | 'viewer';
  playerId?: string;
  send(msg: ServerMsg): void;
}

export interface Env {
  now(): number;
  rng(): number;
  id(): string;
  persist(room: Room): void;
  flushDelay: number;
}

export class GameError extends Error {}
function fail(msg: string): never {
  throw new GameError(msg);
}

const PROPOSAL_MS = 20000;
const BOT_SLIP = 0.1; // chance a bot quotes past its card (and base chance it takes a losing offer)
const BOT_SLIP_MAX = 4; // most dollars a bot will ever lose on one trade
export const MAX_PLAYERS = 80;

export function newRoomData(code: string, hostToken: string, now: number, rng: () => number): RoomData {
  return {
    code, hostToken, createdAt: now, updatedAt: now, stage: 'lobby',
    settings: { ...DEFAULT_SETTINGS }, players: [], tokens: {}, roundIndex: 0, rounds: [],
    proposals: [], cards: {}, finalStep: 0, signStart: rng() < 0.5 ? 1 : -1, deskNext: 1, seq: 0,
  };
}

export class Room {
  clients = new Set<Client>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private v = 0;
  private botNext = new Map<string, number>();
  private botReplies: { id: string; at: number }[] = [];

  constructor(public d: RoomData, private env: Env) {
    d.settings = { ...DEFAULT_SETTINGS, ...d.settings };
  }

  // ---------- helpers ----------
  get now() {
    return this.env.now();
  }
  get round(): RoundState | null {
    if (!['briefing', 'trading', 'recap'].includes(this.d.stage)) return null;
    return (this.d.inPractice ? this.d.practice : this.d.rounds[this.d.roundIndex]) ?? null;
  }
  get totalRounds() {
    return this.d.settings.roundsPerPhase * 2;
  }
  phaseOfIndex(i: number): 0 | 1 {
    return i < this.d.settings.roundsPerPhase ? 0 : 1;
  }
  get phase(): 0 | 1 {
    if (this.d.stage === 'swap') return 1;
    if (this.d.stage === 'final') return 1;
    if (this.d.stage === 'lobby' || this.d.stage === 'howto' || this.d.inPractice) return 0;
    return this.phaseOfIndex(this.d.roundIndex);
  }
  active() {
    return this.d.players.filter((p) => !p.kicked);
  }
  player(id: string) {
    return this.d.players.find((p) => p.id === id && !p.kicked);
  }
  roleOf(p: Player): Role {
    return roleIn(p.role0, this.phase);
  }
  clockMs(r = this.round) {
    if (!r) return 0;
    return r.elapsedMs + (r.runningSince != null ? this.now - r.runningSince : 0);
  }
  get running() {
    return this.d.stage === 'trading' && this.round?.runningSince != null;
  }
  shift(r = this.round) {
    if (!r) return 0;
    return cardShift(r.spec.kind, this.d.settings.hype, r.momentum);
  }
  limitOf(id: string) {
    const c = this.d.cards[id];
    return c ? effective(c.base, this.shift()) : null;
  }
  online(id: string) {
    for (const c of this.clients) if (c.playerId === id) return true;
    return false;
  }
  total(p: Player) {
    return round2(p.profit + p.bonus);
  }
  ranks(): Record<string, number> {
    const list = this.active();
    if (list.every((p) => this.total(p) === 0)) return {}; // all tied at $0: no meaningful rank yet
    const totals = list.map((p) => this.total(p));
    return Object.fromEntries(list.map((p) => [p.id, 1 + totals.filter((t) => t > this.total(p)).length]));
  }

  touch() {
    this.d.updatedAt = this.now;
    this.env.persist(this);
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), this.env.flushDelay);
  }

  fx(fx: Fx, to?: string[]) {
    for (const c of this.clients) {
      if (!to || c.as !== 'player' || (c.playerId && to.includes(c.playerId))) c.send({ t: 'fx', fx });
    }
  }

  // ---------- players ----------
  join(name: string, avatar: string): { id: string; token: string } {
    name = name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
    if (!name) fail('Pick a name first.');
    if (this.active().length >= MAX_PLAYERS) fail('This floor is full.');
    let finalName = name;
    for (let i = 2; this.active().some((p) => p.name.toLowerCase() === finalName.toLowerCase()); i++)
      finalName = `${name.slice(0, 13)} ${i}`;
    const id = this.env.id().slice(0, 8);
    const token = this.env.id() + this.env.id();
    const taken = new Set(this.active().map((p) => p.color));
    const color = COLORS.find((c) => !taken.has(c)) ?? COLORS[Math.floor(this.env.rng() * COLORS.length)];
    const p: Player = {
      id, name: finalName, avatar: AVATARS.includes(avatar) || avatar === '🤖' ? avatar : AVATARS[0], color,
      desk: this.d.deskNext++, role0: 'buyer', joinedAt: this.now, profit: 0, bonus: 0, trades: 0,
      best: 0, pp: [0, 0], predErr: [],
    };
    if (this.d.stage !== 'lobby') {
      const counts = this.roleCounts();
      const want: Role = counts.buyer <= counts.seller ? 'buyer' : 'seller';
      p.role0 = this.phase === 0 ? want : flip(want);
    }
    this.d.players.push(p);
    this.d.tokens[token] = id;
    if (this.d.stage === 'trading') this.dealCard(p);
    this.fx({ kind: 'join', id });
    this.touch();
    return { id, token };
  }

  roleCounts() {
    const c = { buyer: 0, seller: 0 };
    for (const p of this.active()) c[this.roleOf(p)]++;
    return c;
  }

  // ---------- stage machine ----------
  start() {
    if (this.d.stage !== 'lobby') fail('Already started.');
    const list = this.active();
    if (list.length < 2) fail('Need at least 2 traders.');
    const humans = list.filter((p) => !p.bot);
    const bots = list.filter((p) => p.bot);
    const shuffle = <T,>(a: T[]) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.env.rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    // alternate humans first so humans are balanced, then bots fill the gap
    const order = [...shuffle(humans), ...shuffle(bots)];
    let b = 0;
    let s = 0;
    for (const p of order) {
      p.role0 = b <= s ? 'buyer' : 'seller';
      if (p.role0 === 'buyer') b++;
      else s++;
    }
    this.d.roundIndex = 0;
    this.d.rounds = [];
    this.d.practice = null;
    this.d.inPractice = false;
    this.d.stage = 'howto';
    this.fx({ kind: 'stage', stage: 'howto' });
  }

  startPractice() {
    let nb = 0;
    let ns = 0;
    for (const p of this.active()) this.roleOf(p) === 'buyer' ? nb++ : ns++;
    const spec = genSpec({ index: -1, phase: 0, kind: 'stable', nb, ns, hype: this.d.settings.hype, sign: 1, rng: this.env.rng, used: [] });
    spec.ticker = 'TEST';
    spec.company = 'Practice Holdings Inc.';
    spec.headline = 'Practice round. Nothing counts. Just make one deal!';
    spec.open = [spec.pStar, spec.pStar, spec.pStar];
    this.d.practice = this.newRoundState(spec, 45000);
    this.d.inPractice = true;
    this.d.stage = 'briefing';
    this.bell();
  }

  newRoundState(spec: RoundSpec, durationMs: number): RoundState {
    return {
      spec, prints: [], result: null, elapsedMs: 0, runningSince: null, durationMs,
      predictions: {}, roundProfit: {}, rankBefore: this.ranks(), momentum: 0,
    };
  }

  createRound(i: number) {
    const phase = this.phaseOfIndex(i);
    const kind = phase === 0 ? 'stable' : 'hype';
    let nb = 0;
    let ns = 0;
    for (const p of this.active()) {
      if (roleIn(p.role0, phase) === 'buyer') nb++;
      else ns++;
    }
    const within = phase === 0 ? i : i - this.d.settings.roundsPerPhase;
    const sign = (this.d.signStart * (within % 2 === 0 ? 1 : -1) * (phase === 1 ? -1 : 1)) as 1 | -1;
    const spec = genSpec({
      index: i, phase, kind, nb, ns, hype: this.d.settings.hype, sign, rng: this.env.rng,
      used: this.d.rounds.map((r) => r.spec.ticker),
    });
    this.d.rounds[i] = this.newRoundState(spec, this.d.settings.roundSeconds * 1000);
  }

  bell() {
    const r = this.round;
    if (this.d.stage !== 'briefing' || !r) fail('Not in a briefing.');
    r.prints = r.spec.open.map((price, i) => ({ id: `g${i}`, t: GHOST_T[i], price, ghost: true }));
    r.elapsedMs = 0;
    r.runningSince = this.now;
    r.momentum = rawSlope(r.prints, 0);
    r.rankBefore = this.ranks();
    this.d.stage = 'trading';
    this.d.cards = {};
    this.d.proposals = [];
    for (const p of this.active()) this.dealCard(p);
    this.fx({ kind: 'bell' });
  }

  dealCard(p: Player) {
    const r = this.round;
    if (!r) return;
    const t = this.clockMs(r);
    const life = this.d.settings.cardSeconds * 1000;
    this.d.cards[p.id] = {
      id: this.env.id().slice(0, 6),
      base: drawBase(r.spec, this.roleOf(p), this.env.rng),
      issuedMs: t,
      expiresMs: t + life * (0.85 + this.env.rng() * 0.3),
    };
    this.dropProposalsOf(p.id, 'New card dealt');
  }

  dropProposalsOf(id: string, reason: string) {
    const keep: Proposal[] = [];
    for (const pr of this.d.proposals) {
      if (pr.from === id || pr.to === id) {
        if (pr.to === id && pr.from !== id) this.fx({ kind: 'declined', id: pr.id, by: id, reason }, [pr.from]);
        else if (pr.from === id) this.fx({ kind: 'declined', id: pr.id, by: id, reason: 'withdrawn' }, [pr.to]);
      } else keep.push(pr);
    }
    this.d.proposals = keep;
  }

  endRound() {
    const r = this.round;
    if (this.d.stage !== 'trading' || !r) fail('Not trading.');
    r.elapsedMs = r.durationMs;
    r.runningSince = null;
    const durS = r.durationMs / 1000;
    const real = r.prints.filter((p) => !p.ghost);
    const close = closePrice(r.prints, durS);
    const pStar = r.spec.pStar;
    const leg = runawayLeg(r.prints, pStar);
    const gap0 = r.spec.open[r.spec.open.length - 1] - pStar;
    const grew = Math.abs(close - pStar) > Math.abs(gap0);
    const choice = this.d.settings.predictMode === 'choice';
    const preds = Object.entries(this.d.inPractice ? {} : r.predictions)
      .filter(([id]) => this.player(id))
      .map(([id, guess]) => {
        const right = (guess > 0) === grew;
        const err = choice ? (right ? 0 : 1) : round2(Math.abs(guess - close));
        const bonus = choice ? (right ? this.d.settings.predictBonus : 0) : predictionBonus(this.d.settings.predictBonus, err);
        const p = this.player(id)!;
        p.bonus = round2(p.bonus + bonus);
        p.predErr.push(err);
        return { id, guess, err, bonus };
      })
      .sort((a, b) => a.err - b.err);
    let best: RoundResult['best'] = null;
    for (const pr of real) {
      for (const [id, prof] of [[pr.buyer, pr.bp], [pr.seller, pr.sp]] as const) {
        if (id && prof != null && (!best || prof > best.profit)) best = { id, profit: prof, price: pr.price };
      }
    }
    r.result = {
      close,
      vwap: real.length ? round2(real.reduce((a, p) => a + p.price, 0) / real.length) : null,
      n: real.length,
      gap0: round2(r.spec.open[r.spec.open.length - 1] - pStar),
      gapEnd: round2(close - pStar),
      fit: real.length >= 3 ? fitAnchored(r.spec.kind === 'hype' ? leg.leg : r.prints, pStar) : null,
      free: r.spec.kind === 'stable' && real.length >= 4 ? fitFree(r.prints) : null,
      peak: r.spec.kind === 'hype' ? leg.peak : null,
      burst: r.spec.kind === 'hype' ? leg.burst : null,
      preds,
      top: Object.entries(r.roundProfit)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, profit]) => ({ id, profit })),
      best,
      grew,
    };
    this.d.proposals = [];
    this.d.cards = {};
    this.botReplies = [];
    this.d.stage = 'recap';
    this.fx({ kind: 'close' });
  }

  next() {
    switch (this.d.stage) {
      case 'lobby':
        return this.start();
      case 'howto':
        if (this.d.settings.practice) return this.startPractice();
        this.createRound(0);
        this.d.stage = 'briefing';
        this.fx({ kind: 'stage', stage: 'briefing' });
        return;
      case 'briefing':
        return this.bell();
      case 'trading':
        return this.endRound();
      case 'recap': {
        if (this.d.inPractice) {
          this.d.inPractice = false;
          this.d.roundIndex = 0;
          this.createRound(0);
          this.d.stage = 'briefing';
          this.fx({ kind: 'stage', stage: 'briefing' });
          return;
        }
        const n = this.d.roundIndex + 1;
        if (n >= this.totalRounds) {
          this.d.stage = 'final';
          this.d.finalStep = 0;
        } else if (n === this.d.settings.roundsPerPhase) {
          this.d.stage = 'swap';
        } else {
          this.d.roundIndex = n;
          this.createRound(n);
          this.d.stage = 'briefing';
        }
        this.fx({ kind: 'stage', stage: this.d.stage });
        return;
      }
      case 'swap':
        this.d.roundIndex += 1;
        this.createRound(this.d.roundIndex);
        this.d.stage = 'briefing';
        this.fx({ kind: 'stage', stage: 'briefing' });
        return;
      case 'final':
        this.d.finalStep = Math.min(this.d.finalStep + 1, 3);
        return;
    }
  }

  host(a: HostAction) {
    const r = this.round;
    switch (a.action) {
      case 'start':
        this.start();
        break;
      case 'bell':
        this.bell();
        break;
      case 'end':
        this.endRound();
        break;
      case 'next':
        this.next();
        break;
      case 'prev':
        if (this.d.stage === 'final') this.d.finalStep = Math.max(0, this.d.finalStep - 1);
        break;
      case 'pause':
        if (this.d.stage === 'trading' && r && r.runningSince != null) {
          r.elapsedMs = this.clockMs(r);
          r.runningSince = null;
        }
        break;
      case 'resume':
        if (this.d.stage === 'trading' && r && r.runningSince == null) r.runningSince = this.now;
        break;
      case 'addTime':
        if (this.d.stage === 'trading' && r) r.durationMs = Math.max(this.clockMs(r) + 5000, r.durationMs + clamp(a.seconds, -120, 300) * 1000);
        break;
      case 'kick': {
        const p = this.player(a.id);
        if (!p) break;
        p.kicked = true;
        delete this.d.cards[p.id];
        this.dropProposalsOf(p.id, 'Trader left');
        for (const c of this.clients) if (c.playerId === p.id) c.send({ t: 'error', code: 'kicked', message: 'The host removed you from this floor.' });
        break;
      }
      case 'bots':
        this.setBots(clamp(Math.round(a.count), 0, 40));
        break;
      case 'settings': {
        if (this.d.stage !== 'lobby') fail('Settings lock once the game starts.');
        const s = a.settings;
        const S = this.d.settings;
        if (s.roundsPerPhase != null) S.roundsPerPhase = clamp(Math.round(s.roundsPerPhase), 1, 5);
        if (s.roundSeconds != null) S.roundSeconds = clamp(Math.round(s.roundSeconds), 30, 600);
        if (s.cardSeconds != null) S.cardSeconds = clamp(Math.round(s.cardSeconds), 10, 120);
        if (s.hype != null) S.hype = clamp(round2(s.hype), 0.25, 4);
        if (s.predictBonus != null) S.predictBonus = clamp(Math.round(s.predictBonus), 0, 200);
        if (s.practice != null) S.practice = !!s.practice;
        if (s.predictMode === 'choice' || s.predictMode === 'number') S.predictMode = s.predictMode;
        break;
      }
      case 'restart':
      case 'lobby':
        for (const p of this.d.players) {
          p.profit = 0; p.bonus = 0; p.trades = 0; p.best = 0; p.pp = [0, 0]; p.predErr = [];
        }
        this.d.rounds = [];
        this.d.roundIndex = 0;
        this.d.practice = null;
        this.d.inPractice = false;
        this.d.cards = {};
        this.d.proposals = [];
        this.d.finalStep = 0;
        this.d.stage = 'lobby';
        this.fx({ kind: 'stage', stage: 'lobby' });
        break;
    }
    this.touch();
  }

  setBots(count: number) {
    const bots = this.active().filter((p) => p.bot);
    if (bots.length < count) {
      for (let i = bots.length; i < count; i++) {
        const { id } = this.join(`Algo-${String(this.d.deskNext).padStart(2, '0')}`, '🤖');
        this.player(id)!.bot = true;
      }
    } else {
      for (const b of bots.slice(count)) {
        b.kicked = true;
        delete this.d.cards[b.id];
        this.dropProposalsOf(b.id, 'Bot unplugged');
      }
    }
  }

  // ---------- trading ----------
  propose(from: string, to: string, priceIn: number) {
    const r = this.round;
    if (this.d.stage !== 'trading' || !r) fail('The market is closed.');
    if (r.runningSince == null) fail('Trading is halted.');
    const price = round2(Number(priceIn));
    if (!Number.isFinite(price) || price < 1 || price > 9999) fail('Enter a real price.');
    const a = this.player(from);
    const b = this.player(to);
    if (!a || !b) fail('That trader is gone.');
    if (a!.id === b!.id) fail("You can't trade with yourself. Nice try.");
    const ra = this.roleOf(a!);
    if (ra === this.roleOf(b!)) fail(`${b!.name} is also a ${ra}. Find a ${flip(ra)}!`);
    const lim = this.limitOf(a!.id);
    if (lim == null) fail('Waiting for your card.');
    // Losing trades are allowed: the phone warns in red, but it's the trader's call.
    // replace any outgoing offer
    for (const pr of this.d.proposals.filter((x) => x.from === from))
      this.fx({ kind: 'declined', id: pr.id, by: from, reason: 'withdrawn' }, [pr.to]);
    this.d.proposals = this.d.proposals.filter((x) => x.from !== from);
    const prop: Proposal = {
      id: this.env.id().slice(0, 8), from, to, price, createdAt: this.now, expiresAt: this.now + PROPOSAL_MS,
    };
    this.d.proposals.push(prop);
    this.fx({ kind: 'proposal', proposal: prop }, [to]);
    if (b!.bot) this.botReplies.push({ id: prop.id, at: this.now + 600 + this.env.rng() * 1600 });
    this.touch();
    return prop;
  }

  respond(by: string, id: string, accept: boolean) {
    const pr = this.d.proposals.find((x) => x.id === id);
    if (!pr || pr.to !== by) fail('That offer expired.');
    this.d.proposals = this.d.proposals.filter((x) => x.id !== id);
    if (!accept) {
      this.fx({ kind: 'declined', id, by, reason: 'declined' }, [pr!.from]);
      this.touch();
      return null;
    }
    const r = this.round;
    try {
      if (this.d.stage !== 'trading' || !r) fail('The market is closed.');
      if (r!.runningSince == null) fail('Trading is halted.');
      const a = this.player(pr!.from);
      const b = this.player(pr!.to);
      if (!a || !b) fail('That trader left.');
      const buyer = this.roleOf(a!) === 'buyer' ? a! : b!;
      const seller = buyer === a ? b! : a!;
      if (this.roleOf(buyer) === this.roleOf(seller)) fail('Roles changed — deal off.');
      const lb = this.limitOf(buyer.id);
      const ls = this.limitOf(seller.id);
      if (lb == null || ls == null) fail('A card just expired — deal off.');
      const bp = profitFor('buyer', lb!, pr!.price);
      const sp = profitFor('seller', ls!, pr!.price);
      const t = round2(this.clockMs(r!) / 1000);
      const print: Print = {
        id: this.env.id().slice(0, 8), t, price: pr!.price, buyer: buyer.id, seller: seller.id, bp, sp, hype: this.shift(r!),
      };
      r!.prints.push(print);
      const ph = r!.spec.phase;
      for (const [p, prof] of [[buyer, bp], [seller, sp]] as const) {
        if (!this.d.inPractice) {
          p.profit = round2(p.profit + prof);
          p.trades += 1;
          p.best = Math.max(p.best, prof);
          p.pp[ph] = round2(p.pp[ph] + prof);
        }
        r!.roundProfit[p.id] = round2((r!.roundProfit[p.id] ?? 0) + prof);
      }
      this.dealCard(buyer);
      this.dealCard(seller);
      this.fx({ kind: 'trade', print });
      this.touch();
      return print;
    } catch (e) {
      this.fx({ kind: 'declined', id, by, reason: e instanceof Error ? e.message : 'failed' }, [pr!.from]);
      this.touch();
      throw e;
    }
  }

  cancel(by: string, id: string) {
    const pr = this.d.proposals.find((x) => x.id === id && x.from === by);
    if (!pr) return;
    this.d.proposals = this.d.proposals.filter((x) => x.id !== id);
    this.fx({ kind: 'declined', id, by, reason: 'withdrawn' }, [pr.to]);
    this.touch();
  }

  predict(by: string, value: number) {
    const r = this.round;
    if (this.d.stage !== 'briefing' || !r || this.d.inPractice) fail('Predictions are locked.');
    const v = round2(Number(value));
    if (this.d.settings.predictMode === 'choice' && v !== 1 && v !== -1) fail('Pick shrink or grow.');
    if (!Number.isFinite(v) || v < -1 || v > 9999) fail('Enter a real price.');
    r.predictions[by] = v;
    this.touch();
  }

  // ---------- clock ----------
  tick(dtMs: number) {
    const r = this.round;
    const now = this.now;
    let changed = false;
    if (this.d.proposals.length) {
      const live = this.d.proposals.filter((p) => p.expiresAt > now);
      if (live.length !== this.d.proposals.length) {
        for (const p of this.d.proposals)
          if (p.expiresAt <= now) this.fx({ kind: 'declined', id: p.id, by: p.to, reason: 'expired' }, [p.from, p.to]);
        this.d.proposals = live;
        changed = true;
      }
    }
    if (this.d.stage === 'trading' && r && r.runningSince != null) {
      const t = this.clockMs(r);
      for (const p of this.active()) {
        const c = this.d.cards[p.id];
        if (!c || c.expiresMs <= t) {
          this.dealCard(p);
          changed = true;
        }
      }
      if (r.spec.kind === 'hype') {
        const raw = rawSlope(r.prints, t / 1000);
        const before = this.shift(r);
        const alpha = 1 - Math.exp(-dtMs / 1500);
        r.momentum = round2(r.momentum + alpha * (raw - r.momentum));
        if (Math.abs(this.shift(r) - before) >= 0.01) changed = true;
      }
      this.runBots(now);
      if (t >= r.durationMs) {
        this.endRound();
        changed = true;
      }
    }
    if (changed) this.touch();
  }

  // ---------- bots ----------
  // Bots are mostly rational, but sometimes take a losing deal. The chance fades
  // as the loss grows and is zero past BOT_SLIP_MAX, so nobody can farm them.
  private botSlips(loss: number) {
    return loss <= BOT_SLIP_MAX && this.env.rng() < BOT_SLIP * (1 - loss / (BOT_SLIP_MAX + 1)) * 2;
  }

  private runBots(now: number) {
    // replies
    const due = this.botReplies.filter((x) => x.at <= now);
    if (due.length) {
      this.botReplies = this.botReplies.filter((x) => x.at > now);
      for (const { id } of due) {
        const pr = this.d.proposals.find((x) => x.id === id);
        if (!pr) continue;
        const bot = this.player(pr.to);
        if (!bot) continue;
        const lim = this.limitOf(bot.id);
        const profit = lim == null ? null : profitFor(this.roleOf(bot), lim, pr.price);
        const ok = profit != null && (profit >= 0 ? this.env.rng() < 0.92 : this.botSlips(-profit));
        try {
          this.respond(bot.id, id, ok);
        } catch {
          /* deal off */
        }
      }
    }
    const r = this.round!;
    const bots = this.active().filter((p) => p.bot);
    if (!bots.length) return;
    const last = r.prints[r.prints.length - 1]?.price ?? r.spec.pStar;
    for (const bot of bots) {
      const at = this.botNext.get(bot.id) ?? now + this.env.rng() * 2500;
      if (!this.botNext.has(bot.id)) this.botNext.set(bot.id, at);
      if (at > now) continue;
      this.botNext.set(bot.id, now + 800 + this.env.rng() * 2200);
      if (this.d.proposals.some((p) => p.from === bot.id)) continue;
      const role = this.roleOf(bot);
      const partners = bots.filter((b) => this.roleOf(b) !== role && !this.d.proposals.some((p) => p.to === b.id));
      if (!partners.length) continue;
      const partner = partners[Math.floor(this.env.rng() * partners.length)];
      const lim = this.limitOf(bot.id);
      if (lim == null) continue;
      const u = this.env.rng();
      // now and then a bot fat-fingers its quote past its own card
      const slip = this.env.rng() < BOT_SLIP ? 1 + Math.floor(this.env.rng() * BOT_SLIP_MAX) : 0;
      const price = role === 'buyer'
        ? Math.floor(Math.min(lim + slip, last - 3 + u * 4.5 + slip))
        : Math.ceil(Math.max(lim - slip, last - 1.5 + u * 4.5 - slip));
      if (price < 1) continue;
      try {
        this.propose(bot.id, partner.id, price);
      } catch {
        /* irrational, skip */
      }
    }
  }

  // ---------- views ----------
  flush() {
    this.flushTimer = null;
    this.v++;
    let shared: View | null = null;
    for (const c of this.clients) {
      if (c.as === 'player' && c.playerId) c.send({ t: 'state', view: this.view(c.playerId) });
      else c.send({ t: 'state', view: (shared ??= this.view(null, c.as === 'host')) });
    }
  }

  view(playerId: string | null, isHost = false): View {
    const r = this.round;
    const ranks = r?.rankBefore ?? {};
    const players: PublicPlayer[] = this.active().map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, color: p.color, desk: p.desk, role: this.roleOf(p),
      bot: !!p.bot, online: !!p.bot || this.online(p.id), profit: p.profit, bonus: p.bonus, total: this.total(p),
      trades: p.trades, best: p.best, pp: p.pp, predErr: p.predErr,
      roundProfit: r?.roundProfit[p.id] ?? 0, rankBefore: ranks[p.id] ?? null,
      predicted: r ? p.id in r.predictions : false,
    }));
    let me: MeView | null = null;
    if (playerId) {
      const p = this.player(playerId);
      if (p)
        me = {
          id: p.id, role: this.roleOf(p), card: this.d.cards[p.id] ?? null,
          incoming: this.d.proposals.filter((x) => x.to === p.id),
          outgoing: this.d.proposals.find((x) => x.from === p.id) ?? null,
          prediction: r?.predictions[p.id] ?? null,
        };
    }
    const done = this.d.rounds.filter((x, i) => x.result && (i < this.d.roundIndex || this.d.stage === 'final' || this.d.stage === 'swap'));
    const history: PastRound[] = playerId
      ? done.map((x) => ({ spec: x.spec, prints: [], result: x.result, durationMs: x.durationMs }))
      : done.map((x) => ({ spec: x.spec, prints: x.prints, result: x.result, durationMs: x.durationMs }));
    return {
      v: this.v, code: this.d.code, now: this.now, stage: this.d.stage, settings: this.d.settings,
      roundIndex: this.d.roundIndex, totalRounds: this.totalRounds, finalStep: this.d.finalStep, players,
      round: r
        ? {
            spec: r.spec, prints: r.prints, clockMs: this.clockMs(r), running: r.runningSince != null,
            durationMs: r.durationMs, momentum: r.momentum, shift: this.shift(r), result: r.result,
          }
        : null,
      history, me, isHost, practice: !!this.d.inPractice,
    };
  }
}
