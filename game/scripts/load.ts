// Load test: N WebSocket "students" join a fresh room, the host runs a round, everyone trades rationally.
import WebSocket from 'ws';
const BASE = process.argv[2] ?? 'http://localhost:3000';
const N = Number(process.argv[3] ?? 20);
const SECS = Number(process.argv[4] ?? 30);
const wsUrl = BASE.replace(/^http/, 'ws') + '/ws';

type Msg = any;
function client(code: string, as: string, token?: string) {
  const ws = new WebSocket(wsUrl);
  let rid = 1;
  const waits = new Map<number, (m: Msg) => void>();
  const c = {
    ws, view: null as any, acks: 0, errors: 0,
    send(m: Msg) {
      const id = rid++;
      ws.send(JSON.stringify({ ...m, rid: id }));
      return new Promise<Msg>((res) => waits.set(id, res));
    },
  };
  ws.on('message', (raw) => {
    const m = JSON.parse(String(raw));
    if (m.t === 'state') c.view = m.view;
    if (m.t === 'ack') { const w = waits.get(m.rid); waits.delete(m.rid); m.ok ? c.acks++ : c.errors++; w?.(m); }
  });
  return new Promise<typeof c>((res) => ws.on('open', () => { ws.send(JSON.stringify({ t: 'hello', code, as, token })); res(c); }));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const { code, token } = await (await fetch(BASE + '/api/rooms', { method: 'POST' })).json();
const host = await client(code, 'host', token);
const players = await Promise.all(Array.from({ length: N }, () => client(code, 'player')));
await Promise.all(players.map((p, i) => p.send({ t: 'join', name: `Kid${i}`, avatar: '🐂' })));
await host.send({ t: 'host', action: 'settings', settings: { roundSeconds: SECS } });
await host.send({ t: 'host', action: 'start' });
await sleep(300);
await Promise.all(players.map((p) => p.send({ t: 'predict', value: 50 })));
await host.send({ t: 'host', action: 'bell' });
const t0 = Date.now();
let lat: number[] = [];
while (Date.now() - t0 < SECS * 1000 - 500) {
  await Promise.all(players.map(async (p) => {
    const v = p.view; const me = v?.me; if (!me?.card || !v.round) return;
    const lim = me.card.base + v.round.shift;
    for (const inc of me.incoming) {
      const ok = me.role === 'buyer' ? inc.price <= lim : inc.price >= lim;
      const s = Date.now(); await p.send({ t: 'respond', id: inc.id, accept: ok }); lat.push(Date.now() - s);
    }
    if (!me.outgoing && Math.random() < 0.5) {
      const others = v.players.filter((x: any) => x.role !== me.role);
      const o = others[Math.floor(Math.random() * others.length)];
      const last = v.round.prints.at(-1)?.price ?? 50;
      const price = Math.round(me.role === 'buyer' ? Math.min(lim, last + Math.random() * 4 - 3) : Math.max(lim, last + Math.random() * 4 - 1));
      const s = Date.now(); await p.send({ t: 'propose', to: o.id, price }); lat.push(Date.now() - s);
    }
  }));
  await sleep(300);
}
await sleep(1500);
lat.sort((a, b) => a - b);
const v = host.view;
console.log(`room ${code}: stage=${v.stage} trades=${v.round?.result?.n} close=${v.round?.result?.close} p*=${v.round?.spec.pStar}`);
console.log(`requests=${lat.length} p50=${lat[Math.floor(lat.length / 2)]}ms p95=${lat[Math.floor(lat.length * 0.95)]}ms max=${lat.at(-1)}ms`);
console.log(`acks ok=${players.reduce((a, p) => a + p.acks, 0)} rejected=${players.reduce((a, p) => a + p.errors, 0)} (rejections = irrational/expired offers, expected)`);
const sum = v.players.reduce((a: number, p: any) => a + p.profit, 0);
console.log(`players=${v.players.length} total profit=${sum.toFixed(2)} all-nonneg-trades=${(v.round.prints as any[]).filter(x=>!x.ghost).every((x)=>x.bp>=0&&x.sp>=0)}`);
process.exit(0);
