# Closing Bell

[Trading floor](https://market.zaydkrunz.com/) · [Class slides](https://market.zaydkrunz.com/talk/index.html) · [Presenter view](https://market.zaydkrunz.com/talk/index.html#/presenter/1)

The Slidev talk solves Market Equilibrium: Stability and Time Paths (a–e). The Next.js App Router game gives a classroom 96 seconds to trade fictional TSLA on a stream of parody posts. One projector hosts; each phone gets a named trading desk. Solo practice adds three simulated desks.

Run the deck with `npm ci && npm run dev`. For the game, run `npm ci` in `trading-floor`, then `npm run market` from the root. Host a floor, share the QR on a phone-reachable address, and ring the bell after everyone joins.

Deploy the root Dockerfile on port 3000 with one replica. Game at /, slides at /talk/index.html, presenter script at /talk/index.html#/presenter/1. Rooms live in server memory and reset on redeploy. Reopening a room in the same browser restores the desk via an HTTP-only cookie. Server-sent events deliver quotes and orders to the whole room. Trade buttons set the target position. Price changes combine net order flow, short-lived headline effects, noise, and signed feedback around $100. Positions settle at the closing quote.
