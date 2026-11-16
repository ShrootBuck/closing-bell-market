// Tiny WebAudio synth: no audio files, works offline.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {
  muted = localStorage.getItem('cb:muted') === '1';
} catch {}

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('cb:muted', m ? '1' : '0');
  } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, endFreq?: number) {
  const c = ac();
  if (!c || !master || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(master);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.2, hp = 2000) {
  const c = ac();
  if (!c || !master || muted) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start(c.currentTime + start);
}

export const sfx = {
  /** The opening/closing bell: three rings with inharmonic partials. */
  bell() {
    for (let i = 0; i < 3; i++) {
      const t = i * 0.42;
      tone(1318, t, 1.4, 'sine', 0.28);
      tone(1318 * 2.76, t, 0.6, 'sine', 0.08);
      tone(1318 * 5.4, t, 0.25, 'sine', 0.04);
      tone(659, t, 1.2, 'triangle', 0.08);
    }
  },
  cash() {
    noise(0, 0.05, 0.25, 3000);
    tone(1900, 0.03, 0.12, 'square', 0.08);
    tone(2600, 0.1, 0.5, 'triangle', 0.18);
    tone(3900, 0.1, 0.35, 'sine', 0.06);
  },
  tick() {
    tone(1200, 0, 0.04, 'square', 0.06);
  },
  tock() {
    tone(800, 0, 0.06, 'square', 0.1);
  },
  pop() {
    tone(500, 0, 0.12, 'sine', 0.2, 1100);
  },
  offer() {
    tone(880, 0, 0.12, 'triangle', 0.25);
    tone(1320, 0.12, 0.2, 'triangle', 0.25);
  },
  nope() {
    tone(300, 0, 0.18, 'sawtooth', 0.1, 180);
  },
  whoosh() {
    noise(0, 0.4, 0.12, 600);
    tone(200, 0, 0.4, 'sine', 0.1, 900);
  },
  horn() {
    for (const f of [233, 294, 349]) tone(f, 0, 1.1, 'sawtooth', 0.07);
    for (const f of [233, 294, 349]) tone(f * 1.003, 0.02, 1.1, 'sawtooth', 0.05);
  },
  drumroll(sec = 2.2) {
    const n = Math.floor(sec * 22);
    for (let i = 0; i < n; i++) noise(i / 22, 0.05, 0.05 + (0.18 * i) / n, 300);
  },
  fanfare() {
    const seq = [523, 659, 784, 1046];
    seq.forEach((f, i) => tone(f, i * 0.12, 0.5, 'triangle', 0.18));
    tone(1046, 0.5, 1.2, 'triangle', 0.2);
    tone(1318, 0.5, 1.2, 'sine', 0.1);
  },
};
