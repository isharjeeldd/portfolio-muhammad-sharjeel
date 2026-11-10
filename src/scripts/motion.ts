// Motion layer (GSAP). Everything here waits until the swarm has built the
// element in question, then runs only while that element is on screen.
import { gsap } from 'gsap';

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends HTMLElement = HTMLElement>(sel: string, el: ParentNode = document) => el.querySelector<T>(sel);
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, el: ParentNode = document) => [...el.querySelectorAll<T>(sel)];

/* ---------- header: hide going down, return going up ---------- */

(() => {
  let lastY = window.scrollY;
  let acc = 0;
  const update = () => {
    const y = window.scrollY;
    const d = y - lastY;
    lastY = y;
    root.classList.toggle('nav-stuck', y > 90);
    if (y < 90) {
      root.classList.remove('nav-hidden');
      acc = 0;
      return;
    }
    // need a little intent in one direction before toggling
    acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
    if (acc > 36) root.classList.add('nav-hidden');
    else if (acc < -14) root.classList.remove('nav-hidden');
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------- helpers ---------- */

// Everything a page sets up is undone before the next page is set up.
let undo: (() => void)[] = [];

function watch(el: Element, cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
  const io = new IntersectionObserver(cb, opts);
  io.observe(el);
  undo.push(() => io.disconnect());
  return io;
}

function whenBuilt(el: HTMLElement, cb: () => void) {
  const pending = () =>
    root.classList.contains('building') && (el.matches('[data-b]:not(.b-on)') || !!el.querySelector('[data-b]:not(.b-on)'));
  if (!pending()) return cb();
  const check = () => {
    if (pending()) return;
    document.removeEventListener('swarm:built', check);
    document.removeEventListener('swarm:done', check);
    cb();
  };
  document.addEventListener('swarm:built', check);
  document.addEventListener('swarm:done', check);
  undo.push(() => {
    document.removeEventListener('swarm:built', check);
    document.removeEventListener('swarm:done', check);
  });
}

// Play a looping timeline only while its element is visible.
function live(el: HTMLElement, tl: gsap.core.Timeline) {
  tl.pause();
  watch(
    el,
    ([e]) => {
      if (e.isIntersecting) tl.play();
      else tl.pause();
    },
    { threshold: 0.25 },
  );
}

function typeInto(tl: gsap.core.Timeline, el: HTMLElement | null, text: string, dur: number, at?: string | number) {
  if (!el) return;
  const o = { n: 0 };
  tl.to(o, { n: text.length, duration: dur, ease: 'none', onUpdate: () => (el.textContent = text.slice(0, Math.round(o.n))) }, at);
}

function press(tl: gsap.core.Timeline, el: HTMLElement | null, at?: string | number) {
  if (!el) return;
  tl.to(el, { scale: 0.94, duration: 0.09, ease: 'power2.in' }, at).to(el, { scale: 1, duration: 0.3, ease: 'back.out(3)' });
}

function page() {
  for (const f of undo) f();
  undo = [];
  gsap.globalTimeline.clear();

  /* ---------- small things, safe under reduced motion ---------- */

  // magnetic buttons
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    $$('[data-magnet]').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
      const y = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.22);
        y((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener('pointerleave', () => {
        x(0);
        y(0);
      });
    });
  }

  if (!reduce) {
    /* ---------- numbers count up ---------- */

    $$('[data-count]').forEach((el) => {
      const end = Number(el.textContent!.replace(/,/g, ''));
      const fmt = new Intl.NumberFormat('en-US');
      const run = () => {
        const o = { v: 0 };
        watch(el, ([e], io) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          gsap.to(o, { v: end, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = fmt.format(Math.round(o.v))) });
        });
      };
      whenBuilt(el, run);
    });

    /* ---------- system map: a request travels down the stack ---------- */

    const map = $('[data-map]');
    if (map) {
      const log = $('[data-maplog]', map)!;
      const node = (k: string) => $(`[data-node="${k}"]`, map)!;
      const dot = (k: string) => $(`[data-wire="${k}"] b`, map)!;
      const svcs = $$('[data-svc]', map);
      const names = ['Alara Code', 'Alara Space', 'Alara Plan', 'ODIN'];
      const calls = ['GET /session', 'POST /refresh', 'GET /permissions', 'GET /workspaces'];
      let busy = false;
      let visible = false;
      let timer = 0;

      const travel = (tl: gsap.core.Timeline, k: string) => {
        const d = dot(k);
        const h = d.parentElement!.offsetHeight;
        tl.set(d, { y: 0, opacity: 1 }).to(d, { y: h, duration: 0.32, ease: 'power1.in' }).set(d, { opacity: 0 });
      };
      const flash = (tl: gsap.core.Timeline, el: HTMLElement, hold = 0.28) => {
        tl.call(() => el.classList.add('hot')).to({}, { duration: hold }).call(() => el.classList.remove('hot'));
      };

      const send = (i: number) => {
        if (busy) return;
        busy = true;
        const ms = 18 + Math.round(Math.random() * 40);
        const call = calls[Math.floor(Math.random() * calls.length)];
        const svc = svcs[call.includes('permissions') ? 0 : Math.floor(Math.random() * svcs.length)];
        const tl = gsap.timeline({
          onComplete: () => {
            busy = false;
            queue();
          },
        });
        tl.call(() => (log.textContent = `${names[i]} → ${call}`));
        flash(tl, node(`p${i}`), 0.22);
        travel(tl, `p${i}`);
        flash(tl, node('sdk'), 0.22);
        travel(tl, 'sdk');
        tl.call(() => svc.classList.add('hot'));
        tl.to(node('core'), { scale: 1.006, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' });
        travel(tl, 'core');
        flash(tl, node('k8s'), 0.22);
        tl.call(() => {
          svc.classList.remove('hot');
          log.textContent = `${names[i]} → ${call} · 200 in ${ms} ms`;
        });
      };
      const queue = () => {
        clearTimeout(timer);
        if (visible) timer = window.setTimeout(() => send(Math.floor(Math.random() * 4)), 1300);
      };

      whenBuilt(map, () => {
        names.forEach((_, i) => node(`p${i}`).addEventListener('pointerenter', () => send(i)));
        watch(
          map,
          ([e]) => {
            visible = e.isIntersecting;
            if (visible) queue();
            else clearTimeout(timer);
          },
          { threshold: 0.3 },
        );
        undo.push(() => {
          visible = false;
          clearTimeout(timer);
        });
      });
    }

    /* ---------- about: one feature moving through its statuses ---------- */

    const gate = $('[data-gate]');
    if (gate) {
      whenBuilt(gate, () => {
        const cells = $$('[data-status-cell]', gate);
        const token = $('[data-token]', gate)!;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
        const centre = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2 - 4;
        tl.set(token, { x: () => centre(cells[0]), opacity: 1 });
        cells.forEach((c, i) => {
          tl.to(token, { x: () => centre(c), duration: i ? 0.5 : 0.01, ease: 'power2.inOut' })
            .call(() => c.classList.add('hot'))
            // the gate holds longer: tests have to exist before work starts
            .to({}, { duration: i === 1 ? 1.5 : 0.75 })
            .call(() => c.classList.remove('hot'));
        });
        tl.to(token, { opacity: 0, duration: 0.2 });
        live(gate, tl);
      });
    }

    /* ---------- product mock-ups ---------- */

    const mocks: Record<string, (el: HTMLElement) => gsap.core.Timeline | void> = {
      // toggle permissions across the matrix, then press the button
      polyx(el) {
        const boxes = $$('[data-cb]', el);
        const order = [3, 6, 7, 9, 12, 13, 2, 10];
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
        order.forEach((i) => {
          const b = boxes[i];
          if (!b) return;
          tl.to(b, { scale: 0.7, duration: 0.08 }, '+=0.45')
            .call(() => b.classList.toggle('on'))
            .to(b, { scale: 1, duration: 0.25, ease: 'back.out(4)' });
        });
        press(tl, $('[data-press]', el), '+=0.5');
        return tl;
      },

      // type credentials, continue, and the session lands on the server
      'polyx-sdk'(el) {
        const signin = $('[data-signin]', el)!;
        const signed = $('[data-signed]', el)!;
        const cookie = $('[data-cookie]', el)!;
        const email = $('[data-email]', el)!;
        const pass = $('[data-pass]', el)!;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
        tl.call(() => {
          email.textContent = pass.textContent = '';
          cookie.textContent = 'not set';
        });
        typeInto(tl, email, 'sara@northwind.dev', 1.1, '+=0.6');
        typeInto(tl, pass, '••••••••••', 0.6, '+=0.2');
        press(tl, $('[data-press]', el), '+=0.3');
        tl.to(signin, { autoAlpha: 0, y: -8, duration: 0.3, ease: 'power2.in' })
          .call(() => (cookie.textContent = 'sealed, httpOnly'))
          .fromTo(signed, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' })
          .fromTo(cookie, { scale: 1.25 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, '<')
          .to(signed, { autoAlpha: 0, duration: 0.3 }, '+=2.2')
          .to(signin, { autoAlpha: 1, y: 0, duration: 0.3 });
        return tl;
      },

      // a document is written, waits for review, gets approved, the next begins
      'alara-code'(el) {
        const steps = $$('[data-step]', el);
        const lines = $$('[data-line]', el);
        const name = $('[data-stepname]', el)!;
        const status = $('[data-status]', el)!;
        const actions = $('[data-actions]', el)!;
        const ok = $('[data-ok]', el)!;
        const tl = gsap.timeline({ repeat: -1 });
        const first = 3;
        for (let s = first; s < steps.length; s++) {
          tl.call(() => {
            steps.forEach((st, i) => {
              st.classList.toggle('done', i < s);
              st.classList.toggle('on', i === s);
            });
            name.textContent = steps[s].querySelector('em')!.textContent;
            status.textContent = 'Writing';
          })
            .set(actions, { autoAlpha: 0 })
            .set(ok, { autoAlpha: 0 })
            .set(lines, { scaleX: 0 })
            .to(lines, { scaleX: 1, duration: 0.22, stagger: 0.12, ease: 'power2.out' })
            .call(() => (status.textContent = 'Awaiting your review'))
            .to(actions, { autoAlpha: 1, duration: 0.25 });
          press(tl, $('[data-press]', el), '+=0.9');
          tl.to(actions, { autoAlpha: 0, duration: 0.15 })
            .call(() => (status.textContent = 'Approved'))
            .to(ok, { autoAlpha: 1, duration: 0.2 })
            .to({}, { duration: 0.7 });
        }
        return tl;
      },

      // an agent adds a line to the page, and history records it
      'alara-space'(el) {
        const row = $('[data-newline]', el)!;
        const text = $('[data-agent-text]', el)!;
        const ver = $('[data-newver]', el)!;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
        tl.set(row, { autoAlpha: 0, height: 0 })
          .set(ver, { autoAlpha: 0, height: 0 })
          .call(() => (text.textContent = ''))
          .to(row, { autoAlpha: 1, height: 18, duration: 0.3, ease: 'power2.out' }, '+=1');
        typeInto(tl, text, 'Smoke test passed on production', 1.3);
        tl.to(ver, { autoAlpha: 1, height: 14, duration: 0.35, ease: 'power2.out' }, '+=0.3').to({}, { duration: 2.6 });
        return tl;
      },

      // one card walks the board, column by column
      'alara-plan'(el) {
        const card = $('[data-mover]', el)!;
        const cols = $$('[data-col]', el);
        const tl = gsap.timeline({ repeat: -1 });
        const hop = (to: number) => {
          tl.to({}, { duration: 1.1 }).call(() => {
            const a = card.getBoundingClientRect();
            cols[to].appendChild(card);
            const b = card.getBoundingClientRect();
            gsap.fromTo(
              card,
              { x: a.left - b.left, y: a.top - b.top, rotate: -2 },
              { x: 0, y: 0, rotate: 0, duration: 0.6, ease: 'power3.inOut', overwrite: true },
            );
          });
        };
        hop(1);
        hop(2);
        hop(3);
        tl.to({}, { duration: 1.6 })
          .to(card, { autoAlpha: 0, duration: 0.25 })
          .call(() => cols[0].insertBefore(card, cols[0].children[1] ?? null))
          .to(card, { autoAlpha: 1, duration: 0.3 });
        return tl;
      },

      // a conversation arrives message by message; sentiment follows
      odin(el) {
        const bubbles = $$('[data-bubble]', el);
        const typing = $('[data-typing]', el)!;
        const mood = $('[data-sentiment]', el)!;
        const meter = $('[data-meter]', el)!;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
        tl.set(bubbles, { autoAlpha: 0, y: 8 })
          .set(typing, { autoAlpha: 0 })
          .set(meter, { scaleX: 0.4 })
          .call(() => (mood.textContent = 'neutral'));
        bubbles.forEach((b, i) => {
          tl.to(typing, { autoAlpha: 1, duration: 0.15 }, '+=0.5')
            .to($$('i', typing), { y: -3, duration: 0.18, stagger: 0.08, yoyo: true, repeat: 1 })
            .to(typing, { autoAlpha: 0, duration: 0.1 })
            .to(b, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' });
          if (i === bubbles.length - 1) {
            tl.call(() => (mood.textContent = 'positive')).to(meter, { scaleX: 0.92, duration: 0.6, ease: 'power3.out' });
          }
        });
        tl.to({}, { duration: 2.4 });
        return tl;
      },
    };

    $$('[data-mock]').forEach((el) => {
      const make = mocks[el.dataset.mock!];
      if (!make) return;
      whenBuilt(el, () => {
        const tl = make(el);
        if (tl) live(el, tl);
      });
    });
  }
}

page();
document.addEventListener('astro:after-swap', page);
