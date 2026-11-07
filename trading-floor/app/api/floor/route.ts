import { NextRequest, NextResponse } from "next/server";
import {
  create,
  find,
  join,
  open,
  trade,
  snapshot,
  subscribe,
} from "@/lib/market";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    let token = "",
      r;
    if (b.action === "create") {
      ({ r, token } = create(b.solo === true));
    } else {
      r = find(String(b.room));
      token = req.cookies.get("desk_" + r.id)?.value || "";
      if (b.action === "join") token = join(r, String(b.name || ""));
      else if (b.action === "start") open(r, token);
      else if (b.action === "trade") trade(r, token, b.position, b.tick);
      else throw Error("Unknown action.");
    }
    const res = NextResponse.json(snapshot(r, token));
    if (["create", "join"].includes(b.action))
      res.cookies.set("desk_" + r.id, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 14400,
      });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
export function GET(req: NextRequest) {
  try {
    const r = find(req.nextUrl.searchParams.get("room") || ""),
      token = req.cookies.get("desk_" + r.id)?.value || "";
    let stop = () => {};
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        const send = () =>
          controller.enqueue(
            enc.encode("data: " + JSON.stringify(snapshot(r, token)) + "\n\n"),
          );
        const unsub = subscribe(r, send),
          pulse = setInterval(
            () => controller.enqueue(enc.encode(": ping\n\n")),
            12000,
          );
        stop = () => {
          clearInterval(pulse);
          unsub();
        };
        req.signal.addEventListener(
          "abort",
          () => {
            stop();
            try {
              controller.close();
            } catch {}
          },
          { once: true },
        );
        send();
      },
      cancel() {
        stop();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response("Room expired", { status: 404 });
  }
}
