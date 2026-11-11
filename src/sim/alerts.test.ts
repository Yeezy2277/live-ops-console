import { test } from "node:test";
import assert from "node:assert/strict";
import { AlertEngine, type AlertRule } from "./alerts.ts";
import type { Region } from "./world.ts";

const rule: AlertRule = {
  id: "latency",
  label: "High latency",
  severity: "warn",
  read: (r) => r.latencyMs,
  raiseAbove: 150,
  clearBelow: 110,
  raiseAfter: 3,
  clearAfter: 4,
};

const region = (latencyMs: number): Region => ({
  id: "eu",
  name: "EU",
  x: 0,
  y: 0,
  players: 100,
  capacity: 1000,
  latencyMs,
  status: "healthy",
});

/** Feeds a series of latencies, one per tick, and records what happened. */
function run(engine: AlertEngine, series: number[]) {
  const log: string[] = [];
  series.forEach((ms, tick) => {
    const { opened, resolved } = engine.evaluate(tick, [region(ms)]);
    opened.forEach(() => log.push(`open@${tick}`));
    resolved.forEach(() => log.push(`resolve@${tick}`));
  });
  return log;
}

test("alerts: a single spike doesn't page anyone", () => {
  assert.deepEqual(run(new AlertEngine([rule]), [40, 400, 40, 40]), []);
});

test("alerts: opens only after the value stays bad for raiseAfter ticks", () => {
  assert.deepEqual(run(new AlertEngine([rule]), [200, 200, 200]), ["open@2"]);
});

test("alerts: hovering around the threshold doesn't flap", () => {
  // Opens once, then oscillates between 130 and 160: inside the hysteresis band
  // or briefly above it, never below clearBelow, so it never resolves and reopens.
  const series = [200, 200, 200, ...Array.from({ length: 40 }, (_, i) => (i % 2 ? 160 : 130))];
  assert.deepEqual(run(new AlertEngine([rule]), series), ["open@2"]);
});

test("alerts: resolves only after clearAfter good ticks, and a new incident is a new alert", () => {
  const engine = new AlertEngine([rule]);
  const log = run(engine, [200, 200, 200, 90, 90, 90, 90, 300, 300, 300]);
  assert.deepEqual(log, ["open@2", "resolve@6", "open@9"]);
  assert.equal(engine.active()[0]?.id, 2, "a fresh id, not the resolved alert reopened");
});

test("alerts: acknowledging keeps the alert open until the metric recovers", () => {
  const engine = new AlertEngine([rule]);
  run(engine, [200, 200, 200]);
  const [alert] = engine.active();
  assert.ok(alert && engine.acknowledge(alert.id));
  assert.equal(engine.active()[0]?.acknowledged, true);
  assert.equal(engine.acknowledge(999), false);
});

test("alerts: critical alerts sort before warnings", () => {
  const critical: AlertRule = { ...rule, id: "outage", severity: "critical", raiseAfter: 1 };
  const engine = new AlertEngine([rule, critical]);
  run(engine, [200, 200, 200]);
  assert.deepEqual(engine.active().map((a) => a.severity), ["critical", "warn"]);
});
