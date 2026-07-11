import { store, useTick } from "../store/store";

export function Header() {
  useTick();
  const { running } = store;
  const anyDown = store.world.regions.some((r) => r.status !== "healthy");

  return (
    <header className="hdr">
      <div className="hdr__brand">
        <span className="hdr__logo">◈</span>
        <div>
          <div className="hdr__title">Pulse</div>
          <div className="hdr__sub">Live Ops Console</div>
        </div>
      </div>

      <div className="hdr__status">
        <span className={anyDown ? "hdr__pill hdr__pill--warn" : "hdr__pill hdr__pill--ok"}>
          <i />
          {anyDown ? "Incidents active" : "All systems nominal"}
        </span>
        <button className="hdr__btn" onClick={store.toggle}>
          {running ? "❚❚ Pause" : "▶ Resume"}
        </button>
      </div>
    </header>
  );
}
