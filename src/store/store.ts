import { useSyncExternalStore } from "react";
import { AlertEngine } from "../sim/alerts";
import { World, type IncidentKind } from "../sim/world";

/**
 * A single observable store around the simulated world. The sim ticks on a
 * fixed interval; React subscribers read a monotonic `version` via
 * useSyncExternalStore. High-frequency views (map, sparklines) don't subscribe
 * here — they run their own requestAnimationFrame loop off `store.world`, so
 * 60fps canvas rendering never touches React reconciliation. That split is the
 * point: cheap scalar UI re-renders at the tick rate; expensive drawing is
 * decoupled. `perf` counts both sides so the page can prove it.
 */
const TICK_MS = 250;

/** `?seed=123` replays a run; otherwise a fresh seed per visit. */
function initialSeed(): number {
  try {
    const s = Number(new URLSearchParams(window.location.search).get("seed"));
    if (Number.isInteger(s) && s > 0) return s;
  } catch {
    /* no window (tests) */
  }
  return 1 + Math.floor(Math.random() * 99_999);
}

class Store {
  readonly seed = initialSeed();
  readonly world = new World(this.seed);
  readonly alerts = new AlertEngine();
  version = 0;
  running = true;
  /** Raw counters; the HUD turns them into per-second rates. */
  readonly perf = { reactRenders: 0, canvasFrames: 0, frameMsTotal: 0 };
  private listeners = new Set<() => void>();

  constructor() {
    setInterval(() => {
      if (this.running) this.advance();
    }, TICK_MS);
  }

  private advance() {
    this.world.step();
    const { opened, resolved } = this.alerts.evaluate(this.world.tick, this.world.regions);
    for (const a of opened) this.world.log("alert", a.region, `ALERT ${a.label}, ${a.region}`, a.severity);
    for (const a of resolved) this.world.log("recover", a.region, `RESOLVED ${a.label}, ${a.region}`, "info");
    this.notify();
  }

  private notify() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.version;

  toggle = () => {
    this.running = !this.running;
    this.notify();
  };

  /** Advance exactly one tick while paused: walk an incident frame by frame. */
  stepOnce = () => {
    if (!this.running) this.advance();
  };

  inject = (regionId: string, kind: IncidentKind) => {
    if (this.world.inject(regionId, kind)) this.notify();
  };

  acknowledge = (alertId: number) => {
    if (this.alerts.acknowledge(alertId)) this.notify();
  };
}

export const store = new Store();

/** Re-render on every tick (use for cheap scalar views only). */
export function useTick(): number {
  // Counted during render on purpose: this is exactly the work the HUD reports.
  store.perf.reactRenders++;
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
