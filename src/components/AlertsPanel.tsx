import { store, useTick } from "../store/store";

const TICKS_PER_SEC = 4;

/** Open alerts with hysteresis applied: critical first, acknowledge silences without resolving. */
export function AlertsPanel() {
  useTick();
  const alerts = store.alerts.active();
  const now = store.world.tick;

  if (alerts.length === 0) {
    return (
      <div className="alerts alerts--empty">
        <p>No open alerts.</p>
        <p className="alerts__hint">Inject an incident to watch one open, wait out its threshold, and resolve.</p>
      </div>
    );
  }

  return (
    <ul className="alerts">
      {alerts.map((a) => (
        <li key={a.id} className={`alert alert--${a.severity}${a.acknowledged ? " alert--ack" : ""}`}>
          <span className="alert__sev">{a.severity}</span>
          <span className="alert__what">
            {a.label} · {a.region}
          </span>
          <span className="alert__age">{Math.max(0, Math.round((now - a.openedAtTick) / TICKS_PER_SEC))}s</span>
          {a.acknowledged ? (
            <span className="alert__acked">acked</span>
          ) : (
            <button className="alert__ack" onClick={() => store.acknowledge(a.id)}>
              Ack
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
