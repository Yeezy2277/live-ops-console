# Pulse — Live Ops Console

[![CI](https://github.com/Yeezy2277/live-ops-console/actions/workflows/ci.yml/badge.svg)](https://github.com/Yeezy2277/live-ops-console/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Yeezy2277/live-ops-console/actions/workflows/codeql.yml/badge.svg)](https://github.com/Yeezy2277/live-ops-console/actions/workflows/codeql.yml)

A real-time operations console for a fictional multiplayer game — the kind of
"control room" a live-ops team watches. **There is no backend:** the game world
is *simulated on the client* and painted on `<canvas>`, so the whole thing runs
as a static site on free hosting.

> **Live demo:** <https://pulse.vitaliipopov.dev> · no backend, no login

It's a deliberate change of register from the rest of my portfolio (which is
Contentful-heavy): this one is about **real-time UI** — high-frequency state,
smooth 60fps canvas rendering, and keeping React out of the hot path — the kind
of work I did owning the client UI of a real-time multiplayer game.

## What it shows

- **World map** — regions as pulsing canvas markers, sized by population and
  coloured by health (healthy / degraded / down), with a live mesh between them.
- **Live metrics** — players online, matches/min, credits/min and p95 latency,
  each with a canvas sparkline of its recent history.
- **Event stream** — a feed of world events (joins, matches, trades, incidents),
  filterable by kind and a **debounced** search box.
- **Economy** — currency balances with per-minute flow and a live item leaderboard.

## The interesting part — architecture

- **A simulation engine** ([`src/sim/world.ts`](src/sim/world.ts)) is the
  self-contained real-time data source: one `step()` advances the world
  (population random-walks, economy flows, regions degrade and recover, events
  fire). It's driven by a **seeded PRNG**, so a given seed replays identically —
  which is exactly what makes the logic unit-testable.
- **One observable store** ([`src/store/store.ts`](src/store/store.ts)) ticks the
  sim on an interval and exposes a version via `useSyncExternalStore`. Cheap
  scalar views (numbers, feed) re-render at the 4Hz tick rate.
- **Canvas views run their own `requestAnimationFrame` loop** off the store and
  never re-render through React — so the map's 60fps pulse animation is fully
  decoupled from React reconciliation. That split (cheap UI at tick rate,
  expensive drawing at frame rate) is the whole point.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # sim/RNG unit tests (node --test, no extra deps)
npm run build      # static bundle in dist/
```

Stack: React 18 · TypeScript · Vite · Canvas 2D. No runtime dependencies beyond
React — ~50 kB gzipped.
