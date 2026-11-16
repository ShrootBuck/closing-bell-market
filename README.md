# Closing Bell

[Trading floor](https://market.zaydkrunz.com/) · [Class slides](https://market.zaydkrunz.com/talk/index.html) · [Presenter view](https://market.zaydkrunz.com/talk/index.html#/presenter/1)

The Slidev talk solves *Market Equilibrium: Stability and Time Paths* (a–e). After the math, the class plays **Closing Bell**, a live buyer/seller pit market that tests it.

## The game

- The host opens **Host a new game** on the projector. Students join on their phones with the 5‑digit PIN or the QR code.
- Half the class are **buyers**, half **sellers**. Each phone holds a secret card: a buyer's limit or a seller's floor, drawn so demand is `q_d = d0 − d1 p` and supply is `q_s = −s0 + s1 p`. Cards expire, so keep trading.
- Students haggle in person. One reports the deal (counterparty + price) and the other confirms. The server rejects any trade where someone would lose money, so everyone trades rationally. Profit = limit − price (buyers) or price − floor (sellers).
- Before each round the projector shows that round's equations and pre-market prints. Everyone **predicts the close** (average of the last 20 s) for a bonus of up to $25.
- **Half 1 · Blue chip**: plain cards. The open is shocked $12–20 off `p*`, and the gap decays (`p' = −λ(d1+s1)(p−p*)`).
- **Halftime**: buyers and sellers swap roles.
- **Half 2 · Meme mode**: every card shifts by `β·p′`, where `p′` is the live price trend. That adds the `d2 p′` and `s2 p′` terms from part C, so `p′ = k(p−p*)` with `k = 1/β`. A small pre-market push grows into a bubble.
- The live **Rich List** ranks total profit plus prediction bonuses. The results screens show the podium, awards, every round's trades with a fitted `p* + A·e^{rt}` curve (class `λ̂` and `k̂` against theory), and the verdict.

Host controls: **→/Enter** = next step, **Space/P** = pause, **←** = back on results. The 📱 button shows a QR that turns your phone into a remote. Practice bots are in the lobby settings.

## Resilience

The server is authoritative and keeps all state. Every change is written to `DATA_DIR/<pin>.json` (atomic rename), and rooms reload on restart. Phones and the projector reconnect automatically with backoff (also on tab focus or network change) and resync full state. Identity is a token in `localStorage`, so refreshing or reopening a phone puts it back at the same desk. Mutations are never replayed blindly. Timers run on server time with a client clock offset.

## Develop

```bash
cd game && npm ci
npm run dev        # server on :3000 + Vite on :5173
npm run sim -- 3 16  # bot-only simulation of a full game (seed, bots)
npx tsx scripts/load.ts http://localhost:3000 24 30   # 24 WebSocket phones
```

Slides: `npm ci && npm run dev` at the repo root.

## Deploy

The root `Dockerfile` builds the slides and the game into a single Node server on port 3000 (game at `/`, slides at `/talk/`). Mount a persistent volume at `/data` and run one replica.
