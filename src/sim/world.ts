import { createRng, type Rng } from "./rng.ts";

/**
 * The simulated game world. One `tick()` advances it by a fixed step: regions
 * gain/lose players, the economy flows, matches resolve, and events fire. It's
 * a self-contained real-time data source — the analog of the live game backend
 * an ops console would read, but running entirely client-side and deterministic
 * given its seed (so the logic is unit-testable and reproducible).
 */

export type RegionStatus = "healthy" | "degraded" | "down";

export type Region = {
  id: string;
  name: string;
  /** normalized map coordinates in [0,1] */
  x: number;
  y: number;
  players: number;
  capacity: number;
  latencyMs: number;
  status: RegionStatus;
};

export type EventKind = "join" | "leave" | "match" | "trade" | "alert" | "recover";
export type IncidentKind = "latency" | "outage" | "surge";
export type Severity = "info" | "warn" | "critical";

export type GameEvent = {
  id: number;
  tick: number;
  kind: EventKind;
  region: string;
  message: string;
  severity: Severity;
};

export type Currency = { name: string; balance: number; flowPerMin: number };
export type Item = { name: string; volume: number };

export type Metrics = {
  playersOnline: number;
  matchesPerMin: number;
  creditsPerMin: number;
  p95LatencyMs: number;
};

const REGION_SEED: Omit<Region, "players" | "latencyMs" | "status">[] = [
  { id: "na-e", name: "NA-East", x: 0.24, y: 0.4, capacity: 9000 },
  { id: "na-w", name: "NA-West", x: 0.12, y: 0.46, capacity: 7000 },
  { id: "sa-e", name: "SA-East", x: 0.31, y: 0.72, capacity: 5000 },
  { id: "eu-c", name: "EU-Central", x: 0.52, y: 0.34, capacity: 11000 },
  { id: "eu-n", name: "EU-North", x: 0.5, y: 0.24, capacity: 6000 },
  { id: "apac", name: "APAC", x: 0.82, y: 0.52, capacity: 12000 },
];

const ITEM_NAMES = ["Nova Crate", "Ion Blade", "Warp Cell", "Aegis Shard", "Flux Coil", "Void Sigil"];
const TICKS_PER_MIN = 240; // at 250ms/tick

const HISTORY = 120;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export class World {
  tick = 0;
  regions: Region[];
  economy: { currencies: Currency[]; topItems: Item[] };
  metrics: Metrics;
  history: { players: number[]; matches: number[]; credits: number[]; latency: number[] };
  events: GameEvent[] = [];

  private rng: Rng;
  private eventSeq = 0;
  private matchAccum = 0;
  private creditAccum = 0;

  constructor(seed = 1337) {
    this.rng = createRng(seed);
    this.regions = REGION_SEED.map((r) => ({
      ...r,
      players: Math.floor(r.capacity * this.rng.range(0.35, 0.7)),
      latencyMs: this.rng.int(24, 60),
      status: "healthy" as RegionStatus,
    }));
    this.economy = {
      currencies: [
        { name: "Credits", balance: this.rng.int(4_000_000, 6_000_000), flowPerMin: 0 },
        { name: "Gems", balance: this.rng.int(180_000, 240_000), flowPerMin: 0 },
      ],
      topItems: ITEM_NAMES.map((name) => ({ name, volume: this.rng.int(200, 900) })),
    };
    this.metrics = { playersOnline: 0, matchesPerMin: 0, creditsPerMin: 0, p95LatencyMs: 0 };
    this.history = { players: [], matches: [], credits: [], latency: [] };
    this.recompute();
  }

  /** Public entry for events raised outside the sim (alerting, operator actions). */
  log(kind: EventKind, region: string, message: string, severity: Severity) {
    this.emit(kind, region, message, severity);
  }

  private emit(kind: EventKind, region: string, message: string, severity: Severity) {
    this.events.unshift({ id: ++this.eventSeq, tick: this.tick, kind, region, message, severity });
    if (this.events.length > 200) this.events.length = 200;
  }

  private recompute() {
    const players = this.regions.reduce((s, r) => s + r.players, 0);
    const latencies = this.regions.map((r) => r.latencyMs).sort((a, b) => a - b);
    const p95 = latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] ?? 0;
    this.metrics = {
      playersOnline: players,
      matchesPerMin: Math.round(this.matchAccum * TICKS_PER_MIN),
      creditsPerMin: Math.round(this.creditAccum * TICKS_PER_MIN),
      p95LatencyMs: p95,
    };
  }

  private pushHistory() {
    const push = (arr: number[], v: number) => {
      arr.push(v);
      if (arr.length > HISTORY) arr.shift();
    };
    push(this.history.players, this.metrics.playersOnline);
    push(this.history.matches, this.metrics.matchesPerMin);
    push(this.history.credits, this.metrics.creditsPerMin);
    push(this.history.latency, this.metrics.p95LatencyMs);
  }

  /**
   * Operator-triggered incident, for the demo controls. Deterministic (no RNG),
   * so a replayed seed plus the same injections at the same ticks reproduces a run.
   * The world's normal dynamics then take over: latency decays, regions recover.
   */
  inject(regionId: string, kind: IncidentKind) {
    const r = this.regions.find((x) => x.id === regionId);
    if (!r) return false;
    if (kind === "latency") {
      r.status = "degraded";
      r.latencyMs = clamp(r.latencyMs + 220, 12, 800);
      this.emit("alert", r.name, `Operator injected a latency spike in ${r.name}`, "warn");
    } else if (kind === "outage") {
      r.status = "down";
      r.latencyMs = 400;
      this.emit("alert", r.name, `Operator took ${r.name} offline`, "critical");
    } else {
      r.players = Math.min(r.capacity, Math.round(r.players + r.capacity * 0.35));
      this.emit("join", r.name, `Operator injected a player surge into ${r.name}`, "warn");
    }
    this.recompute();
    return true;
  }

  step() {
    this.tick++;
    this.matchAccum = 0;
    this.creditAccum = 0;

    for (const r of this.regions) {
      // Player count random-walks with a gentle pull toward ~65% capacity.
      const target = r.capacity * 0.65;
      const drift = (target - r.players) * 0.01;
      r.players = Math.round(
        clamp(r.players + drift + this.rng.range(-r.capacity * 0.02, r.capacity * 0.02), 0, r.capacity),
      );

      // Latency wanders; degraded regions run hotter.
      const base = r.status === "healthy" ? 40 : r.status === "degraded" ? 120 : 400;
      r.latencyMs = Math.round(clamp(r.latencyMs + (base - r.latencyMs) * 0.1 + this.rng.range(-6, 6), 12, 800));

      // Rare status transitions, surfaced as events.
      if (r.status === "healthy" && this.rng.chance(0.004)) {
        r.status = "degraded";
        this.emit("alert", r.name, `${r.name} latency spike — p95 climbing`, "warn");
      } else if (r.status === "degraded") {
        if (this.rng.chance(0.02)) {
          r.status = "down";
          this.emit("alert", r.name, `${r.name} node dropped from the pool`, "critical");
        } else if (this.rng.chance(0.06)) {
          r.status = "healthy";
          this.emit("recover", r.name, `${r.name} recovered — latency nominal`, "info");
        }
      } else if (r.status === "down" && this.rng.chance(0.05)) {
        r.status = "degraded";
        this.emit("recover", r.name, `${r.name} back online, draining backlog`, "info");
      }

      // Match + economy throughput scales with population.
      const matches = (r.players / 1000) * this.rng.range(0.2, 0.5);
      this.matchAccum += matches;
      this.creditAccum += matches * this.rng.range(60, 140);
    }

    // Economy balances drift with flow.
    const perMinCredits = Math.round(this.creditAccum * TICKS_PER_MIN);
    this.economy.currencies[0]!.flowPerMin = perMinCredits;
    this.economy.currencies[0]!.balance += Math.round(this.creditAccum);
    const gemFlow = this.rng.int(-40, 120);
    this.economy.currencies[1]!.flowPerMin = gemFlow * TICKS_PER_MIN;
    this.economy.currencies[1]!.balance = Math.max(0, this.economy.currencies[1]!.balance + gemFlow);

    // Item trade volumes wander; keep the leaderboard sorted.
    for (const it of this.economy.topItems) {
      it.volume = Math.max(0, it.volume + this.rng.int(-25, 30));
    }
    this.economy.topItems.sort((a, b) => b.volume - a.volume);

    // Flavor events, rate-limited so the feed reads naturally.
    if (this.rng.chance(0.5)) {
      const r = this.rng.pick(this.regions);
      this.emit("join", r.name, `${this.rng.int(2, 18)} players queued into ${r.name}`, "info");
    }
    if (this.rng.chance(0.28)) {
      const r = this.rng.pick(this.regions);
      const item = this.rng.pick(this.economy.topItems).name;
      this.emit("trade", r.name, `Market: ${this.rng.int(3, 40)}× ${item} traded`, "info");
    }
    if (this.rng.chance(0.35)) {
      const r = this.rng.pick(this.regions);
      this.emit("match", r.name, `Match resolved in ${r.name} · ${this.rng.int(6, 60)} players`, "info");
    }

    this.recompute();
    this.pushHistory();
  }
}
