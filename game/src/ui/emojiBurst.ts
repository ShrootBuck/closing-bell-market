// Emoji confetti drawn with plain drawImage.
//
// canvas-confetti's emoji shapes (shapeFromText) are painted through
// CanvasPattern.setTransform, which Safari gets wrong: each particle smears
// into a huge white blob. Sprites + drawImage render the same everywhere.

type Bit = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; wobble: number; vwobble: number;
  size: number; tick: number;
};

const TICKS = 110; // particle lifetime in 60fps frames
const sprites = new Map<string, HTMLCanvasElement>();

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let bits: { sprite: HTMLCanvasElement; b: Bit }[] = [];
let raf = 0;
let last = 0;

function sprite(emoji: string): HTMLCanvasElement {
  let s = sprites.get(emoji);
  if (s) return s;
  const px = 64;
  s = document.createElement('canvas');
  s.width = s.height = px * 1.5;
  const c = s.getContext('2d')!;
  c.font = `${px}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(emoji, s.width / 2, s.height / 2 + px * 0.06);
  sprites.set(emoji, s);
  return s;
}

function fit() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  window.removeEventListener('resize', fit);
  canvas?.remove();
  canvas = ctx = null;
  bits = [];
}

function frame(now: number) {
  if (!canvas || !ctx) return;
  const dt = Math.min((now - last) / (1000 / 60), 3); // in 60fps frames
  last = now;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  bits = bits.filter(({ b }) => b.tick < TICKS && b.y < window.innerHeight + 60);
  for (const { sprite: s, b } of bits) {
    b.tick += dt;
    b.vx *= Math.pow(0.9, dt);
    b.vy = b.vy * Math.pow(0.9, dt) + 0.9 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += b.vrot * dt;
    b.wobble += b.vwobble * dt;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - b.tick / TICKS) * 2.5);
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(b.wobble))); // paper-flip tumble
    ctx.drawImage(s, -b.size / 2, -b.size / 2, b.size, b.size);
    ctx.restore();
  }
  if (bits.length) raf = requestAnimationFrame(frame);
  else stop();
}

export function emojiBurst(
  emoji: string,
  { count = 40, spread = 100, x = 0.5, y = 0.6, size = 34 } = {},
) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1000';
    ctx = canvas.getContext('2d');
    if (!ctx) { canvas = null; return; }
    document.body.appendChild(canvas);
    window.addEventListener('resize', fit);
    fit();
  }
  const s = sprite(emoji);
  const rad = (spread * Math.PI) / 180;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * rad;
    const speed = 14 + Math.random() * 22;
    bits.push({
      sprite: s,
      b: {
        x: x * window.innerWidth,
        y: y * window.innerHeight,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.25,
        wobble: Math.random() * Math.PI * 2,
        vwobble: 0.08 + Math.random() * 0.1,
        size: size * (0.75 + Math.random() * 0.5),
        tick: 0,
      },
    });
  }
  if (bits.length > 240) bits.splice(0, bits.length - 240);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
