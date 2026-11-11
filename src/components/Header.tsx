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
          <div className="hdr__title">Pulse</div>
          <div className="hdr__sub">Live ops console · seed {store.seed}</div>
        </div>
      </div>

      <div className="hdr__status">
        <span className={anyDown ? "hdr__pill hdr__pill--warn" : "hdr__pill hdr__pill--ok"}>
          <i />
          {anyDown ? "Incidents active" : "All systems nominal"}
        </span>
        <div className="hdr__actions">
          <button
            className="hdr__btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="hdr__btn" onClick={store.toggle}>
            {running ? "❚❚ Pause" : "▶ Resume"}
          </button>
        </div>
      </div>
    </header>
  );
}
