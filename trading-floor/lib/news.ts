/**
 * The presentation's scripted news sequence, in reveal order.
 * Put screenshots in public/news/ and set image to "/news/your-file.png".
 * Captions also serve as image descriptions on phones and screen readers.
 * Direction is the crowd's initial reaction. Intensity 1–5 scales its orders.
 * The server reveals one event every 24 seconds.
 */
export type NewsEvent = {
  id: string;
  source: string;
  caption: string;
  image: string | null;
  direction: "positive" | "negative";
  intensity: 1 | 2 | 3 | 4 | 5;
};

// Temporary text events until the presentation's screenshots are supplied.
export const NEWS_EVENTS: readonly NewsEvent[] = [
  {
    id: "robotaxi",
    source: "Elon Musk",
    caption: "The robotaxi just gave me one star. Apparently I talked too much.",
    image: null,
    direction: "positive",
    intensity: 2,
  },
  {
    id: "analyst",
    source: "Albert Wang",
    caption: "The bull case assumes every robotaxi carries a passenger. Mine is circling the school looking for visitor parking.",
    image: null,
    direction: "negative",
    intensity: 3,
  },
  {
    id: "chips",
    source: "Jensen Huang",
    caption: "Tesla asked for more GPUs. I said yes. My jacket now has a waiting list.",
    image: null,
    direction: "positive",
    intensity: 4,
  },
  {
    id: "production",
    source: "Elon Musk",
    caption: "Production update: the robot that builds the robots has requested a manager.",
    image: null,
    direction: "negative",
    intensity: 5,
  },
];

export const EVENT_TICKS = 12;
export const TOTAL_TICKS = NEWS_EVENTS.length * EVENT_TICKS;
if (!NEWS_EVENTS.length) throw Error("Add at least one news event.");
for (const event of NEWS_EVENTS) {
  if (
    !event.id ||
    !event.source ||
    !event.caption ||
    !["positive", "negative"].includes(event.direction) ||
    !Number.isInteger(event.intensity) ||
    event.intensity < 1 ||
    event.intensity > 5 ||
    (event.image !== null && !/^\/news\/[^?#]+\.(png|jpe?g|webp)$/i.test(event.image))
  ) throw Error("Invalid scripted news event: " + event.id);
}
if (new Set(NEWS_EVENTS.map(event => event.id)).size !== NEWS_EVENTS.length)
  throw Error("News event IDs must be unique.");

/** News adds net orders per active desk during its first three quotes. */
export function newsOrders(event: NewsEvent, eventTick: number): number {
  if (eventTick >= 3) return 0;
  return (event.direction === "positive" ? 1 : -1) * event.intensity / 1.2;
}
