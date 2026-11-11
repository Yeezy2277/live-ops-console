import { useEffect, useRef } from "react";
import { store } from "../store/store";
import type { RegionStatus } from "../sim/world";

const STATUS_COLOR: Record<RegionStatus, string> = {
  healthy: "#4c8dff",
  degraded: "#f5b544",
  down: "#e2564a",
};

/**
 * The world map. A single requestAnimationFrame loop reads `store.world`
 * directly and repaints at the display refresh rate — the marker pulse is
 * time-based, so it stays smooth (60fps) regardless of the 4Hz sim tick and
 * without ever re-rendering through React.
 */
export function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = (t: number) => {
      const started = performance.now();
      ctx.clearRect(0, 0, w, h);

      // Theme-aware palette, read per frame (cheap) so the canvas follows the
      // toggle without React involvement.
      const light = document.documentElement.dataset.theme === "light";
      const dotColor = light ? "#cdd6e2" : "#1a2230";
      const labelColor = light ? "#17202b" : "#e6edf3";
      const subColor = light ? "#5d6a79" : "#9aa7b4";
      const meshColor = light ? "rgba(47,111,228,0.10)" : "rgba(76,141,255,0.08)";

      // Dotted-grid backdrop suggesting a world surface.
      ctx.fillStyle = dotColor;
      const gap = 26;
      for (let x = gap; x < w; x += gap) {
        for (let y = gap; y < h; y += gap) {
          ctx.fillRect(x, y, 1.4, 1.4);
        }
      }

      const { regions } = store.world;

      // Faint links between regions (mesh feel).
      ctx.strokeStyle = meshColor;
      ctx.lineWidth = 1;
      for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
          const a = regions[i]!;
          const b = regions[j]!;
          ctx.beginPath();
          ctx.moveTo(a.x * w, a.y * h);
          ctx.lineTo(b.x * w, b.y * h);
          ctx.stroke();
        }
      }

      for (const r of regions) {
        const cx = r.x * w;
        const cy = r.y * h;
        const load = r.players / r.capacity;
        const radius = 7 + load * 20;
        const color = STATUS_COLOR[r.status];

        // Pulsing ring — speed scales with load, so busy regions "beat" faster.
        const speed = r.status === "healthy" ? 0.0016 : 0.004;
        const phase = (t * speed + r.x * 6) % 1;
        const ringR = radius + phase * 26;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = color + Math.round((1 - phase) * 120).toString(16).padStart(2, "0");
        ctx.lineWidth = 2;
        ctx.stroke();

        // Core marker.
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + "22");
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label.
        ctx.fillStyle = labelColor;
        ctx.font = "600 12px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(r.name, cx, cy - radius - 10);
        ctx.fillStyle = subColor;
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillText(`${r.players.toLocaleString("en-US")} · ${r.latencyMs}ms`, cx, cy + radius + 18);
      }

      store.perf.canvasFrames++;
      store.perf.frameMsTotal += performance.now() - started;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="map">
      <canvas ref={canvasRef} className="map__canvas" />
      <div className="map__legend">
        <span><i style={{ background: "#4c8dff" }} /> healthy</span>
        <span><i style={{ background: "#f5b544" }} /> degraded</span>
        <span><i style={{ background: "#e2564a" }} /> down</span>
      </div>
    </div>
  );
}
