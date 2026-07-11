import { store, useTick } from "../store/store";

const fmt = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => (n >= 0 ? `+${fmt(n)}` : fmt(n));

export function EconomyPanel() {
  useTick();
  const { currencies, topItems } = store.world.economy;
  const maxVol = Math.max(1, ...topItems.map((i) => i.volume));

  return (
    <div className="econ">
      <div className="econ__currencies">
        {currencies.map((c) => (
          <div key={c.name} className="econ__currency">
            <div className="econ__cname">{c.name}</div>
            <div className="econ__cbalance">{fmt(c.balance)}</div>
            <div className={c.flowPerMin >= 0 ? "econ__flow econ__flow--up" : "econ__flow econ__flow--down"}>
              {signed(c.flowPerMin)}/min
            </div>
          </div>
        ))}
      </div>

      <div className="econ__items">
        <div className="econ__title">Top traded items</div>
        {topItems.slice(0, 6).map((it) => (
          <div key={it.name} className="econ__item">
            <span className="econ__iname">{it.name}</span>
            <span className="econ__bar">
              <span className="econ__barfill" style={{ width: `${(it.volume / maxVol) * 100}%` }} />
            </span>
            <span className="econ__ivol">{fmt(it.volume)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
