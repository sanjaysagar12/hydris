export default function KpiRow() {
  return (
    <div className="kpi-row">
      <div className="kpi">
        <div className="num">142</div>
        <div className="lbl">Active suppliers</div>
        <div className="delta up">▲ 4 onboarded this quarter</div>
      </div>
      <div className="kpi">
        <div className="num">58%</div>
        <div className="lbl">Progressive tier or above</div>
        <div className="delta up">▲ 6pts vs last quarter</div>
      </div>
      <div className="kpi">
        <div className="num">9</div>
        <div className="lbl">Open alerts</div>
        <div className="delta down">▲ 2 tier downgrades this week</div>
      </div>
      <div className="kpi">
        <div className="num">+18,400 m³</div>
        <div className="lbl">Network PWI — Availability (YTD)</div>
        <div className="delta up">±12% avg confidence</div>
      </div>
      <div className="kpi">
        <div className="num">7 / 9</div>
        <div className="lbl">Avg CDP question readiness</div>
        <div className="delta down">2 gaps: W1.2, W4.1</div>
      </div>
    </div>
  );
}
