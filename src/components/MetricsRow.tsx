import { store, useTick } from "../store/store";
import { Sparkline } from "./Sparkline";
import { palette } from "../theme";

const fmt = (n: number) => n.toLocaleString("en-US");

function Metric({
  label,
  value,
  series,
  color,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  series: number[];
  color: string;
  suffix?: string;
  tone?: "caution" | "warning";
}) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className={tone ? `metric__value metric__value--${tone}` : "metric__value"}>
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
  const p = palette();
  const p95 = metrics.p95LatencyMs;
  // Same thresholds as the latency alert rule: caution above 110 ms, warning above 150 ms.
  const latencyTone = p95 > 150 ? "warning" : p95 > 110 ? "caution" : undefined;

  return (
    <div className="metrics">
      <Metric
        label="Players online"
        value={fmt(metrics.playersOnline)}
        series={snap(history.players)}
        color={p.accent}
      />
      <Metric
        label="Matches / min"
        value={fmt(metrics.matchesPerMin)}
        series={snap(history.matches)}
        color={p.accent}
      />
      <Metric
        label="Credits / min"
        value={fmt(metrics.creditsPerMin)}
        series={snap(history.credits)}
        color={p.accent}
      />
      <Metric
        label="p95 latency"
        value={fmt(metrics.p95LatencyMs)}
        suffix="ms"
        series={snap(history.latency)}
        color={latencyTone === "warning" ? p.warning : latencyTone === "caution" ? p.caution : p.accent}
        tone={latencyTone}
      />
    </div>
  );
}
