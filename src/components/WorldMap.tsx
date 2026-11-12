import { useEffect, useRef } from "react";
import { store } from "../store/store";
import type { RegionStatus } from "../sim/world";
import { FONT_DISPLAY, FONT_MONO, palette, reducedMotion, type Palette } from "../theme";

const STATUS_TONE: Record<RegionStatus, keyof Palette> = {
  healthy: "ok",
  degraded: "caution",
  down: "warning",
};

/** "#rrggbb" + alpha in [0,1] → "#rrggbbaa" (palette colours are hex). */
const withAlpha = (hex: string, a: number) =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

const SWEEP_PERIOD_MS = 6000;

/**
 * The world map, styled as a radar scope. A single requestAnimationFrame loop
 * reads `store.world` directly and repaints at the display refresh rate. The
 * marker pulse and the sweep are time-based, so they stay smooth regardless
 * of the 4 Hz sim tick, without ever re-rendering through React.
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
      // Read per frame (cheap) so the canvas follows the theme toggle and the
      // reduced-motion setting without React involvement.
      const p = palette();
      const still = reducedMotion();
      ctx.clearRect(0, 0, w, h);

      // Range rings and crosshair from the scope's centre.
      const cx0 = w / 2;
      const cy0 = h / 2;
      const maxR = Math.hypot(w, h) / 2;
      ctx.strokeStyle = p.mapGrid;
      ctx.lineWidth = 1;
      for (let r = 80; r < maxR; r += 80) {
        ctx.beginPath();
        ctx.arc(cx0, cy0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, cy0);
      ctx.lineTo(w, cy0);
      ctx.moveTo(cx0, 0);
      ctx.lineTo(cx0, h);
      ctx.stroke();

      // Radar sweep: a fading wedge trailing a bright edge.
      if (!still) {
        const angle = ((t % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS) * Math.PI * 2;
        const trail = Math.PI / 5;
        const steps = 18;
        for (let i = 0; i < steps; i++) {
          const a0 = angle - (trail * (i + 1)) / steps;
          const a1 = angle - (trail * i) / steps;
          ctx.beginPath();
          ctx.moveTo(cx0, cy0);
          ctx.arc(cx0, cy0, maxR, a0, a1);
          ctx.closePath();
          ctx.fillStyle = withAlpha(p.accent, 0.07 * (1 - i / steps));
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(cx0, cy0);
        ctx.lineTo(cx0 + Math.cos(angle) * maxR, cy0 + Math.sin(angle) * maxR);
        ctx.strokeStyle = withAlpha(p.accent, 0.45);
        ctx.stroke();
      }

      const { regions } = store.world;

      // Faint links between regions.
      ctx.strokeStyle = p.mapLink;
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
        const radius = 6 + (r.players / r.capacity) * 18;
        const color = p[STATUS_TONE[r.status]];

        // Expanding ring; troubled regions "beat" faster. Static ring when motion is reduced.
        const speed = r.status === "healthy" ? 0.0014 : 0.004;
        const phase = still ? 0.35 : (t * speed + r.x * 6) % 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + phase * 24, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(color, (1 - phase) * 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Target marker: filled core plus a bracketed reticle.
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(color, 0.18);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const k = radius + 5;
        const tick = 5;
        ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
          ctx.moveTo(cx + sx * k, cy + sy * (k - tick));
          ctx.lineTo(cx + sx * k, cy + sy * k);
          ctx.lineTo(cx + sx * (k - tick), cy + sy * k);
        }
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = p.text;
        ctx.font = `600 12px ${FONT_DISPLAY}`;
        ctx.fillText(r.name.toUpperCase(), cx, cy - k - 8);
        // On a phone-width map the readout line collides with neighbours; the
        // metrics row above already carries those numbers.
        if (w >= 520) {
          ctx.fillStyle = p.muted;
          ctx.font = `11px ${FONT_MONO}`;
          ctx.fillText(`${r.players.toLocaleString("en-US")} / ${r.latencyMs} ms`, cx, cy + k + 16);
        }
      }

      // Scanlines over everything, like a phosphor display.
      ctx.fillStyle = p.scanline;
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

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
      <canvas ref={canvasRef} className="map__canvas" aria-label="Live map of game regions by health and load" role="img" />
      <div className="map__legend">
        <span><i style={{ background: "var(--ok)" }} /> nominal</span>
        <span><i style={{ background: "var(--caution)" }} /> degraded</span>
        <span><i style={{ background: "var(--warning)" }} /> down</span>
      </div>
    </div>
  );
}
