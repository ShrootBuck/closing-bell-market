import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMsg, Fx, ServerMsg, View } from '../shared/types';

export type Status = 'connecting' | 'live' | 'reconnecting';
export type RoomError = { code: string; message: string };

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
type Outgoing = ClientMsg extends infer M ? (M extends { rid: number } ? Omit<M, 'rid'> : never) : never;

export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, v: string | null) {
    try {
      if (v == null) localStorage.removeItem(key);
      else localStorage.setItem(key, v);
    } catch {
      /* private mode */
    }
  },
};

export const playerKey = (code: string) => `cb:p:${code}`;
export const hostKey = (code: string) => `cb:h:${code}`;

/**
 * Live room connection over WebSocket. Reconnects with backoff, wakes on
 * visibility/online changes, and resyncs full state on every (re)connect.
 * Mutations are never replayed automatically — if a socket drops mid-request the
 * caller is told, and the fresh state shows whether it landed.
 */
export function useRoom(code: string, as: 'host' | 'player' | 'viewer', tokenKey: string | null) {
  const [view, setView] = useState<View | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [error, setError] = useState<RoomError | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const offset = useRef(0);
  const bestRtt = useRef(Infinity);
  const wsRef = useRef<WebSocket | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const rid = useRef(1);
  const fxSubs = useRef(new Set<(fx: Fx) => void>());
  const stopped = useRef(false);

  const connect = useCallback(() => {
    if (stopped.current) return;
    const cur = wsRef.current;
    if (cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;
    let lastMsg = Date.now();
    let pinger: ReturnType<typeof setInterval> | null = null;
    const ping = () => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping', at: Date.now() }));
    ws.onopen = () => {
      const token = tokenKey ? store.get(tokenKey) ?? undefined : undefined;
      ws.send(JSON.stringify({ t: 'hello', code, as, token } satisfies ClientMsg));
      ping();
      pinger = setInterval(() => {
        if (Date.now() - lastMsg > 25000) ws.close();
        else ping();
      }, 8000);
    };
    ws.onmessage = (ev) => {
      if (wsRef.current !== ws) return;
      lastMsg = Date.now();
      let msg: ServerMsg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      switch (msg.t) {
        case 'welcome':
          setStatus('live');
          setError(null);
          setPlayerId(msg.playerId ?? null);
          retry.current = 0;
          break;
        case 'state':
          if (bestRtt.current === Infinity) offset.current = msg.view.now - Date.now();
          setView(msg.view);
          if (msg.view.me) setPlayerId(msg.view.me.id);
          break;
        case 'pong': {
          const rtt = Date.now() - msg.at;
          if (rtt <= bestRtt.current * 1.5 || rtt < 150) {
            bestRtt.current = Math.min(bestRtt.current, rtt);
            offset.current = msg.now - (msg.at + rtt / 2);
          }
          break;
        }
        case 'ack': {
          const p = pending.current.get(msg.rid);
          if (!p) break;
          pending.current.delete(msg.rid);
          clearTimeout(p.timer);
          if (msg.ok) p.resolve(msg.data);
          else p.reject(new Error(msg.error ?? 'Failed'));
          break;
        }
        case 'fx':
          for (const f of fxSubs.current) f(msg.fx);
          break;
        case 'error':
          setError({ code: msg.code, message: msg.message });
          if (msg.code === 'bad-token' || msg.code === 'kicked') {
            if (msg.code === 'kicked' && tokenKey) store.set(tokenKey, null);
          }
          if (msg.code === 'no-room' || msg.code === 'kicked' || msg.code === 'bad-token') {
            stopped.current = true;
            ws.close();
          }
          break;
      }
    };
    ws.onclose = () => {
      if (pinger) clearInterval(pinger);
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      for (const [id, p] of pending.current) {
        clearTimeout(p.timer);
        p.reject(new Error('Connection blipped — check whether that went through.'));
        pending.current.delete(id);
      }
      if (stopped.current) return;
      setStatus('reconnecting');
      const delay = Math.min(5000, 400 * 2 ** retry.current) + Math.random() * 400;
      retry.current += 1;
      clearTimeout(timer.current);
      timer.current = setTimeout(connect, delay);
    };
    ws.onerror = () => ws.close();
  }, [code, as, tokenKey]);

  const retry = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    stopped.current = false;
    connect();
    const wake = () => {
      if (document.visibilityState === 'hidden') return;
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        retry.current = 0;
        clearTimeout(timer.current);
        connect();
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: 'ping', at: Date.now() }));
      }
    };
    const offline = () => setStatus('reconnecting');
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('pageshow', wake);
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('offline', offline);
    return () => {
      stopped.current = true;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('pageshow', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('offline', offline);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback(<T = unknown,>(msg: Outgoing): Promise<T> => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Reconnecting… try again in a sec.'));
    const id = rid.current++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.current.delete(id);
        reject(new Error('No answer from the exchange — check whether that went through.'));
      }, 8000);
      pending.current.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      ws.send(JSON.stringify({ ...msg, rid: id }));
    });
  }, []);

  const onFx = useCallback((f: (fx: Fx) => void) => {
    fxSubs.current.add(f);
    return () => {
      fxSubs.current.delete(f);
    };
  }, []);

  const serverNow = useCallback(() => Date.now() + offset.current, []);

  return { view, status, error, send, onFx, serverNow, playerId };
}
