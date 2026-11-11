import { useState } from "react";
import { store, useTick } from "../store/store";
import type { IncidentKind } from "../sim/world";

const INCIDENTS: { kind: IncidentKind; label: string; hint: string }[] = [
  { kind: "latency", label: "Latency spike", hint: "+220 ms and degraded: watch the alert wait 3 ticks before opening" },
  { kind: "outage", label: "Take offline", hint: "Region down: a critical alert opens on the next tick" },
  { kind: "surge", label: "Player surge", hint: "+35% of capacity: may trip the near-capacity alert" },
];

/** Operator controls: break things on purpose and watch the console react. */
export function ControlPanel() {
  useTick();
  const [region, setRegion] = useState(store.world.regions[0]!.id);
  const [copied, setCopied] = useState(false);
  const replayUrl = `${window.location.origin}${window.location.pathname}?seed=${store.seed}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(replayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link", replayUrl);
    }
  };

  return (
    <div className="ctl">
      <label className="ctl__field">
        <span>Region</span>
        <select id="incident-region" value={region} onChange={(e) => setRegion(e.target.value)}>
          {store.world.regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <div className="ctl__actions">
        {INCIDENTS.map((i) => (
          <button key={i.kind} className="ctl__btn" title={i.hint} onClick={() => store.inject(region, i.kind)}>
            {i.label}
          </button>
        ))}
      </div>
      <div className="ctl__row">
        <button className="ctl__btn" onClick={store.stepOnce} disabled={store.running} title="Pause first, then advance one tick at a time">
          Step 1 tick
        </button>
        <span className="ctl__tick" aria-label={`Current tick ${store.world.tick}`}>tick {store.world.tick}</span>
      </div>
      <div className="ctl__row">
        <span className="ctl__seed">seed {store.seed}</span>
        <button className="ctl__link" onClick={copy} aria-live="polite">
          {copied ? "Link copied" : "Copy replay link"}
        </button>
      </div>
    </div>
  );
}
