/**
 * Pulse palette: a flight-deck display. Colour follows avionics convention so
 * it carries meaning, not decoration: cyan = information / selected,
 * green = nominal, amber = caution, red = warning. Amber also marks the brand,
 * and that's its only non-semantic use.
 *
 * CSS reads the same values as custom properties (styles/app.css); canvas code
 * reads them here, because a canvas can't use CSS variables directly.
 */
export type Palette = {
  text: string;
  muted: string;
  dim: string;
  accent: string;
  ok: string;
  caution: string;
  warning: string;
  mapGrid: string;
  mapLink: string;
  scanline: string;
};

const DARK: Palette = {
  text: "#e4ece6",
  muted: "#97a39b",
  dim: "#828e86",
  accent: "#3fd6e4",
  ok: "#46d68a",
  caution: "#ffb020",
  warning: "#ff5a4f",
  mapGrid: "#1d2420",
  mapLink: "rgba(63, 214, 228, 0.10)",
  scanline: "rgba(228, 236, 230, 0.025)",
};

const LIGHT: Palette = {
  text: "#151a17",
  muted: "#4d5a52",
  dim: "#5b655d",
  accent: "#006a74",
  ok: "#14713c",
  caution: "#a86300",
  warning: "#c4342b",
  mapGrid: "#c5ccc4",
  mapLink: "rgba(0, 106, 116, 0.14)",
  scanline: "rgba(21, 26, 23, 0.03)",
};

export const palette = (): Palette => (document.documentElement.dataset.theme === "light" ? LIGHT : DARK);

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Fonts as canvas font shorthands; the same families the stylesheet loads. */
export const FONT_DISPLAY = "'Chakra Petch', 'Rajdhani', 'Arial Narrow', sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
