import { Header } from "./components/Header";
import { MetricsRow } from "./components/MetricsRow";
import { WorldMap } from "./components/WorldMap";
import { EventFeed } from "./components/EventFeed";
import { EconomyPanel } from "./components/EconomyPanel";
import "./styles/app.css";

export default function App() {
  return (
    <div className="app">
      <Header />
      <MetricsRow />
      <div className="grid">
        <section className="panel panel--map">
          <div className="panel__title">World map · live</div>
          <WorldMap />
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
