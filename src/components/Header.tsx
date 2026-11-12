import { useEffect, useState } from "react";
import { store, useTick } from "../store/store";

type Theme = "dark" | "light";

function initialTheme(): Theme {
  try {
    return localStorage.getItem("pulse-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function Header() {
  useTick();
  const { running } = store;
  const anyDown = store.world.regions.some((r) => r.status !== "healthy");
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("pulse-theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  return (
    <header className="hdr">
      <div className="hdr__brand">
        <span className="hdr__logo" aria-hidden="true" />
        <div>
          <h1 className="hdr__title">Pulse</h1>
          <div className="hdr__sub">Live ops console / seed {store.seed}</div>
        </div>
      </div>

      <div className="hdr__status">
        <span role="status" className={anyDown ? "hdr__pill hdr__pill--warn" : "hdr__pill hdr__pill--ok"}>
          <i aria-hidden="true" />
          {anyDown ? "Incidents active" : "All systems nominal"}
        </span>
        <div className="hdr__actions">
          <button
            className="hdr__btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
          <button className="hdr__btn" onClick={store.toggle} aria-label={running ? "Pause simulation" : "Resume simulation"}>
            <span aria-hidden="true">{running ? "❚❚" : "▶"}</span> {running ? "Pause" : "Resume"}
          </button>
        </div>
      </div>
    </header>
  );
}
