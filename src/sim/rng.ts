/**
 * Small seeded PRNG (mulberry32). Deterministic given a seed — so the whole
 * simulation is reproducible and its logic is unit-testable without mocking
 * Math.random.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** float in [0, 1) */
    next,
    /** float in [min, max) */
    range: (min: number, max: number) => min + next() * (max - min),
    /** integer in [min, max] inclusive */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** true with probability p */
    chance: (p: number) => next() < p,
    /** uniformly pick an element */
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
  };
}

export type Rng = ReturnType<typeof createRng>;
