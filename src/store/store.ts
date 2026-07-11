import { useSyncExternalStore } from "react";
import { World } from "../sim/world";

/**
 * A single observable store around the simulated world. The sim ticks on a
 * fixed interval; React subscribers read a monotonic `version` via
 * useSyncExternalStore. High-frequency views (map, sparklines) don't subscribe
 * here — they run their own requestAnimationFrame loop off `store.world`, so
 * 60fps canvas rendering never touches React reconciliation. That split is the
 * point: cheap scalar UI re-renders at the tick rate; expensive drawing is
 * decoupled.
 */
const TICK_MS = 250;

class Store {
  readonly world = new World(Date.now() % 100000);
  version = 0;
  running = true;
  private listeners = new Set<() => void>();

  constructor() {
    setInterval(() => {
      if (!this.running) return;
      this.world.step();
      this.version++;
      this.listeners.forEach((l) => l());
    }, TICK_MS);
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
    this.listeners.forEach((l) => l());
  };
}

export const store = new Store();

/** Re-render on every tick (use for cheap scalar views only). */
export function useTick(): number {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
