import { useEffect, useRef, useState } from "react";
import { store } from "../store/store";

type Rates = { react: number; canvas: number; frameMs: number };

/**
 * Proof of the architecture, measured live: React re-renders happen at the
 * tick rate (a few per second, per subscribed panel), while the canvas paints
 * at the display's refresh rate. This component samples once a second and is
 * itself deliberately not subscribed to the tick.
 */
export function PerfHud() {
  const [rates, setRates] = useState<Rates>({ react: 0, canvas: 0, frameMs: 0 });
  const last = useRef({ ...store.perf, at: performance.now() });

  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      const p = store.perf;
      const dt = (now - last.current.at) / 1000;
      const frames = p.canvasFrames - last.current.canvasFrames;
      setRates({
        react: Math.round((p.reactRenders - last.current.reactRenders) / dt),
        canvas: Math.round(frames / dt),
        frameMs: frames ? (p.frameMsTotal - last.current.frameMsTotal) / frames : 0,
      });
      last.current = { ...p, at: now };
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hud" aria-label="Rendering performance, measured live">
      <span>
        <b>{rates.canvas}</b> canvas fps
      </span>
      <span>
        <b>{rates.frameMs.toFixed(2)}</b> ms/frame
      </span>
      <span>
        <b>{rates.react}</b> React renders/s
      </span>
    </div>
  );
}
