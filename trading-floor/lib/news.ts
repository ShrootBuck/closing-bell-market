/** Short trading-floor shocks. Each round lasts 24 seconds. */
export const NEWS_EVENTS = [
  { id: "whale", source: "Whale buy", caption: "A big fund is buying. Ride the move or sell into it.", direction: "positive", intensity: 2 },
  { id: "selloff", source: "Forced liquidation", caption: "A fund needs cash. Sell orders are hitting the floor.", direction: "negative", intensity: 3 },
  { id: "squeeze", source: "Short squeeze", caption: "Short sellers are buying back. The price is running.", direction: "positive", intensity: 4 },
  { id: "panic", source: "Panic selling", caption: "Everyone wants out. Is this your exit or your entry?", direction: "negative", intensity: 4 },
] as const;
export type NewsEvent = typeof NEWS_EVENTS[number];
export const EVENT_TICKS = 12;
export const TOTAL_TICKS = NEWS_EVENTS.length * EVENT_TICKS;
export function newsOrders(event: NewsEvent, eventTick: number): number {
  if (eventTick >= 3) return 0;
  return (event.direction === "positive" ? 1 : -1) * event.intensity / 1.2;
}
