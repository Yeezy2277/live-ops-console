import { useEffect, useRef } from "react";

/** A tiny filled line chart drawn on canvas from a numeric series. */
export function Sparkline({
  data,
  color,
  width = 180,
  height = 44,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (data.length < 2) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const stepX = width / (data.length - 1);
    const y = (v: number) => height - 4 - ((v - min) / span) * (height - 8);

    ctx.beginPath();
    data.forEach((v, i) => {
      const px = i * stepX;
      const py = y(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    // Fill under the line.
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, `${color}44`);
    fill.addColorStop(1, `${color}00`);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // Redraw the stroke on top.
    ctx.beginPath();
    data.forEach((v, i) => {
      const px = i * stepX;
      const py = y(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [data, color, width, height]);

  return <canvas ref={ref} style={{ width, height, display: "block" }} />;
}
