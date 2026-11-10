// Small synthesised sounds for the swarm. No audio files. Off until the visitor asks for it.

const KEY = 'sound';
const root = document.documentElement;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastKey = 0;
let lastHover = 0;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function sync() {
  const on = soundOn();
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Sound on' : 'Sound off';
  });
}

// Browsers only allow audio after a click or key press, so this is called from those.
export function unlock() {
  if (!soundOn()) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.4);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {}
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {}
  if (on) {
    unlock();
    sfx.pop();
  }
  sync();
}

function ready(): boolean {
  return !!ctx && !!master && ctx.state === 'running' && soundOn() && !document.hidden && !root.classList.contains('intro');
}

function tone(f0: number, f1: number, dur: number, vol: number, delay = 0, type: OscillatorType = 'sine') {
  if (!ready()) return;
  const t = ctx!.currentTime + delay;
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hiss(f0: number, f1: number, dur: number, vol: number, q = 1.2) {
  if (!ready() || !noise) return;
  const t = ctx!.currentTime;
  const s = ctx!.createBufferSource();
  s.buffer = noise;
  const bp = ctx!.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp).connect(g).connect(master!);
  s.start(t, Math.random() * 0.2, dur + 0.02);
}

export const sfx = {
  // One key press. Several cursors type at once, so this is rate limited.
  key() {
    const now = performance.now();
    if (now - lastKey < 42) return;
    lastKey = now;
    const f = 1700 + Math.random() * 1500;
    hiss(f, f * 0.8, 0.028, 0.16, 1.6);
  },
  // A box lands.
  pop() {
    tone(420, 210, 0.09, 0.12);
  },
  // A line or guide is drawn.
  stroke() {
    hiss(700, 2600, 0.2, 0.05, 0.9);
  },
  // The cursors gather round something.
  hover() {
    const now = performance.now();
    if (now - lastHover < 120) return;
    lastHover = now;
    tone(880, 860, 0.05, 0.035);
  },
  // A click scatters them.
  click() {
    tone(190, 80, 0.13, 0.14);
  },
  // The page is finished.
  done() {
    tone(660, 660, 0.22, 0.06);
    tone(990, 990, 0.34, 0.05, 0.11);
  },
};

// Sound was chosen on an earlier page of this visit: start it again straight away.
// Chrome carries the permission across pages of the same site. Browsers that do not
// will start at the next click or key press through the listeners below.
unlock();
document.addEventListener('pointerdown', unlock, { passive: true });
document.addEventListener('touchend', unlock, { passive: true });
document.addEventListener('keydown', unlock);
document.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest?.('[data-sound-toggle]')) setSound(!soundOn());
});
sync();
document.addEventListener('astro:after-swap', sync);
