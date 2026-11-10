# Closing Bell

[Trading floor](https://market.zaydkrunz.com/) · [Class slides](https://market.zaydkrunz.com/talk/index.html) · [Presenter view](https://market.zaydkrunz.com/talk/index.html#/presenter/1)

The Slidev talk solves Market Equilibrium: Stability and Time Paths (a–e). The Next.js App Router game gives a classroom a scripted session to trade fictional TSLA on a stream of parody posts. One projector hosts; each phone gets a named trading desk. Solo practice adds three simulated desks.

Run the deck with `npm ci && npm run dev`. For the game, run `npm ci` in `trading-floor`, then `npm run market` from the root. Host a floor, share the QR on a phone-reachable address, and ring the bell after everyone joins.

Deploy the root Dockerfile on port 3000 with one replica. Game at /, slides at /talk/index.html, presenter script at /talk/index.html#/presenter/1. Rooms live in server memory and reset on redeploy. Reopening a room in the same browser restores the desk via an HTTP-only cookie. Server-sent events deliver quotes and orders to the whole room. Trade buttons set the target position. Price changes combine class orders, simulated crowd orders triggered by each news event, noise, and signed feedback around $100. Positions settle at the closing quote.


The baked news sequence lives in `trading-floor/lib/news.ts`. Put image files in `trading-floor/public/news/`, then set each event’s image path, caption, source, direction and intensity. Events run in array order, one every 24 seconds. A four-event sequence lasts 96 seconds. The session length and countdown follow the number of events automatically. Unreleased events and their intensity settings are excluded from player snapshots.

Positive news generates simulated net purchases and negative news generates simulated net sales. Intensity 1–5 scales that flow linearly during the first three quotes after each reveal. In isolation its gross price contribution is $3–$15 across six seconds. Class orders, feedback and noise determine the actual path. First-half background traders pull toward $100; second-half traders amplify the gap. Screenshots appear at their original aspect ratio and open at full size when tapped.
