# 1AM Studio — site

A single-page studio site built in the style of award-winning creative-studio
sites (Awwwards/FWA genre): inertia scrolling, a preloader, a custom cursor,
pinned horizontal scroll, sticky stacking project cards and scroll-driven
type reveals.

**No dependencies, no build step.** Everything is hand-rolled vanilla JS —
no GSAP, no Lenis, no Locomotive. Open `index.html` and it runs.

## Run it

```bash
python3 -m http.server 8000   # or: npx serve .
# → http://localhost:8000
```

## Files

```
index.html            markup + all copy
assets/css/main.css   design tokens, layout, all transitions
assets/js/main.js     scroll engine + every effect
assets/img/*.svg      generated placeholder artwork
```

## How the motion works

Everything is driven by **one `requestAnimationFrame` loop** (`main.js` §2).
Modules register via `onTick(fn)` and receive `{ y, v, vh, vw }` — scroll
position, scroll velocity and viewport size. One loop, one layout read per
frame, no competing observers.

| # | Effect | Notes |
|---|--------|-------|
| 1 | Smooth scroll | Virtual scroll: intercepts `wheel`, lerps toward a target, then calls `window.scrollTo`. Because it drives the *real* scroll position, `position: sticky` keeps working natively — unlike transform-based smooth scroll, which breaks it. Resyncs when the user scrolls by keyboard, scrollbar or find-in-page. |
| 3 | Preloader | Cubic-eased 000→100 counter, then a curtain wipe that hands off to the hero line reveal. |
| 4 | Custom cursor | Two elements lerped at different rates (dot fast, ring slow) so the ring trails. `mix-blend-mode: difference` inverts it over any background. `data-cursor="View"` puts a label in the ring; `data-cursor="hide"` hides it. |
| 6 | Word highlight | The intro paragraph is split into `<span>`s at runtime and lit word-by-word against scroll progress. |
| 7 | Marquee | Clones its track to fill the viewport, wraps by modulo, and **skews with scroll velocity** — it speeds up and leans as you scroll. |
| 9 | Stacking cards | Each card scales down and lifts as the next one rises over it, using native `position: sticky` plus a CSS-variable transform. |
| 10 | Pinned horizontal | The section's height is set in JS to `viewport + trackWidth`, so vertical scroll maps 1:1 to horizontal travel while the sticky inner stays pinned. Re-measured on resize. |
| 13 | Magnetic buttons | Elements lerp toward the cursor inside their bounds. Tune per element: `data-magnetic="0.5"`. |
| 15 | Theme inversion | The whole page flips to the light palette when the process section is in view — just CSS custom properties swapping. |

## Customising

- **Colours / type / spacing** — the `:root` block at the top of `main.css`. `--accent` is the acid-lime; `.is-light` is the inverted palette.
- **Parallax depth** — `data-speed="0.18"` on any `[data-parallax]` element.
- **Scroll feel** — `this.ease` in `SmoothScroll` (lower = heavier glide).
- **Images** — drop real files into `assets/img/` and swap the `src`s. The placeholders are procedurally generated SVGs, so they cost nothing and need no network.
- **Fonts** — Archivo / Instrument Serif / Space Grotesk via Google Fonts, with system fallbacks.

## Accessibility

`prefers-reduced-motion` is fully honoured: smooth scroll, parallax, magnetics,
grain and the horizontal pin all switch off, and the pinned section reflows to
a normal wrapping grid. Focus states are visible throughout, the menu closes on
`Escape`, and the cursor is disabled on touch/coarse pointers.
