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

function palette() {
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
  const hay = items.map((i) => `${i.querySelector('span')?.textContent ?? ''} ${i.dataset.k ?? ''}`.toLowerCase());
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
      if (ok) visible.push(it);
    });
    for (const g of groups) g.hidden = !g.querySelector('[role="option"]:not([hidden])');
    empty!.hidden = visible.length > 0;
    setActive(0);
  }

  function open() {
    if (dlg!.open || root.classList.contains('intro')) return;
    input!.value = '';
    dlg!.showModal();
    filter();
    list!.scrollTop = 0;
    input!.focus();
  }

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

  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('[data-pal-open]')) open();
  });

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === 'k') {
      e.preventDefault();
      if (dlg.open) dlg.close();
      else open();
      return;
    }
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
    if (k === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });
}

intro();
palette();
