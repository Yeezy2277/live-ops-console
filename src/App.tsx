import { Header } from "./components/Header";
import { MetricsRow } from "./components/MetricsRow";
import { WorldMap } from "./components/WorldMap";
import { EventFeed } from "./components/EventFeed";
import { EconomyPanel } from "./components/EconomyPanel";
import { ControlPanel } from "./components/ControlPanel";
import { AlertsPanel } from "./components/AlertsPanel";
import { PerfHud } from "./components/PerfHud";
import "./styles/app.css";

export default function App() {
  return (
    <div className="app">
      <Header />
      <p className="lede">
        There's no server here. A deterministic game world runs entirely in your
        browser — it ticks at <strong>4&nbsp;Hz</strong>, and an observable store
        feeds the numbers while a <code>requestAnimationFrame</code> loop paints
        the map on canvas at <strong>60&nbsp;fps</strong>, decoupled from React.
        Break a region on purpose, watch the alert wait out its threshold, step
        through it tick by tick, and share the seed to replay the exact run. The
        data is synthetic; the real-time architecture is the point.
      </p>
      <PerfHud />
      <MetricsRow />
      <div className="grid">
        <section className="panel panel--map">
          <div className="panel__title">World map · live</div>
          <WorldMap />
        </section>
        <section className="panel panel--ctl">
          <div className="panel__title">Incident controls</div>
          <ControlPanel />
        </section>
        <section className="panel panel--alerts">
          <div className="panel__title">Open alerts</div>
          <AlertsPanel />
        </section>
        <section className="panel panel--feed">
          <div className="panel__title">Event stream</div>
          <EventFeed />
        </section>
        <section className="panel panel--econ">
          <div className="panel__title">Economy</div>
          <EconomyPanel />
        </section>
      </div>
      <footer className="foot">
        Client-side simulation · rendered on canvas · no backend ·{" "}
        <a href="https://github.com/Yeezy2277/live-ops-console">source</a>
      </footer>
    </div>
  );
}
