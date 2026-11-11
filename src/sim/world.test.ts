import { test } from "vitest";
import assert from "node:assert/strict";
import { createRng } from "./rng.ts";
import { World } from "./world.ts";

test("rng: deterministic and bounded for a given seed", () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) {
    const x = a.next();
    assert.equal(x, b.next(), "same seed -> same sequence");
    assert.ok(x >= 0 && x < 1);
  }
  const r = createRng(7);
  for (let i = 0; i < 100; i++) {
    const n = r.int(3, 9);
    assert.ok(n >= 3 && n <= 9 && Number.isInteger(n));
  }
});

test("world: same seed produces an identical run", () => {
  const a = new World(2024);
  const b = new World(2024);
  for (let i = 0; i < 200; i++) {
    a.step();
    b.step();
  }
  assert.equal(a.metrics.playersOnline, b.metrics.playersOnline);
  assert.equal(a.events.length, b.events.length);
  assert.deepEqual(
    a.regions.map((r) => r.players),
    b.regions.map((r) => r.players),
  );
});

test("world: players stay within [0, capacity] per region", () => {
  const w = new World(99);
  for (let i = 0; i < 500; i++) {
    w.step();
    for (const r of w.regions) {
      assert.ok(r.players >= 0 && r.players <= r.capacity, `${r.name} within capacity`);
      assert.ok(r.latencyMs >= 12 && r.latencyMs <= 800);
    }
  }
});

test("world: playersOnline equals the sum of regions", () => {
  const w = new World(5);
  for (let i = 0; i < 50; i++) w.step();
  const sum = w.regions.reduce((s, r) => s + r.players, 0);
  assert.equal(w.metrics.playersOnline, sum);
});

test("world: history ring buffers are capped and grow with ticks", () => {
  const w = new World(1);
  for (let i = 0; i < 300; i++) w.step();
  assert.equal(w.history.players.length, 120, "capped at HISTORY");
  assert.equal(w.history.matches.length, 120);
});

test("world: event feed is capped and newest-first", () => {
  const w = new World(3);
  for (let i = 0; i < 2000; i++) w.step();
  assert.ok(w.events.length <= 200, "feed capped");
  for (let i = 1; i < w.events.length; i++) {
    assert.ok(w.events[i - 1]!.id > w.events[i]!.id, "newest first (descending id)");
  }
});

test("world: top items stay sorted by volume", () => {
  const w = new World(11);
  for (let i = 0; i < 100; i++) w.step();
  const vols = w.economy.topItems.map((i) => i.volume);
  const sorted = [...vols].sort((a, b) => b - a);
  assert.deepEqual(vols, sorted);
});

test("world: injected incidents take effect immediately and are logged", () => {
  const w = new World(3);
  assert.equal(w.inject("eu-c", "outage"), true);
  const eu = w.regions.find((r) => r.id === "eu-c")!;
  assert.equal(eu.status, "down");
  assert.equal(w.events[0]?.severity, "critical");
  assert.equal(w.inject("nowhere", "outage"), false);
});

test("world: a surge never pushes a region past capacity", () => {
  const w = new World(4);
  for (let i = 0; i < 5; i++) w.inject("apac", "surge");
  const apac = w.regions.find((r) => r.id === "apac")!;
  assert.equal(apac.players, apac.capacity);
  assert.equal(w.metrics.playersOnline, w.regions.reduce((s, r) => s + r.players, 0));
});

test("world: same seed and same injections replay identically", () => {
  const play = () => {
    const w = new World(77);
    for (let i = 0; i < 100; i++) {
      if (i === 20) w.inject("na-e", "latency");
      if (i === 50) w.inject("apac", "surge");
      w.step();
    }
    return w.regions.map((r) => [r.players, r.latencyMs, r.status]);
  };
  assert.deepEqual(play(), play());
});
