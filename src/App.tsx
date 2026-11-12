import { Header } from "./components/Header";
import { MetricsRow } from "./components/MetricsRow";
import { WorldMap } from "./components/WorldMap";
import { EventFeed } from "./components/EventFeed";
import { EconomyPanel } from "./components/EconomyPanel";
import { ControlPanel } from "./components/ControlPanel";
import { AlertsPanel } from "./components/AlertsPanel";
import { PerfHud } from "./components/PerfHud";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/app.css";

export default function App() {
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to console
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
      <p className="lede">
        There's no server here. A deterministic game world runs entirely in your
        browser. It ticks at <strong>4&nbsp;Hz</strong>, and an observable store
        feeds the numbers while a <code>requestAnimationFrame</code> loop paints
        the map on canvas at <strong>60&nbsp;fps</strong>, decoupled from React.
        Break a region on purpose, watch the alert wait out its threshold, step
        through it tick by tick, and share the seed to replay the exact run. The
        data is synthetic; the real-time architecture is the point.
      </p>
      <PerfHud />
      <MetricsRow />
      <div className="grid">
        <section className="panel panel--map" aria-labelledby="p-map">
          <h2 className="panel__title" id="p-map">World map, live</h2>
          <ErrorBoundary area="world map">
            <WorldMap />
          </ErrorBoundary>
        </section>
        <section className="panel panel--ctl" aria-labelledby="p-ctl">
          <h2 className="panel__title" id="p-ctl">Incident controls</h2>
          <ControlPanel />
        </section>
        <section className="panel panel--alerts" aria-labelledby="p-alerts">
          <h2 className="panel__title" id="p-alerts">Open alerts</h2>
          <AlertsPanel />
        </section>
        <section className="panel panel--feed" aria-labelledby="p-feed">
          <h2 className="panel__title" id="p-feed">Event stream</h2>
          <EventFeed />
        </section>
        <section className="panel panel--econ" aria-labelledby="p-econ">
          <h2 className="panel__title" id="p-econ">Economy</h2>
          <EconomyPanel />
        </section>
      </div>
      </main>
      <footer className="foot">
        Client-side simulation, rendered on canvas, no backend.{" "}
        <a href="https://github.com/Yeezy2277/live-ops-console">source</a>
      </footer>
    </div>
  );
}
