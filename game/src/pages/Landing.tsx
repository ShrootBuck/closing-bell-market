import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { hostKey, store } from '../net';
import { Logo } from '../ui/bits';
import { unlockAudio, sfx } from '../sound';

const TICKS = ['TOST ▲ 2.31%', 'MOON ▲ 420.69%', 'ROCK ▼ 0.12%', 'YOLO ▼ 33.3%', 'KNIT ▲ 0.88%', 'APEZ ▲ 12.0%', 'GLXY ▼ 7.7%', 'DIRT ▲ 1.01%', 'RKET ▲ 99.9%', 'PIRO ▼ 3.14%'];

export default function Landing({ go }: { go: (path: string) => void }) {
  const params = new URLSearchParams(location.search);
  const [pin, setPin] = useState(params.get('pin') ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<{ code: string; at: number }[]>([]);

  useEffect(() => {
    try {
      const list = JSON.parse(store.get('cb:hosted') ?? '[]') as { code: string; at: number }[];
      setMine(list.filter((x) => Date.now() - x.at < 1000 * 60 * 60 * 48 && store.get(hostKey(x.code))).slice(0, 3));
    } catch {}
  }, []);

  const join = async (e?: React.FormEvent) => {
    e?.preventDefault();
    unlockAudio();
    const code = pin.replace(/\D/g, '');
    if (code.length !== 5) return setErr('PINs are 5 digits.');
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'No floor with that PIN.');
      go(`/play/${code}`);
    } catch (e) {
      setErr((e as Error).message === 'Failed to fetch' ? 'Network hiccup. Try again.' : (e as Error).message);
      sfx.nope();
    } finally {
      setBusy(false);
    }
  };

  const host = async () => {
    unlockAudio();
    setBusy(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const { code, token } = await res.json();
      store.set(hostKey(code), token);
      const list = JSON.parse(store.get('cb:hosted') ?? '[]');
      store.set('cb:hosted', JSON.stringify([{ code, at: Date.now() }, ...list].slice(0, 10)));
      go(`/host/${code}`);
    } catch {
      setErr('Could not open a floor. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="landing">
      <div className="bg-grid" />
      <div className="landing-tape">
        <div className="tape-track" style={{ animationDuration: '40s' }}>
          {[0, 1].map((k) => (
            <div className="tape-seg" key={k}>
              {TICKS.map((t) => (
                <span key={t} className={`tape-item ${t.includes('▲') ? 'up' : 'down'}`}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <motion.div className="landing-card" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <Logo />
        <p className="tagline">The classroom trading floor. Buy low, sell high, prove the differential equation.</p>
        <form onSubmit={join} className="pin-form">
          <input
            className="pin-input mono"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder="GAME PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }}
          />
          <button className="btn primary huge-btn" disabled={busy}>Enter →</button>
        </form>
        {err && <div className="err">{err}</div>}
        <div className="landing-host">
          <button className="btn ghost" onClick={host} disabled={busy}>🖥️ Host a new game</button>
          {mine.map((m) => (
            <button key={m.code} className="btn ghost small-btn" onClick={() => go(`/host/${m.code}`)}>
              Resume floor <span className="mono">{m.code}</span>
            </button>
          ))}
          <a className="muted small" href="/talk/index.html">Class slides ↗</a>
        </div>
      </motion.div>
    </div>
  );
}
