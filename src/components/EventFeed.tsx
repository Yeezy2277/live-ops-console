import { useMemo, useState } from "react";
import { store, useTick } from "../store/store";
import { useDebounced } from "../hooks";
import type { EventKind, Severity } from "../sim/world";

const KIND_DOT: Record<EventKind, string> = {
  join: "#4c8dff",
  leave: "#6b7787",
  match: "#2dd4a0",
  trade: "#f5b544",
  alert: "#e2564a",
  recover: "#9a7bff",
};

const SEV_CLASS: Record<Severity, string> = {
  info: "",
  warn: "feed__row--warn",
  critical: "feed__row--critical",
};

const FILTERS: (EventKind | "all")[] = ["all", "alert", "trade", "match", "join"];

export function EventFeed() {
  useTick();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<EventKind | "all">("all");
  const debouncedQuery = useDebounced(query, 200);

  const rows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return store.world.events
      .filter((e) => (kind === "all" ? true : e.kind === kind))
      .filter((e) => (q ? e.message.toLowerCase().includes(q) || e.region.toLowerCase().includes(q) : true))
      .slice(0, 60);
    // Depend on the tick so the list refreshes as events arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, kind, store.version]);

  return (
    <div className="feed">
      <div className="feed__controls">
        <input
          className="feed__search"
          placeholder="Search events…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="feed__filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={f === kind ? "chip chip--on" : "chip"}
              onClick={() => setKind(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="feed__list">
        {rows.length === 0 && <div className="feed__empty">No matching events.</div>}
        {rows.map((e) => (
          <div key={e.id} className={`feed__row ${SEV_CLASS[e.severity]}`}>
            <span className="feed__dot" style={{ background: KIND_DOT[e.kind] }} />
            <span className="feed__tick">#{e.tick}</span>
            <span className="feed__msg">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
