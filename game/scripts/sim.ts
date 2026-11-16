// Simulates a full game with bots on a virtual clock and prints per-round dynamics.
import { Room, newRoomData, type Env } from '../server/room';

let t = 1_700_000_000_000;
let seed = Number(process.argv[2] ?? 7);
const rng = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};
let n = 0;
const env: Env = { now: () => t, rng, id: () => Math.floor(rng() * 2 ** 32).toString(16).padStart(8, '0') + (++n).toString(16).padStart(8, '0'), persist: () => {}, flushDelay: 1e9 };
const room = new Room(newRoomData('12345', 'tok', t, rng), env);
const bots = Number(process.argv[3] ?? 16);
room.host({ action: 'bots', count: bots });
room.host({ action: 'settings', settings: { practice: false } });
room.host({ action: 'start' });
room.host({ action: 'next' });

for (let i = 0; i < room.totalRounds; i++) {
  if (room.d.stage === 'swap') room.host({ action: 'next' });
  if (room.d.stage !== 'briefing') room.host({ action: 'next' });
  room.host({ action: 'bell' });
  while (room.d.stage === 'trading') {
    t += 250;
    room.tick(250);
  }
  const r = room.d.rounds[i];
  const res = r.result!;
  const real = r.prints.filter((p) => !p.ghost);
  const buckets = [0, 20, 40, 60, 80, 100].map((s) => {
    const b = real.filter((p) => p.t >= s && p.t < s + 20);
    return b.length ? (b.reduce((a, p) => a + p.price, 0) / b.length - r.spec.pStar).toFixed(1) : '  -';
  });
  console.log(
    `R${i + 1} ${r.spec.kind.padEnd(6)} p*=${r.spec.pStar.toFixed(2)} gap0=${res.gap0.toFixed(1)} gapEnd=${res.gapEnd.toFixed(1)} n=${res.n}`,
    `| gap by 20s: ${buckets.join(' ')}`,
    `| fit r=${res.fit?.rate.toFixed(2)} R2=${res.fit?.r2.toFixed(2)}`,
    res.free ? `| free P=${res.free.P.toFixed(1)} r=${res.free.rate.toFixed(2)}` : `| peak ${res.peak?.gap.toFixed(1)}@${res.peak?.t.toFixed(0)}s burst ${res.burst?.toFixed(0)}`,
  );
  room.host({ action: 'next' });
}
const top = room.active().sort((a, b) => b.profit - a.profit);
console.log('top', top.slice(0, 3).map((p) => `${p.name} ${p.profit.toFixed(0)}`).join(', '), 'stage', room.d.stage);
process.exit(0);
