"use client";
import { useEffect, useState } from "react";
import { renderSVG } from "uqr";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Radio,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Frame } from "@/lib/market";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
function Tape({ values }: { values: number[] }) {
  const span = Math.max(2, ...values.map((n) => Math.abs(n - 100))) * 1.15;
  const coords = values.map((v, i) => [
    6 + (i * 608) / Math.max(12, values.length - 1),
    85 - ((v - 100) * 78) / span,
  ]);
  const points = coords.map((p) => p.join(",")).join(" "),
    [x, y] = coords.at(-1)!;
  return (
    <svg
      className="tape"
      viewBox="0 0 620 176"
      role="img"
      aria-label={"Price path ending at " + usd(values.at(-1)!)}
    >
      <defs>
        <linearGradient id="wash" x2="0" y2="1">
          <stop stopColor="var(--primary)" stopOpacity=".23" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 85, 150].map((v) => (
        <path
          key={v}
          d={"M0 " + v + "H620"}
          stroke="var(--border)"
          strokeDasharray="4 6"
        />
      ))}
      <polygon
        points={"6,176 " + points + " " + x + ",176"}
        fill="url(#wash)"
      />
      <polyline
        points={points}
        stroke="var(--primary)"
        strokeWidth="3"
        fill="none"
      />
      <circle cx={x} cy={y} r="4" fill="var(--primary)" />
    </svg>
  );
}
export default function Floor() {
  const [room, R] = useState(""),
    [frame, F] = useState<Frame | null>(null),
    [name, N] = useState(""),
    [code, C] = useState(""),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [online, O] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("room");
    if (id) {
      C(id);
      R(id);
    }
  }, []);
  useEffect(() => {
    if (!room) return;
    const live = new EventSource("/api/floor?room=" + encodeURIComponent(room));
    live.onmessage = (e) => {
      F(JSON.parse(e.data));
      O(true);
    };
    live.onerror = () => O(false);
    return () => live.close();
  }, [room]);
  async function action(action: string, extra: Record<string, unknown> = {}) {
    B(true);
    E("");
    try {
      const res = await fetch("/api/floor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          room: room || code,
          name,
          tick: frame?.tick,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      history.replaceState(null, "", "?room=" + data.id);
      R(data.id);
      F(data);
      // Reopen the stream after a previously anonymous spectator joins.
      if (action === "join" && room === data.id) location.reload();
    } catch (e) {
      E((e as Error).message);
    } finally {
      B(false);
    }
  }
  const seated = frame && (frame.host || frame.me),
    s = frame,
    done = s?.tick === 48;
  return (
    <main>
      <header>
        <a href="/" className="brand">
          <Activity /> Closing Bell
        </a>
        <span className="micro">
          {seated ? "ROOM " + room : "CLASSROOM EXCHANGE"}
        </span>
      </header>
      {!seated || !s ? (
        <section className="landing">
          <div className="intro">
            <span className="micro accent">
              TSLA &nbsp; / &nbsp; MARKET SIMULATOR
            </span>
            <h1>
              Closing
              <br />
              <i>Bell.</i>
            </h1>
            <p>
              Elon has a phone. Albert has a price target.
              <br />
              You have 96 seconds to beat the room.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                disabled={busy}
                onClick={() => action("create", { solo: true })}
              >
                Play solo <ArrowUpRight data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={busy}
                onClick={() => action("create")}
              >
                Host a floor
              </Button>
            </div>
          </div>
          <div className="entry">
            <Card>
              <CardHeader>
                <CardTitle>Take a seat</CardTitle>
                <CardDescription>
                  Enter the room on the projector.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    action("join", { room: code });
                  }}
                >
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="room">Room code</FieldLabel>
                      <Input
                        id="room"
                        placeholder="00000"
                        inputMode="numeric"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        required
                        value={code}
                        onChange={(e) => C(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="desk">Desk name</FieldLabel>
                      <Input
                        id="desk"
                        maxLength={22}
                        required
                        placeholder="Margin Call Saul"
                        value={name}
                        onChange={(e) => N(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" disabled={busy}>
                      Join trading floor
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
            <small>Fictional prices and parody posts.</small>
          </div>
        </section>
      ) : (
        <>
          <div className="session">
            <Badge variant="outline">
              <Radio /> {done ? "Closed" : s.start ? "On air" : "Pre-market"}
            </Badge>
            <span className="micro">
              {!online
                ? "Connecting…"
                : s.start
                  ? 96 - s.tick * 2 + " SEC TO CLOSE"
                  : "ROOM " + s.id}
            </span>
          </div>
          {s.feed[0] && !done && (
            <aside className="mobile-wire">
              <b>{s.feed[0].author} · parody</b>
              <p>{s.feed[0].text}</p>
            </aside>
          )}
          <div className="terminal">
            <section>
              <div className="quote">
                <div className="micro">TESLA INC. &nbsp; / &nbsp; TSLA</div>
                <h2>{usd(s.history.at(-1)!)}</h2>
                <span className="accent">
                  {usd(s.history.at(-1)! - 100)} from open
                </span>
                <Tape values={s.history} />
                <div className="axis">
                  <span>OPEN · $100</span>
                  <span>{s.tick < 24 ? "VALUE DESKS" : "MOMENTUM DESKS"}</span>
                </div>
              </div>
              {s.me && (
                <Card>
                  <CardHeader>
                    <CardTitle>{s.me.name}</CardTitle>
                    <CardDescription>
                      {s.me.position === 0
                        ? "Flat"
                        : s.me.position > 0
                          ? "Long 3 shares"
                          : "Short 3 shares"}{" "}
                      · P&L {usd(s.me.pnl)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="orders">
                      {[-3, 0, 3].map((n) => (
                        <Button
                          key={n}
                          variant={
                            n < 0
                              ? "destructive"
                              : n === 0
                                ? "outline"
                                : "default"
                          }
                          disabled={
                            !online ||
                            busy ||
                            !s.start ||
                            done ||
                            s.me?.last === s.tick ||
                            s.me?.position === n
                          }
                          onClick={() => action("trade", { position: n })}
                        >
                          {n < 0 ? (
                            <>
                              <ArrowDownRight />
                              Short
                            </>
                          ) : n > 0 ? (
                            <>
                              <ArrowUpRight />
                              Long
                            </>
                          ) : (
                            "Go flat"
                          )}
                        </Button>
                      ))}
                    </div>
                    <small>
                      Set your position to −3, 0 or +3 shares. Each share traded
                      costs 25¢ in fees.
                    </small>
                  </CardContent>
                </Card>
              )}
              {!s.start && s.host && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {s.solo ? "Practice session" : "Join the floor"}
                    </CardTitle>
                    <CardDescription>
                      {s.solo
                        ? "Three simulated desks are seated."
                        : "Scan to join, or enter room " +
                          room +
                          " on the homepage."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!s.solo && (
                      <div
                        className="qr"
                        dangerouslySetInnerHTML={{
                          __html: renderSVG(location.origin + "/?room=" + room),
                        }}
                      />
                    )}
                    <Button
                      disabled={busy || !s.rank.length}
                      onClick={() => action("start")}
                    >
                      Ring the opening bell
                    </Button>
                  </CardContent>
                </Card>
              )}
              {done && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Trophy />{" "}
                      {s.rank
                        .filter((d) => d.pnl === s.rank[0].pnl)
                        .map((d) => d.name)
                        .join(" & ")}
                    </CardTitle>
                    <CardDescription>
                      Top desk · {usd(s.rank[0]?.pnl || 0)} at the closing quote
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => location.assign("/")}>
                      New session
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Market wire</CardTitle>
                  <CardDescription>
                    Parody feed · posts hit everyone at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {s.feed.length ? (
                    s.feed.map((p) => (
                      <article key={p.bell}>
                        <div className="byline">
                          <b>{p.author}</b>
                          <span className="micro">BELL 0{p.bell}</span>
                        </div>
                        <p>{p.text}</p>
                      </article>
                    ))
                  ) : (
                    <p className="dim">
                      The first post drops at the opening bell.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Desk standings</CardTitle>
                </CardHeader>
                <CardContent>
                  {s.rank.length ? (
                    s.rank.map((d, i) => (
                      <div className="standing" key={d.name}>
                        <span>
                          <em>{String(i + 1).padStart(2, "0")}</em> {d.name}
                        </span>
                        <b>{usd(d.pnl)}</b>
                      </div>
                    ))
                  ) : (
                    <p className="dim">Waiting for the first desk.</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
