/* ══════════════════════════════════════════════════════
   1AM STUDIO — main.js
   Zero dependencies. One RAF loop drives everything.
   ══════════════════════════════════════════════════════ */

const html = document.documentElement;
const body = document.body;

const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const lerp  = (a, b, t) => a + (b - a) * t;
const map   = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = window.matchMedia('(hover: none), (pointer: coarse)').matches;

/* ─────────────────────────────────────────────────────
   1. Smooth scroll  (virtual scroll → window.scrollTo,
      so position:sticky keeps working natively)
   ───────────────────────────────────────────────────── */
class SmoothScroll {
  constructor() {
    this.enabled  = !REDUCED && !TOUCH;
    this.current  = window.scrollY;
    this.target   = window.scrollY;
    this.velocity = 0;
    this.lastSet  = window.scrollY;
    this.ease     = 0.09;
    this.max      = 0;

    this.measure();
    if (!this.enabled) return;

    html.classList.add('lenis', 'lenis-smooth');
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  measure = () => {
    this.max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  };

  onWheel = (e) => {
    if (body.classList.contains('is-locked')) return;
    e.preventDefault();
    const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    this.target = clamp(this.target + e.deltaY * mult, 0, this.max);
  };

  /* smooth programmatic scroll (anchors) */
  scrollTo(y, duration = 1200) {
    y = clamp(y, 0, this.max);
    if (!this.enabled) { window.scrollTo({ top: y, behavior: 'smooth' }); return; }
    const from = this.current, delta = y - from, t0 = performance.now();
    this.tweening = true;
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = clamp((now - t0) / duration);
      this.target = this.current = from + delta * easeIO(t);
      window.scrollTo(0, this.current);
      this.lastSet = window.scrollY;
      if (t < 1) requestAnimationFrame(step);
      else this.tweening = false;
    };
    requestAnimationFrame(step);
  }

  update() {
    if (!this.enabled) {
      const y = window.scrollY;
      this.velocity = y - this.current;
      this.current = this.target = y;
      return;
    }
    if (this.tweening) { this.velocity = 0; return; }

    /* someone scrolled by other means (keyboard, scrollbar, find-in-page) → resync */
    if (Math.abs(window.scrollY - this.lastSet) > 2) {
      this.current = this.target = window.scrollY;
    }

    const prev = this.current;
    this.current = lerp(this.current, this.target, this.ease);
    if (Math.abs(this.target - this.current) < 0.08) this.current = this.target;
    this.velocity = this.current - prev;

    if (this.current !== prev) {
      window.scrollTo(0, this.current);
      this.lastSet = window.scrollY;
    }
  }
}

const scroller = new SmoothScroll();

/* ─────────────────────────────────────────────────────
   2. Central RAF loop
   ───────────────────────────────────────────────────── */
const ticks = [];
const onTick = (fn) => ticks.push(fn);

let raf = () => {
  scroller.update();
  const state = { y: scroller.current, v: scroller.velocity, vh: window.innerHeight, vw: window.innerWidth };
  for (let i = 0; i < ticks.length; i++) ticks[i](state);
  requestAnimationFrame(raf);
};
requestAnimationFrame(raf);

const resizers = [];
const onResize = (fn) => { resizers.push(fn); fn(); };
let rt;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => { scroller.measure(); resizers.forEach((f) => f()); }, 120);
});

/* ─────────────────────────────────────────────────────
   3. Preloader
   ───────────────────────────────────────────────────── */
(() => {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const count = document.getElementById('loaderCount');
  const fill  = document.getElementById('loaderFill');

  loader.querySelectorAll('.loader__word').forEach((w, i) => w.style.setProperty('--d', `${i * 90}ms`));
  requestAnimationFrame(() => loader.classList.add('is-ready'));

  let n = 0;
  const total = REDUCED ? 200 : 1500;
  const t0 = performance.now();

  const run = (now) => {
    const p = clamp((now - t0) / total);
    /* ease-out so it decelerates into 100 */
    n = Math.round((1 - Math.pow(1 - p, 3)) * 100);
    count.textContent = String(n).padStart(3, '0');
    fill.style.transform = `scaleX(${n / 100})`;
    if (p < 1) requestAnimationFrame(run);
    else setTimeout(finish, 260);
  };
  requestAnimationFrame(run);

  function finish() {
    loader.classList.add('is-done');
    body.classList.add('is-loaded');
    setTimeout(() => loader.remove(), 1300);
    /* kick off hero copy */
    document.querySelectorAll('.hero .line').forEach((l, i) => {
      l.style.setProperty('--d', `${i * 110}ms`);
      setTimeout(() => l.classList.add('is-in'), 120);
    });
  }
})();

/* ─────────────────────────────────────────────────────
   4. Custom cursor
   ───────────────────────────────────────────────────── */
(() => {
  if (TOUCH) return;
  const cur = document.querySelector('.cursor');
  const dot = cur.querySelector('.cursor__dot');
  const ring = cur.querySelector('.cursor__ring');
  const label = cur.querySelector('.cursor__label');

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;

  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; cur.classList.remove('is-hidden'); });
  document.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
  window.addEventListener('mousedown', () => cur.classList.add('is-down'));
  window.addEventListener('mouseup',   () => cur.classList.remove('is-down'));

  onTick(() => {
    dx = lerp(dx, mx, 0.9);  dy = lerp(dy, my, 0.9);
    rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
    dot.style.transform  = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%) scale(var(--s,1))`;
  });

  const HOVERABLE = 'a, button, [data-magnetic], [data-cursor], .acc__head, .svc';
  document.querySelectorAll(HOVERABLE).forEach((el) => {
    const mode = el.dataset.cursor;
    if (mode === 'hide') {
      el.addEventListener('mouseenter', () => cur.classList.add('is-hidden'));
      el.addEventListener('mouseleave', () => cur.classList.remove('is-hidden'));
      return;
    }
    el.addEventListener('mouseenter', () => {
      cur.classList.add('is-hover');
      if (mode) { label.textContent = mode; cur.classList.add('is-label'); }
    });
    el.addEventListener('mouseleave', () => cur.classList.remove('is-hover', 'is-label'));
  });
})();

/* ─────────────────────────────────────────────────────
   5. Scroll reveals
   ───────────────────────────────────────────────────── */
(() => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 90}ms`);
    io.observe(el);
  });

  /* masked lines outside the hero (hero is driven by the loader) */
  document.querySelectorAll('.reveal-lines').forEach((group) => {
    const lines = group.querySelectorAll('.line');
    lines.forEach((l, i) => l.style.setProperty('--d', `${i * 100}ms`));
    io.observe(group);
  });
})();

/* ─────────────────────────────────────────────────────
   6. Word-by-word highlight on the intro paragraph
   ───────────────────────────────────────────────────── */
(() => {
  const el = document.querySelector('[data-word-reveal]');
  if (!el) return;

  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  const spans = [...el.querySelectorAll('.w')];

  onTick(({ vh }) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    /* start when the block enters the lower third, finish at the upper third */
    const p = clamp(map(r.top, vh * 0.8, vh * 0.15, 0, 1));
    const upto = Math.round(p * spans.length);
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('on', i < upto);
  });
})();

/* ─────────────────────────────────────────────────────
   7. Infinite marquee (+ scroll-velocity drag)
   ───────────────────────────────────────────────────── */
(() => {
  document.querySelectorAll('[data-marquee]').forEach((wrap) => {
    const track = wrap.querySelector('.marquee__track');
    let w = 0, x = 0;
    const base = parseFloat(wrap.dataset.marqueeSpeed || '0.6');

    const build = () => {
      wrap.querySelectorAll('.marquee__track').forEach((t, i) => i && t.remove());
      w = track.getBoundingClientRect().width;
      if (!w) return;
      const need = Math.ceil(window.innerWidth / w) + 1;
      for (let i = 0; i < need; i++) wrap.appendChild(track.cloneNode(true));
    };
    onResize(build);

    onTick(({ v }) => {
      if (!w) return;
      x -= base + Math.abs(v) * 0.35;      /* scrolling speeds the marquee up */
      if (x <= -w) x += w;
      const skew = clamp(v * 0.25, -12, 12);
      wrap.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
    });
  });
})();

/* ─────────────────────────────────────────────────────
   8. Parallax media + scale-in
   ───────────────────────────────────────────────────── */
(() => {
  const items = [...document.querySelectorAll('[data-parallax]')];
  if (!items.length) return;

  onTick(({ vh }) => {
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const speed = parseFloat(el.dataset.speed || '0.12');
      const centre = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0,${(-centre * speed).toFixed(2)}px,0)`;
    }
  });
})();

/* ─────────────────────────────────────────────────────
   9. Sticky stacking work cards
   ───────────────────────────────────────────────────── */
(() => {
  const cards = [...document.querySelectorAll('[data-card]')];
  if (cards.length < 2) return;

  onTick(({ vh }) => {
    for (let i = 0; i < cards.length - 1; i++) {
      const next = cards[i + 1].getBoundingClientRect();
      const p = clamp(map(next.top, vh, vh * 0.12, 0, 1));
      cards[i].style.setProperty('--sc', (1 - p * 0.07).toFixed(4));
      cards[i].style.setProperty('--ty', `${(p * -22).toFixed(2)}px`);
    }
  });
})();

/* ─────────────────────────────────────────────────────
   10. Pinned horizontal scroll (services)
   ───────────────────────────────────────────────────── */
(() => {
  const section = document.querySelector('[data-horizontal]');
  if (!section || REDUCED) return;
  const track = section.querySelector('[data-h-track]');
  const bar   = section.querySelector('[data-h-progress]');
  let distance = 0;

  const measure = () => {
    section.style.height = 'auto';
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    /* pin for exactly as long as the track needs to travel */
    section.style.height = `${window.innerHeight + distance}px`;
    scroller.measure();
  };
  onResize(measure);
  window.addEventListener('load', measure);

  onTick(({ vh }) => {
    if (!distance) return;
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (section.offsetHeight - vh));
    track.style.transform = `translate3d(${-p * distance}px,0,0)`;
    if (bar) bar.style.transform = `scaleX(${p})`;
  });
})();

/* ─────────────────────────────────────────────────────
   11. Number counters
   ───────────────────────────────────────────────────── */
(() => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseFloat(el.dataset.count);
      const t0 = performance.now(), dur = 1600;
      const step = (now) => {
        const t = clamp((now - t0) / dur);
        el.textContent = Math.round((1 - Math.pow(1 - t, 3)) * to);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => io.observe(el));
})();

/* ─────────────────────────────────────────────────────
   12. Accordion
   ───────────────────────────────────────────────────── */
(() => {
  const items = [...document.querySelectorAll('[data-acc-item]')];
  items.forEach((item) => {
    const head = item.querySelector('.acc__head');
    const panel = item.querySelector('.acc__panel');
    head.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      items.forEach((o) => {
        o.classList.remove('is-open');
        o.querySelector('.acc__panel').style.height = '0px';
      });
      if (!open) {
        item.classList.add('is-open');
        panel.style.height = `${panel.scrollHeight}px`;
      }
    });
  });
})();

/* ─────────────────────────────────────────────────────
   13. Magnetic elements
   ───────────────────────────────────────────────────── */
(() => {
  if (TOUCH || REDUCED) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    let tx = 0, ty = 0, cx = 0, cy = 0, active = false;
    const strength = parseFloat(el.dataset.magnetic || '0.35');

    el.addEventListener('mouseenter', () => (active = true));
    el.addEventListener('mouseleave', () => { active = false; tx = ty = 0; });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
    });

    onTick(() => {
      cx = lerp(cx, tx, 0.14); cy = lerp(cy, ty, 0.14);
      if (Math.abs(cx) < 0.01 && Math.abs(cy) < 0.01 && !active) return;
      el.style.transform = `translate3d(${cx.toFixed(2)}px,${cy.toFixed(2)}px,0)`;
    });
  });
})();

/* ─────────────────────────────────────────────────────
   14. Nav: auto-hide + menu overlay + anchors
   ───────────────────────────────────────────────────── */
(() => {
  const nav = document.getElementById('nav');
  const menu = document.getElementById('menu');
  const burger = document.getElementById('burger');
  let last = 0;

  onTick(({ y }) => {
    if (menu.classList.contains('is-open')) { nav.classList.remove('is-hidden'); last = y; return; }
    nav.classList.toggle('is-hidden', y > last && y > 400);
    last = y;
  });

  menu.querySelectorAll('.menu__list a').forEach((a, i) => a.style.setProperty('--d', `${120 + i * 70}ms`));

  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  document.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = document.querySelector(el.dataset.scrollTo);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      const y = target.getBoundingClientRect().top + scroller.current - (el.dataset.scrollTo === '#top' ? 0 : 8);
      setTimeout(() => scroller.scrollTo(y), menu.classList.contains('is-open') ? 300 : 0);
    });
  });
})();

/* ─────────────────────────────────────────────────────
   15. Section theme inversion
   ───────────────────────────────────────────────────── */
(() => {
  const zone = document.getElementById('process');
  if (!zone) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => body.classList.toggle('is-light', e.isIntersecting)),
    { threshold: 0.35 }
  );
  io.observe(zone);
})();

/* ─────────────────────────────────────────────────────
   16. Clocks (studio local time)
   ───────────────────────────────────────────────────── */
(() => {
  const els = [document.getElementById('clock'), document.getElementById('clockFoot')].filter(Boolean);
  if (!els.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const tick = () => { const t = `${fmt.format(new Date())} CET`; els.forEach((e) => (e.textContent = t)); };
  tick();
  setInterval(tick, 1000);
})();
