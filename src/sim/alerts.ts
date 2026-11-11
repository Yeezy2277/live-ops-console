import type { Region } from "./world.ts";

/**
 * Alerting with hysteresis. A metric that hovers around a threshold would
 * otherwise open and close an alert every tick ("flapping") and page someone
 * all night. Each rule therefore has two thresholds and two durations:
 * raise only after the value has been bad for `raiseAfter` consecutive ticks,
 * clear only after it has been clearly good (below `clearBelow`, which sits
 * under `raiseAbove`) for `clearAfter` consecutive ticks.
 */

export type AlertSeverity = "warn" | "critical";

export type AlertRule = {
  id: string;
  label: string;
  severity: AlertSeverity;
  /** The value the thresholds compare against, read from one region. */
  read: (r: Region) => number;
  raiseAbove: number;
  clearBelow: number;
  raiseAfter: number;
  clearAfter: number;
  unit?: string;
};

export const RULES: AlertRule[] = [
  {
    id: "latency",
    label: "High latency",
    severity: "warn",
    read: (r) => r.latencyMs,
    raiseAbove: 150,
    clearBelow: 110,
    raiseAfter: 3,
    clearAfter: 6,
    unit: "ms",
  },
  {
    id: "outage",
    label: "Region down",
    severity: "critical",
    read: (r) => (r.status === "down" ? 1 : 0),
    raiseAbove: 0.5,
    clearBelow: 0.5,
    raiseAfter: 1,
    clearAfter: 4,
  },
  {
    id: "capacity",
    label: "Near capacity",
    severity: "warn",
    read: (r) => r.players / r.capacity,
    raiseAbove: 0.92,
    clearBelow: 0.85,
    raiseAfter: 4,
    clearAfter: 8,
  },
];

export type Alert = {
  id: number;
  ruleId: string;
  label: string;
  severity: AlertSeverity;
  region: string;
  openedAtTick: number;
  /** Value when the alert opened, for the operator's context. */
  value: number;
  unit?: string;
  acknowledged: boolean;
};

type Track = { bad: number; good: number; open?: Alert };

export class AlertEngine {
  private tracks = new Map<string, Track>();
  private seq = 0;
  // Plain field + assignment: the test runner uses Node's type stripping, which
  // doesn't support constructor parameter properties.
  private readonly rules: AlertRule[];

  constructor(rules: AlertRule[] = RULES) {
    this.rules = rules;
  }

  /** Advance one tick. Returns what changed so the caller can log it. */
  evaluate(tick: number, regions: Region[]): { opened: Alert[]; resolved: Alert[] } {
    const opened: Alert[] = [];
    const resolved: Alert[] = [];
    for (const rule of this.rules) {
      for (const region of regions) {
        const key = `${rule.id}:${region.id}`;
        const t = this.tracks.get(key) ?? { bad: 0, good: 0 };
        const v = rule.read(region);
        // Values between the two thresholds count as neither: that band is the hysteresis.
        t.bad = v > rule.raiseAbove ? t.bad + 1 : 0;
        t.good = v < rule.clearBelow ? t.good + 1 : 0;

        if (!t.open && t.bad >= rule.raiseAfter) {
          t.open = {
            id: ++this.seq,
            ruleId: rule.id,
            label: rule.label,
            severity: rule.severity,
            region: region.name,
            openedAtTick: tick,
            value: v,
            unit: rule.unit,
            acknowledged: false,
          };
          opened.push(t.open);
        } else if (t.open && t.good >= rule.clearAfter) {
          resolved.push(t.open);
          t.open = undefined;
        }
        this.tracks.set(key, t);
      }
    }
    return { opened, resolved };
  }

  /** Open alerts, critical first, then oldest first. */
  active(): Alert[] {
    return [...this.tracks.values()]
      .flatMap((t) => (t.open ? [t.open] : []))
      .sort((a, b) => (a.severity === b.severity ? a.openedAtTick - b.openedAtTick : a.severity === "critical" ? -1 : 1));
  }

  /** Acknowledging silences the page, not the problem: the alert stays open until the metric recovers. */
  acknowledge(alertId: number): boolean {
    for (const t of this.tracks.values()) {
      if (t.open?.id === alertId) {
        t.open.acknowledged = true;
        return true;
      }
    }
    return false;
  }
}
