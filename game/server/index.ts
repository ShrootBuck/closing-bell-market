import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { GameError, Room, newRoomData, type Client, type Env, type RoomData } from './room';
import type { ClientMsg, ServerMsg } from '../shared/types';

const PORT = Number(process.env.PORT ?? 3000);
const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(process.env.PUBLIC_DIR ?? join(here, 'public'));
const DATA = resolve(process.env.DATA_DIR ?? join(here, '..', 'data'));
const ROOM_TTL = 1000 * 60 * 60 * 48;

mkdirSync(DATA, { recursive: true });

// ---------- persistence ----------
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function saveNow(room: Room) {
  pending.delete(room.d.code);
  const file = join(DATA, `${room.d.code}.json`);
  try {
    writeFileSync(file + '.tmp', JSON.stringify(room.d));
    renameSync(file + '.tmp', file);
  } catch (e) {
    console.error('save failed', room.d.code, e);
  }
}
const env: Env = {
  now: () => Date.now(),
  rng: () => randomInt(0, 2 ** 31) / 2 ** 31,
  id: () => randomUUID().replace(/-/g, ''),
  flushDelay: 50,
  persist(room) {
    if (pending.has(room.d.code)) return;
    pending.set(room.d.code, setTimeout(() => saveNow(room), 400));
  },
};

const rooms = new Map<string, Room>();
for (const f of readdirSync(DATA)) {
  if (!f.endsWith('.json')) continue;
  try {
    const d = JSON.parse(readFileSync(join(DATA, f), 'utf8')) as RoomData;
    if (Date.now() - d.updatedAt > ROOM_TTL) {
      unlinkSync(join(DATA, f));
      continue;
    }
    rooms.set(d.code, new Room(d, env));
  } catch (e) {
    console.error('could not load', f, e);
  }
}
console.log(`restored ${rooms.size} room(s) from ${DATA}`);

function flushAll() {
  for (const [code, t] of pending) {
    clearTimeout(t);
    const r = rooms.get(code);
    if (r) saveNow(r);
  }
}
for (const sig of ['SIGTERM', 'SIGINT'] as const)
  process.on(sig, () => {
    flushAll();
    process.exit(0);
  });

function createRoom() {
  let code: string;
  do code = String(randomInt(10000, 100000));
  while (rooms.has(code));
  const token = randomBytes(18).toString('base64url');
  const room = new Room(newRoomData(code, token, Date.now(), env.rng), env);
  rooms.set(code, room);
  room.touch();
  return { code, token };
}

// ---------- clock ----------
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = now - lastTick;
  lastTick = now;
  for (const room of rooms.values()) {
    try {
      room.tick(dt);
    } catch (e) {
      console.error('tick', room.d.code, e);
    }
  }
}, 250);
setInterval(() => {
  for (const [code, room] of rooms) {
    if (Date.now() - room.d.updatedAt > ROOM_TTL && room.clients.size === 0) {
      rooms.delete(code);
      try {
        unlinkSync(join(DATA, `${code}.json`));
      } catch {}
    }
  }
}, 60_000);

// ---------- http ----------
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf',
  '.map': 'application/json', '.txt': 'text/plain',
};

function sendFile(res: ServerResponse, file: string, cache: boolean) {
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': cache ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

function json(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = decodeURIComponent(url.pathname);
  if (path === '/healthz') return json(res, 200, { ok: true, rooms: rooms.size });
  if (path === '/api/rooms' && req.method === 'POST') return json(res, 200, createRoom());
  const m = path.match(/^\/api\/rooms\/(\d{5})$/);
  if (m) {
    const room = rooms.get(m[1]);
    return room ? json(res, 200, { code: room.d.code, stage: room.d.stage }) : json(res, 404, { error: 'No floor with that PIN.' });
  }
  if (path === '/talk' || path === '/talk/') {
    res.writeHead(302, { location: '/talk/index.html' });
    return res.end();
  }
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC, safe);
  if (file.startsWith(PUBLIC) && existsSync(file) && statSync(file).isFile())
    return sendFile(res, file, safe.startsWith('/assets/'));
  if (path.startsWith('/talk/') || path.startsWith('/assets/') || extname(path)) {
    // Never let a CDN cache a 404: during a rolling deploy a new page can briefly ask an old container for new assets.
    res.writeHead(404, { 'cache-control': 'no-store' });
    return res.end('not found');
  }
  const index = join(PUBLIC, 'index.html');
  if (existsSync(index)) return sendFile(res, index, false);
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('Closing Bell server is running. Build the client with `npm run build`.');
});

// ---------- websockets ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

wss.on('connection', (ws: WebSocket) => {
  let room: Room | null = null;
  let client: Client | null = null;
  (ws as WebSocket & { alive?: boolean }).alive = true;
  ws.on('pong', () => ((ws as WebSocket & { alive?: boolean }).alive = true));
  const send = (msg: ServerMsg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };
  const ack = (rid: number, ok: boolean, error?: string, data?: unknown) => send({ t: 'ack', rid, ok, error, data });

  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg.t === 'ping') return send({ t: 'pong', at: msg.at, now: Date.now() });
    if (msg.t === 'hello') {
      if (client && room) room.clients.delete(client);
      room = rooms.get(String(msg.code)) ?? null;
      if (!room) return send({ t: 'error', code: 'no-room', message: 'No floor with that PIN. It may have closed.' });
      if (msg.as === 'host' && msg.token !== room.d.hostToken)
        return send({ t: 'error', code: 'bad-token', message: 'This device is not the host of that floor.' });
      let playerId: string | undefined;
      if (msg.as === 'player' && msg.token) {
        playerId = room.d.tokens[msg.token];
        const p = playerId ? room.d.players.find((x) => x.id === playerId) : undefined;
        if (!p) playerId = undefined;
        else if (p.kicked) return send({ t: 'error', code: 'kicked', message: 'The host removed you from this floor.' });
      }
      client = { as: msg.as, playerId, send };
      room.clients.add(client);
      send({ t: 'welcome', as: msg.as, playerId });
      room.touch();
      return;
    }
    if (!room || !client) return;
    const rid = (msg as { rid: number }).rid;
    try {
      switch (msg.t) {
        case 'join': {
          if (client.as !== 'player') throw new GameError('Join as a player.');
          if (client.playerId && room.player(client.playerId)) return ack(rid, true, undefined, { id: client.playerId });
          const res = room.join(String(msg.name ?? ''), String(msg.avatar ?? ''));
          client.playerId = res.id;
          room.touch();
          return ack(rid, true, undefined, res);
        }
        case 'propose':
          if (!client.playerId) throw new GameError('Join first.');
          room.propose(client.playerId, String(msg.to), Number(msg.price));
          return ack(rid, true);
        case 'respond':
          if (!client.playerId) throw new GameError('Join first.');
          room.respond(client.playerId, String(msg.id), !!msg.accept);
          return ack(rid, true);
        case 'cancel':
          if (!client.playerId) throw new GameError('Join first.');
          room.cancel(client.playerId, String(msg.id));
          return ack(rid, true);
        case 'predict':
          if (!client.playerId) throw new GameError('Join first.');
          room.predict(client.playerId, Number(msg.value));
          return ack(rid, true);
        case 'host':
          if (client.as !== 'host') throw new GameError('Only the host can do that.');
          room.host(msg);
          return ack(rid, true);
      }
    } catch (e) {
      if (e instanceof GameError) return ack(rid, false, e.message);
      console.error(e);
      return ack(rid, false, 'Server hiccup — try again.');
    }
  });

  ws.on('close', () => {
    if (room && client) {
      room.clients.delete(client);
      room.touch();
    }
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    const w = ws as WebSocket & { alive?: boolean };
    if (w.alive === false) {
      ws.terminate();
      continue;
    }
    w.alive = false;
    ws.ping();
  }
}, 15000);

server.listen(PORT, () => console.log(`Closing Bell on :${PORT}`));
