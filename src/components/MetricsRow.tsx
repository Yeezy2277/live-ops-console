import { store, useTick } from "../store/store";
import { Sparkline } from "./Sparkline";

const fmt = (n: number) => n.toLocaleString("en-US");

function Metric({
  label,
  value,
  series,
  color,
  suffix,
}: {
  label: string;
  value: string;
  series: number[];
  color: string;
  suffix?: string;
}) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value" style={{ color }}>
        {value}
        {suffix && <span className="metric__suffix">{suffix}</span>}
      </div>
      <Sparkline data={series} color={color} />
    </div>
  );
}

export function MetricsRow() {
  useTick();
  const { metrics, history } = store.world;
  // The history arrays are mutated in place (stable references), so hand the
  // Sparkline a fresh copy each tick to trigger its redraw.
  const snap = (a: number[]) => a.slice();

  return (
    <div className="metrics">
      <Metric
        label="Players online"
        value={fmt(metrics.playersOnline)}
        series={snap(history.players)}
        color="#4c8dff"
      />
      <Metric
        label="Matches / min"
        value={fmt(metrics.matchesPerMin)}
        series={snap(history.matches)}
        color="#2dd4a0"
      />
      <Metric
        label="Credits / min"
        value={fmt(metrics.creditsPerMin)}
        series={snap(history.credits)}
        color="#f5b544"
      />
      <Metric
        label="p95 latency"
        value={fmt(metrics.p95LatencyMs)}
        suffix="ms"
        series={snap(history.latency)}
        color={metrics.p95LatencyMs > 150 ? "#e2564a" : "#9a7bff"}
      />
    </div>
  );
}
