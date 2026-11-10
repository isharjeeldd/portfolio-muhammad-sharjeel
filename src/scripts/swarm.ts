// Swarm build engine.
//
// The page starts as a blank canvas. As you scroll, a flock of cursors builds
// it: boxes are dragged out with a crosshair, text is typed with an I-beam,
// rules are laid with a pen, guides are pulled from the ruler and repeated
// items are duplicated from a master. When nothing is left to build, the
// cursors flock to the pointer.
//
// The idea belongs to Joel Califa's Swarm and Dhvanil Patel's Swarm Rebuild.
// This implementation is written for this site.

type Kind = 't' | 'r' | 'l' | 'd' | 'g';
type Shape = 'arrow' | 'cross' | 'ibeam' | 'pen' | 'ew' | 'dup';
type Fx =
  | { k: 'rect'; x: number; y: number; w: number; h: number; badge?: boolean; dash?: boolean }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { k: 'caret'; x: number; y: number; h: number }
  | { k: 'guide'; x: number };

interface Task {
  el: HTMLElement;
  kind: Kind;
  parent: Task | null;
  state: 0 | 1 | 2 | 3; // locked, ready, active, done
  top: number;
  bottom: number;
  readyAt: number;
}

interface Agent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ring: number;
  pace: number;
  phase: number;
  born: number;
  shape: Shape;
  fx: Fx[];
  job: Generator<void, void, void> | null;
  task: Task | null;
  label?: string;
  labelW?: number;
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

const LABELS = ['implement', 'review', 'verify'];
const ARROW = new Path2D('M0 0 L4.4 15.6 L7.5 8.9 L14.2 5.8 Z');
const NIB = new Path2D('M0 0 L10 3.4 L13.6 7 L7 13.6 L3.4 10 Z M14.8 8.2 L18 11.4 L11.4 18 L8.2 14.8 Z');
const STORE_KEY = 'swarm';
const RULER = 18;

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let W = 0;
let H = 0;
let dpr = 1;
let sx = 0;
let sy = 0;
let agents: Agent[] = [];
let tasks: Task[] = [];
let done = 0;
let building = false;
let raf = 0;
let last = 0;
let time = 0;
let tick = 0; // dt scaled by the build rate, read by running jobs
let rate = 1;
let rulerAlpha = 0;
let labelAlpha = 1;
let fg = '#0a0a0a';
let bg = '#fafafa';
let muted = '#666';
let mono = 'monospace';

let pointer: { x: number; y: number; t: number; mouse: boolean } | null = null;
let perch: Element | null = null;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function wanted(): boolean {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORE_KEY);
  } catch {}
  return stored !== 'off' && !reduceMotion.matches;
}

function readTheme() {
  const cs = getComputedStyle(root);
  fg = cs.getPropertyValue('--fg').trim() || fg;
  bg = cs.getPropertyValue('--bg').trim() || bg;
  muted = cs.getPropertyValue('--muted').trim() || muted;
  mono = cs.getPropertyValue('--mono').trim() || mono;
  for (const a of agents) a.labelW = undefined;
}

/* ---------- geometry ---------- */

function pageBox(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy };
}

// One box per rendered line of text, in page coordinates.
function lineBoxes(el: HTMLElement): Box[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const rects: Box[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue || !n.nodeValue.trim() || n.parentElement?.closest('.sr')) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width > 0.5 && r.height > 0.5) rects.push({ l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy });
    }
  }
  rects.sort((a, b) => a.t - b.t || a.l - b.l);
  const lines: Box[] = [];
  for (const r of rects) {
    const cur = lines[lines.length - 1];
    if (cur && r.t < cur.b - (r.b - r.t) * 0.5) {
      cur.l = Math.min(cur.l, r.l);
      cur.r = Math.max(cur.r, r.r);
      cur.t = Math.min(cur.t, r.t);
      cur.b = Math.max(cur.b, r.b);
    } else lines.push({ ...r });
  }
  return lines;
}

/* ---------- jobs: what a cursor does to build one thing ---------- */

function* wait(sec: number): Generator<void, void, void> {
  let t = 0;
  while (t < sec) {
    yield;
    t += tick;
  }
}

function* move(a: Agent, tx: number, ty: number): Generator<void, void, void> {
  const x0 = a.x;
  const y0 = a.y;
  const dist = Math.hypot(tx - x0, ty - y0) || 1;
  const dur = clamp(dist / 1500, 0.14, 0.62);
  const bend = rand(-0.16, 0.16) * dist;
  const cx = (x0 + tx) / 2 - ((ty - y0) / dist) * bend;
  const cy = (y0 + ty) / 2 + ((tx - x0) / dist) * bend;
  let t = 0;
  while (t < 1) {
    yield;
    t = Math.min(1, t + tick / dur);
    const e = ease(t);
    const u = 1 - e;
    a.x = u * u * x0 + 2 * u * e * cx + e * e * tx;
    a.y = u * u * y0 + 2 * u * e * cy + e * e * ty;
  }
  a.vx = a.vy = 0;
}

// Drag a marquee from one corner to the other.
function* drag(a: Agent, b: Box, speed = 1, badge = true): Generator<void, void, void> {
  yield* move(a, b.l, b.t);
  a.shape = 'cross';
  yield* wait(0.05);
  const dur = clamp(Math.hypot(b.r - b.l, b.b - b.t) / 1700, 0.2, 0.55) / speed;
  const fx: Fx = { k: 'rect', x: b.l, y: b.t, w: 0, h: 0, badge };
  a.fx = [fx];
  let t = 0;
  while (t < 1) {
    yield;
    t = Math.min(1, t + tick / dur);
    const e = ease(t);
    a.x = b.l + (b.r - b.l) * e;
    a.y = b.t + (b.b - b.t) * e;
    fx.w = a.x - b.l;
    fx.h = a.y - b.t;
  }
}

function show(task: Task, fade = true) {
  task.el.classList.add('b-on');
  if (fade) task.el.classList.add('b-fade');
}

function* rectJob(a: Agent, task: Task): Generator<void, void, void> {
  yield* drag(a, pageBox(task.el));
  show(task);
  yield* wait(0.14);
}

function* textJob(a: Agent, task: Task): Generator<void, void, void> {
  const el = task.el;
  const lines = lineBoxes(el);
  if (!lines.length) {
    show(task);
    return;
  }
  const cs = getComputedStyle(el);
  const fs = parseFloat(cs.fontSize) || 16;
  const box = pageBox(el);
  const clip = cs.display !== 'inline';
  const frame: Fx[] = [];

  if (clip && (fs >= 30 || box.b - box.t > 110)) {
    // Big blocks get a text box dragged out first, and keep it while typing.
    yield* drag(a, { l: box.l - 5, t: box.t - 4, r: box.r + 5, b: box.b + 4 }, 1.5, false);
    frame.push({ k: 'rect', x: box.l - 5, y: box.t - 4, w: box.r - box.l + 10, h: box.b - box.t + 8 });
  }
  yield* move(a, lines[0].l, (lines[0].t + lines[0].b) / 2);
  a.shape = 'ibeam';

  const total = lines.reduce((s, l) => s + (l.r - l.l), 0);
  const dur = clamp(total / (fs * 0.55 * 64), 0.2, 1.5);
  const speed = total / dur;
  const stepW = fs * 0.5;
  const M = 14;
  const w = box.r - box.l;
  if (clip) el.style.clipPath = 'inset(0 100% 100% 0)';
  show(task, false);

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const lt = i === 0 ? -M : ln.t - box.t;
    // Tight leading makes line boxes overlap; stop short so the next line's ascenders stay hidden.
    const next = lines[i + 1];
    const lb = next ? ln.b - Math.max(0, ln.b - next.t) * 0.42 - box.t : box.b - box.t + M;
    let x = ln.l;
    while (x < ln.r) {
      yield;
      x = Math.min(ln.r, x + speed * tick);
      const qx = Math.min(ln.r, ln.l + Math.ceil((x - ln.l) / stepW) * stepW);
      const cx = qx - box.l + 1;
      if (clip) {
        el.style.clipPath = `polygon(${-M}px ${-M}px, ${w + M}px ${-M}px, ${w + M}px ${lt}px, ${cx}px ${lt}px, ${cx}px ${lb}px, ${-M}px ${lb}px)`;
      }
      a.x = qx + 4;
      a.y = (ln.t + ln.b) / 2;
      a.fx = [...frame, { k: 'caret', x: qx + 1, y: ln.t, h: ln.b - ln.t }];
    }
  }
  el.style.clipPath = '';
  yield* wait(0.08);
}

function* lineJob(a: Agent, task: Task): Generator<void, void, void> {
  const b = pageBox(task.el);
  const vertical = b.b - b.t > b.r - b.l;
  const x1 = vertical ? (b.l + b.r) / 2 : b.l;
  const y1 = vertical ? b.t : (b.t + b.b) / 2;
  const x2 = vertical ? x1 : b.r;
  const y2 = vertical ? b.b : y1;
  yield* move(a, x1, y1);
  a.shape = 'pen';
  yield* wait(0.06);
  const fx: Fx = { k: 'line', x1, y1, x2: x1, y2: y1 };
  a.fx = [fx];
  const dur = clamp(Math.hypot(x2 - x1, y2 - y1) / 2400, 0.18, 0.5);
  let t = 0;
  while (t < 1) {
    yield;
    t = Math.min(1, t + tick / dur);
    const e = ease(t);
    a.x = fx.x2 = x1 + (x2 - x1) * e;
    a.y = fx.y2 = y1 + (y2 - y1) * e;
  }
  show(task, false);
  yield* wait(0.1);
}

// Pull a guide out of the left ruler.
function* guideJob(a: Agent, task: Task): Generator<void, void, void> {
  const b = pageBox(task.el);
  const tx = (b.l + b.r) / 2;
  const y = sy + H * rand(0.3, 0.7);
  yield* move(a, sx + RULER / 2, y);
  a.shape = 'ew';
  yield* wait(0.08);
  const fx: Fx = { k: 'guide', x: a.x };
  a.fx = [fx];
  const x0 = a.x;
  const dur = clamp(Math.abs(tx - x0) / 1800, 0.25, 0.6);
  let t = 0;
  while (t < 1) {
    yield;
    t = Math.min(1, t + tick / dur);
    a.x = fx.x = x0 + (tx - x0) * ease(t);
    a.y = sy + (y - sy);
  }
  show(task, false);
  yield* wait(0.08);
}

// Option-drag a copy of the master into place.
function* dupJob(a: Agent, task: Task): Generator<void, void, void> {
  const el = task.el;
  let src: Element | null = null;
  for (const sib of el.parentElement?.children ?? []) {
    if (sib !== el && sib.classList.contains('b-on')) {
      src = sib;
      if ((sib as HTMLElement).dataset.b !== 'd') break;
    }
  }
  const to = pageBox(el);
  if (!src) {
    yield* drag(a, to);
    show(task);
    return;
  }
  const from = pageBox(src);
  const gx = clamp(24, 0, (from.r - from.l) / 2);
  const gy = clamp(16, 0, (from.b - from.t) / 2);
  yield* move(a, from.l + gx, from.t + gy);
  a.shape = 'dup';
  yield* wait(0.07);
  const fx: Fx = { k: 'rect', x: from.l, y: from.t, w: from.r - from.l, h: from.b - from.t, dash: true };
  a.fx = [fx];
  const dur = clamp(Math.hypot(to.l - from.l, to.t - from.t) / 1500, 0.2, 0.5);
  let t = 0;
  while (t < 1) {
    yield;
    t = Math.min(1, t + tick / dur);
    const e = ease(t);
    fx.x = from.l + (to.l - from.l) * e;
    fx.y = from.t + (to.t - from.t) * e;
    fx.w = from.r - from.l + (to.r - to.l - (from.r - from.l)) * e;
    fx.h = from.b - from.t + (to.b - to.t - (from.b - from.t)) * e;
    a.x = fx.x + gx;
    a.y = fx.y + gy;
  }
  show(task);
  yield* wait(0.1);
}

const JOBS: Record<Kind, (a: Agent, t: Task) => Generator<void, void, void>> = {
  t: textJob,
  r: rectJob,
  l: lineJob,
  g: guideJob,
  d: dupJob,
};

/* ---------- scheduler ---------- */

function collect() {
  document.querySelectorAll<HTMLElement>('.prose > *').forEach((el) => {
    if (!el.dataset.b) el.dataset.b = 't';
  });
  const map = new Map<Element, Task>();
  tasks = [];
  document.querySelectorAll<HTMLElement>('[data-b]').forEach((el) => {
    const t: Task = { el, kind: (el.dataset.b as Kind) || 'r', parent: null, state: 0, top: 0, bottom: 0, readyAt: 0 };
    map.set(el, t);
    tasks.push(t);
  });
  for (const t of tasks) {
    const p = t.el.parentElement?.closest('[data-b]');
    t.parent = p ? map.get(p) ?? null : null;
  }
  measure();
  tasks.sort((a, b) => a.top - b.top);
  done = 0;
}

function measure() {
  sx = window.scrollX;
  sy = window.scrollY;
  for (const t of tasks) {
    const b = pageBox(t.el);
    t.top = b.t;
    t.bottom = b.b;
  }
}

function complete(t: Task, fade: boolean) {
  if (t.state === 3) return;
  t.state = 3;
  t.el.style.clipPath = '';
  show(t, fade);
  done++;
  t.el.dispatchEvent(new CustomEvent('swarm:built', { bubbles: true }));
}

function schedule() {
  const viewBottom = sy + H;
  let backlog = 0;
  for (const t of tasks) {
    if (t.state === 0) {
      if (t.parent && t.parent.state !== 3) continue;
      if (t.bottom < sy - 240) {
        complete(t, false); // scrolled past before it was ever on screen
        continue;
      }
      if (t.top > viewBottom - 24) continue;
      t.state = 1;
      t.readyAt = time;
    }
    if (t.state === 1) {
      // Never leave something blank for long: after a few seconds it just appears.
      if (time - t.readyAt > 4.5) complete(t, true);
      else backlog++;
    }
  }
  rate += (clamp(1 + backlog * 0.11, 1, 5) - rate) * 0.08;

  if (backlog) {
    for (const t of tasks) {
      if (t.state !== 1) continue;
      let best: Agent | null = null;
      let bd = Infinity;
      for (const a of agents) {
        if (a.job || time < a.born) continue;
        const d = Math.hypot(a.x - sx - W / 2, a.y - t.top);
        if (d < bd) {
          bd = d;
          best = a;
        }
      }
      if (!best) break;
      t.state = 2;
      best.task = t;
      best.job = JOBS[t.kind](best, t);
    }
  }

  if (done >= tasks.length) finish();
  updateHud();
}

function finish() {
  if (!building) return;
  building = false;
  for (const t of tasks) if (t.state !== 3) complete(t, false);
  for (const a of agents) {
    a.job = null;
    a.task = null;
    a.fx = [];
    a.shape = 'arrow';
  }
  root.classList.remove('building');
  updateHud();
  document.dispatchEvent(new CustomEvent('swarm:done'));
}

function replay() {
  if (!wanted()) return;
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  root.classList.add('building');
  for (const t of tasks) {
    t.state = 0;
    t.el.classList.remove('b-on', 'b-fade');
    t.el.style.clipPath = '';
  }
  done = 0;
  rate = 1;
  measure();
  building = true;
  updateHud();
}

let hudText = '';
function updateHud() {
  const on = wanted();
  const label = !on ? 'off' : building ? `Building ${Math.round((done / Math.max(1, tasks.length)) * 100)}%` : '';
  if (label === hudText) return;
  hudText = label;
  const text = document.querySelector<HTMLElement>('[data-hud-label]');
  const btn = document.querySelector<HTMLElement>('[data-hud-btn]');
  if (!text || !btn) return;
  text.textContent = on ? label : '';
  text.hidden = !on || !label;
  btn.hidden = !on;
  btn.textContent = building ? 'Skip' : 'Replay';
}

/* ---------- flocking, for cursors with nothing to build ---------- */

function target() {
  if (pointer && (pointer.mouse || time - pointer.t < 2.5)) return { x: pointer.x + sx, y: pointer.y + sy };
  return {
    x: sx + W * (0.5 + 0.3 * Math.sin(time * 0.31)),
    y: sy + H * (0.45 + 0.24 * Math.sin(time * 0.47 + 1.3)),
  };
}

function perchPoint(r: DOMRect, u: number) {
  const row = r.height > 44;
  const l = Math.max(2, r.left - 20);
  const t = row ? r.top - 2 : r.top - 20;
  const w = Math.min(W - 16, r.right + 8) - l;
  const h = (row ? r.bottom - 16 : r.bottom + 8) - t;
  let d = u * 2 * (w + h);
  if (d < w) return { x: l + d + sx, y: t + sy };
  d -= w;
  if (d < h) return { x: l + w + sx, y: t + d + sy };
  d -= h;
  if (d < w) return { x: l + w - d + sx, y: t + h + sy };
  d -= w;
  return { x: l + sx, y: t + h - d + sy };
}

let orbit = 0;

// Idle cursors ride one exact circle around the pointer, evenly spaced.
function flock(dt: number) {
  const idle = agents.filter((a) => !a.job && time >= a.born);
  const m = idle.length;
  let rect: DOMRect | null = null;
  if (perch) {
    if (perch.isConnected) rect = perch.getBoundingClientRect();
    else perch = null;
  }
  const o = target();
  const R = W < 760 ? 46 : 64;
  orbit += dt * 0.85;
  labelAlpha += ((rect ? 0 : 1) - labelAlpha) * Math.min(1, dt * 9);

  for (let k = 0; k < m; k++) {
    const a = idle[k];
    let px: number;
    let py: number;
    if (rect) {
      const p = perchPoint(rect, (k + 0.5) / m);
      px = p.x;
      py = p.y;
    } else {
      const th = orbit + (k / m) * Math.PI * 2;
      // the arrow's tip is its origin; nudge so its body sits on the circle
      px = o.x + Math.cos(th) * R - 5;
      py = o.y + Math.sin(th) * R - 6;
    }
    a.vx += ((px - a.x) * 90 - a.vx * 19) * dt;
    a.vy += ((py - a.y) * 90 - a.vy * 19) * dt;
    const v = Math.hypot(a.vx, a.vy);
    if (v > 3200) {
      a.vx *= 3200 / v;
      a.vy *= 3200 / v;
    }
    a.x += a.vx * dt;
    a.y += a.vy * dt;
  }
}

/* ---------- drawing ---------- */

function strokeBoth(path: () => void, width = 1.4) {
  if (!ctx) return;
  ctx.lineCap = 'round';
  ctx.beginPath();
  path();
  ctx.lineWidth = width + 2.4;
  ctx.strokeStyle = bg;
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = fg;
  ctx.stroke();
}

function drawFx(f: Fx) {
  if (!ctx) return;
  const c = ctx;
  c.setTransform(dpr, 0, 0, dpr, -sx * dpr, -sy * dpr);
  c.strokeStyle = fg;
  c.fillStyle = fg;
  c.lineWidth = 1;
  if (f.k === 'rect') {
    const x = Math.round(f.x) + 0.5;
    const y = Math.round(f.y) + 0.5;
    const w = Math.round(f.w);
    const h = Math.round(f.h);
    if (f.dash) c.setLineDash([4, 3]);
    c.strokeRect(x, y, w, h);
    c.setLineDash([]);
    if (!f.dash) {
      // corner handles
      for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        c.fillStyle = bg;
        c.fillRect(hx - 3, hy - 3, 6, 6);
        c.strokeRect(hx - 3, hy - 3, 6, 6);
      }
    }
    if (f.badge && w > 30) {
      const text = `${w} × ${h}`;
      c.font = `500 10px ${mono}`;
      const tw = c.measureText(text).width + 10;
      c.fillStyle = fg;
      c.beginPath();
      c.roundRect(x + w / 2 - tw / 2, y + h + 7, tw, 16, 3);
      c.fill();
      c.fillStyle = bg;
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.fillText(text, x + w / 2, y + h + 15.5);
      c.textAlign = 'left';
    }
  } else if (f.k === 'line') {
    c.beginPath();
    c.moveTo(f.x1, f.y1);
    c.lineTo(f.x2, f.y2);
    c.stroke();
    for (const [px, py] of [[f.x1, f.y1], [f.x2, f.y2]]) {
      c.beginPath();
      c.arc(px, py, 3, 0, Math.PI * 2);
      c.fillStyle = bg;
      c.fill();
      c.stroke();
    }
  } else if (f.k === 'caret') {
    c.fillRect(Math.round(f.x), f.y + 1, 1.5, f.h - 2);
  } else if (f.k === 'guide') {
    c.globalAlpha *= 0.55;
    c.fillRect(Math.round(f.x), sy, 1, H);
  }
}

function drawCursor(a: Agent, alpha: number) {
  if (!ctx) return;
  const c = ctx;
  c.setTransform(dpr, 0, 0, dpr, (a.x - sx) * dpr, (a.y - sy) * dpr);
  c.lineJoin = 'round';
  switch (a.shape) {
    case 'cross':
      strokeBoth(() => {
        c.moveTo(-8, 0);
        c.lineTo(8, 0);
        c.moveTo(0, -8);
        c.lineTo(0, 8);
      });
      break;
    case 'ibeam':
      strokeBoth(() => {
        c.moveTo(-3, -9);
        c.lineTo(3, -9);
        c.moveTo(0, -9);
        c.lineTo(0, 9);
        c.moveTo(-3, 9);
        c.lineTo(3, 9);
      });
      break;
    case 'ew':
      strokeBoth(() => {
        c.moveTo(-9, 0);
        c.lineTo(9, 0);
        c.moveTo(-5, -4);
        c.lineTo(-9, 0);
        c.lineTo(-5, 4);
        c.moveTo(5, -4);
        c.lineTo(9, 0);
        c.lineTo(5, 4);
      });
      break;
    case 'pen':
      c.lineWidth = 2.5;
      c.strokeStyle = bg;
      c.stroke(NIB);
      c.fillStyle = fg;
      c.fill(NIB);
      break;
    default:
      c.lineWidth = 2.5;
      c.strokeStyle = bg;
      c.stroke(ARROW);
      c.fillStyle = fg;
      c.fill(ARROW);
      if (a.shape === 'dup') {
        c.translate(15, 17);
        strokeBoth(() => {
          c.moveTo(-4, 0);
          c.lineTo(4, 0);
          c.moveTo(0, -4);
          c.lineTo(0, 4);
        }, 1.3);
        c.translate(-15, -17);
      }
  }

  if (a.label && labelAlpha > 0.01 && (a.shape === 'arrow' || a.shape === 'dup')) {
    c.font = `500 10px ${mono}`;
    c.globalAlpha = alpha * labelAlpha;
    const w = (a.labelW ??= c.measureText(a.label).width) + 12;
    c.fillStyle = fg;
    c.beginPath();
    c.roundRect(11, 15, w, 17, 4);
    c.fill();
    c.fillStyle = bg;
    c.textBaseline = 'middle';
    c.fillText(a.label, 17, 24);
  }
}

function drawRulers() {
  if (!ctx || rulerAlpha < 0.01 || W < 760) return;
  const c = ctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.globalAlpha = rulerAlpha;
  const off = (1 - rulerAlpha) * -RULER;
  c.fillStyle = fg;
  c.fillRect(0, off, W, RULER);
  c.fillRect(off, 0, RULER, H);
  c.fillStyle = bg;
  c.font = `400 9px ${mono}`;
  c.textBaseline = 'middle';
  c.globalAlpha = rulerAlpha * 0.75;
  for (let x = Math.ceil(sx / 20) * 20; x < sx + W; x += 20) {
    const major = x % 100 === 0;
    c.fillRect(x - sx, off + (major ? 0 : RULER - 4), 1, major ? RULER : 4);
    if (major && x - sx > RULER + 4) c.fillText(String(x), x - sx + 4, off + 7);
  }
  for (let y = Math.ceil(sy / 20) * 20; y < sy + H; y += 20) {
    const major = y % 100 === 0;
    c.fillRect(off + (major ? 0 : RULER - 4), y - sy, major ? RULER : 4, 1);
    if (major && y - sy > RULER + 4) {
      c.save();
      c.translate(off + 7, y - sy + 4);
      c.rotate(Math.PI / 2);
      c.fillText(String(y), 0, 0);
      c.restore();
    }
  }
  c.globalAlpha = 1;
}

function draw() {
  if (!ctx || !canvas) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const a of agents) {
    ctx.globalAlpha = 1;
    for (const f of a.fx) drawFx(f);
  }
  drawRulers();
  for (const a of agents) {
    const age = time - a.born;
    if (age < 0) continue;
    const alpha = clamp(age / 0.4, 0, 1);
    ctx.globalAlpha = alpha;
    drawCursor(a, alpha);
  }
  ctx.globalAlpha = 1;
}

/* ---------- loop ---------- */

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  time += dt;
  sx = window.scrollX;
  sy = window.scrollY;
  tick = dt * rate;

  if (building) schedule();
  for (const a of agents) {
    if (!a.job) continue;
    if (a.job.next().done) {
      if (a.task) complete(a.task, a.task.kind !== 't' && a.task.kind !== 'l' && a.task.kind !== 'g');
      a.job = null;
      a.task = null;
      a.fx = [];
      a.shape = 'arrow';
    }
  }
  flock(dt);
  rulerAlpha += ((building ? 1 : 0) - rulerAlpha) * Math.min(1, dt * 5);
  draw();
  raf = requestAnimationFrame(frame);
}

function spawn(i: number): Agent {
  const side = Math.floor(Math.random() * 4);
  const x = sx + (side === 0 ? -40 : side === 1 ? W + 40 : rand(0, W));
  const y = sy + (side === 2 ? -40 : side === 3 ? H + 40 : rand(0, H));
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    ring: rand(-34, 46),
    pace: rand(95, 150),
    phase: rand(0, Math.PI * 2),
    born: time + i * 0.05,
    shape: 'arrow',
    fx: [],
    job: null,
    task: null,
    label: LABELS[i],
  };
}

function resize() {
  if (!canvas || !ctx) return;
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const n = W < 760 ? 7 : clamp(Math.round((W * H) / 100000), 10, 14);
  if (agents.length > n) agents.length = n;
  while (agents.length < n) agents.push(spawn(agents.length));
  measure();
}

function start() {
  if (raf || !canvas || document.hidden) return;
  canvas.hidden = false;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function stop(clear = false) {
  cancelAnimationFrame(raf);
  raf = 0;
  if (clear && canvas && ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
  }
}

function syncToggle() {
  const on = wanted();
  document.querySelectorAll<HTMLButtonElement>('[data-swarm-toggle]').forEach((b) => {
    b.hidden = reduceMotion.matches;
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Swarm on' : 'Swarm off';
  });
  hudText = '';
  updateHud();
}

function apply() {
  syncToggle();
  if (wanted()) start();
  else {
    finish();
    root.classList.remove('building');
    stop(true);
  }
}

function init() {
  (window as unknown as { __swarm: boolean }).__swarm = true;
  canvas = document.getElementById('swarm') as HTMLCanvasElement | null;
  ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) {
    root.classList.remove('building');
    return;
  }

  building = root.classList.contains('building') && wanted();
  if (!building) root.classList.remove('building');
  readTheme();
  collect();
  resize();
  document.fonts?.ready.then(() => {
    readTheme();
    measure();
  });

  window.addEventListener('resize', resize);
  reduceMotion.addEventListener('change', apply);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (wanted()) start();
  });

  window.addEventListener(
    'pointermove',
    (e) => {
      pointer = { x: e.clientX, y: e.clientY, t: time, mouse: e.pointerType === 'mouse' };
    },
    { passive: true },
  );
  root.addEventListener('pointerleave', () => {
    pointer = null;
    perch = null;
  });
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    perch = (e.target as Element | null)?.closest?.('[data-swarm]') ?? null;
  });
  window.addEventListener(
    'pointerdown',
    (e) => {
      for (const a of agents) {
        if (a.job) continue;
        const dx = a.x - sx - e.clientX;
        const dy = a.y - sy - e.clientY;
        const d = Math.hypot(dx, dy) || 1;
        const kick = 620 * clamp(1 - d / 520, 0, 1);
        a.vx += (dx / d) * kick;
        a.vy += (dy / d) * kick;
      }
    },
    { passive: true },
  );

  document.addEventListener('click', (e) => {
    const el = e.target as Element | null;
    if (el?.closest?.('[data-hud-btn]')) {
      if (building) finish();
      else replay();
      return;
    }
    if (el?.closest?.('[data-swarm-toggle]')) {
      try {
        localStorage.setItem(STORE_KEY, wanted() ? 'off' : 'on');
      } catch {}
      apply();
    }
  });

  new MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);

  apply();
}

init();
