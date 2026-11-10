// The loader shown on the first page of a visit, and the command menu.

import { setSound, soundOn } from './sound';

const root = document.documentElement;
(window as unknown as { __shell: boolean }).__shell = true;

/* ---------- loader ---------- */

function intro() {
  const el = document.querySelector<HTMLElement>('[data-intro]');
  if (!el || !root.classList.contains('intro')) return;

  const behind = document.querySelectorAll<HTMLElement>('.top, .frame, .dock, .skip');
  behind.forEach((n) => (n.inert = true));

  const num = el.querySelector<HTMLElement>('[data-intro-n]');
  const line = el.querySelector<HTMLElement>('[data-intro-line]');
  const btns = el.querySelectorAll<HTMLButtonElement>('[data-intro-enter]');

  let fonts = false;
  const fontsDone = () => (fonts = true);
  (document.fonts?.ready ?? Promise.resolve()).then(fontsDone, fontsDone);
  setTimeout(fontsDone, 2500);

  const t0 = performance.now();
  const DUR = 1100;
  let shown = -1;
  const step = (now: number) => {
    // Runs to 90 on a timer, then waits for the fonts before it finishes.
    const p = Math.min(1, (now - t0) / DUR);
    const v = Math.round((fonts ? 100 : 90) * (1 - Math.pow(1 - p, 3)));
    if (v !== shown && num) num.textContent = String(v).padStart(3, '0');
    shown = v;
    if (v < 100) requestAnimationFrame(step);
    else ready();
  };
  requestAnimationFrame(step);

  function ready() {
    if (line) line.textContent = 'The swarm is ready to build this page';
    el!.classList.add('ready');
    btns.forEach((b) => (b.disabled = false));
    btns[0]?.focus({ preventScroll: true });
  }

  function enter(withSound: boolean) {
    try {
      sessionStorage.setItem('entered', '1');
    } catch {}
    setSound(withSound);
    behind.forEach((n) => (n.inert = false));
    el!.classList.add('leaving');
    root.classList.remove('intro');
    setTimeout(() => el!.classList.remove('leaving'), 650);
  }

  el.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-intro-enter]');
    if (b && !b.disabled) enter(b.dataset.introEnter === 'on');
  });
}

/* ---------- command menu ---------- */

let openMenu: (() => void) | null = null;
let closeMenu: (() => void) | null = null;

// Binds to the menu in the current page. Runs again whenever the page content is swapped.
function palette() {
  openMenu = closeMenu = null;
  const dlg = document.querySelector<HTMLDialogElement>('[data-pal]');
  const input = dlg?.querySelector<HTMLInputElement>('[data-pal-input]');
  const list = dlg?.querySelector<HTMLElement>('[data-pal-list]');
  const empty = dlg?.querySelector<HTMLElement>('[data-pal-empty]');
  if (!dlg || !input || !list || typeof dlg.showModal !== 'function') {
    document.querySelectorAll<HTMLElement>('[data-pal-open]').forEach((b) => (b.hidden = true));
    return;
  }

  const items = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
  const groups = [...list.querySelectorAll<HTMLElement>('[data-pal-group]')];
  // Only what is shown is searched, so every result can be seen to match.
  const texts = items.map((i) => [...i.querySelectorAll<HTMLElement>('[data-pal-text]')].map((el) => ({ el, raw: el.textContent ?? '' })));
  const hay = texts.map((t) => t.map((x) => x.raw).join(' ').toLowerCase());
  const count = dlg.querySelector<HTMLElement>('[data-pal-count]');
  const asked = dlg.querySelector<HTMLElement>('[data-pal-q]');
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const mark = (raw: string, words: string[]) => {
    if (!words.length) return esc(raw);
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return raw
      .split(re)
      .map((part, n) => (n % 2 ? `<mark>${esc(part)}</mark>` : esc(part)))
      .join('');
  };
  let visible: HTMLElement[] = items;
  let active = 0;

  if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.querySelectorAll('[data-pal-open] kbd').forEach((k) => (k.textContent = 'Ctrl K'));
  }

  function setActive(i: number, scroll = true) {
    if (!visible.length) {
      input!.removeAttribute('aria-activedescendant');
      return;
    }
    active = (i + visible.length) % visible.length;
    for (const it of items) it.setAttribute('aria-selected', 'false');
    const cur = visible[active];
    cur.setAttribute('aria-selected', 'true');
    input!.setAttribute('aria-activedescendant', cur.id);
    if (scroll) cur.scrollIntoView({ block: 'nearest' });
  }

  function filter() {
    const words = input!.value.toLowerCase().split(/\s+/).filter(Boolean);
    visible = [];
    items.forEach((it, i) => {
      const ok = words.every((w) => hay[i].includes(w));
      it.hidden = !ok;
      if (!ok) return;
      visible.push(it);
      for (const t of texts[i]) t.el.innerHTML = mark(t.raw, words);
    });
    if (count) count.textContent = words.length ? `${visible.length} ${visible.length === 1 ? 'result' : 'results'}` : `${items.length} places to go`;
    if (asked) asked.textContent = `"${input!.value.trim()}"`;
    for (const g of groups) g.hidden = !g.querySelector('[role="option"]:not([hidden])');
    empty!.hidden = visible.length > 0;
    setActive(0);
  }

  openMenu = () => {
    if (dlg.open) return dlg.close();
    if (root.classList.contains('intro')) return;
    input.value = '';
    dlg.showModal();
    filter();
    list.scrollTop = 0;
    input.focus();
  };
  closeMenu = () => dlg.open && dlg.close();

  function run(act: string, el: HTMLElement) {
    if (act === 'theme') document.querySelector<HTMLElement>('[data-theme-toggle]')?.click();
    else if (act === 'swarm') document.querySelector<HTMLElement>('[data-swarm-toggle]')?.click();
    else if (act === 'build') document.querySelector<HTMLElement>('[data-hud-btn]')?.click();
    else if (act === 'sound') setSound(!soundOn());
    else if (act === 'email') {
      const hint = el.querySelector('small');
      navigator.clipboard?.writeText(dlg!.dataset.email ?? '').then(
        () => hint && (hint.textContent = 'Copied'),
        () => hint && (hint.textContent = dlg!.dataset.email ?? ''),
      );
      return; // stay open so the result can be read
    }
    dlg!.close();
  }

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') setActive(active + 1);
    else if (e.key === 'ArrowUp') setActive(active - 1);
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(visible.length - 1);
    else if (e.key === 'Enter') visible[active]?.click();
    else return;
    e.preventDefault();
  });

  list.addEventListener('pointermove', (e) => {
    const it = (e.target as Element).closest<HTMLElement>('[role="option"]');
    const i = it ? visible.indexOf(it) : -1;
    if (i >= 0 && i !== active) setActive(i, false);
  });

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) return dlg.close(); // the backdrop
    const it = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (!it) return;
    if (it.dataset.act) run(it.dataset.act, it);
    else dlg.close();
  });
}

/* ---------- small per-page things ---------- */

let clock = 0;
const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function page() {
  // External links open in a new tab.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((a) => {
    if (a.host === location.host || a.target === '_blank') return;
    a.target = '_blank';
    a.rel = `${a.rel ? `${a.rel} ` : ''}noopener noreferrer`;
  });

  clearInterval(clock);
  const el = document.querySelector<HTMLElement>('[data-clock]');
  if (el) {
    const t = () => (el.textContent = clockFmt.format(new Date()));
    t();
    clock = window.setInterval(t, 1000);
  }

  palette();
}

// These listen on the document, which survives page changes, so they are added once.
document.addEventListener('click', (e) => {
  if ((e.target as Element | null)?.closest?.('[data-pal-open]')) openMenu?.();
});

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === 'k') {
    e.preventDefault();
    openMenu?.();
    return;
  }
  const t = e.target as HTMLElement | null;
  const typing = !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
  if (k === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    openMenu?.();
  }
});

document.addEventListener('astro:before-swap', () => closeMenu?.());
document.addEventListener('astro:after-swap', page);

intro();
page();
