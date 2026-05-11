// analysis-modules.jsx — Kinetic, interface, and seam analysis pages.

function KineticModule({ batch, pred }) {
  const curves = ['flint', 'fuse', 'marrow'].map((phase) => ({
    phase,
    points: CSL.exothermCurve(batch.phases[phase], batch.env, phase),
  }));
  return (
    <div className="modulepage">
      <Card title="Curing Timeline"
        dark
        right={<span className="mono dim-d" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>120 MIN · EXOTHERM MODEL</span>}>
        <ExothermChart curves={curves} env={batch.env} />
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <Cell k="Flint work" v={pred.flint_s.workMin} unit="min" />
        <Cell k="Fuse work" v={pred.fuse.workMin} unit="min" />
        <Cell k="Peak risk" v={pred.flint_s.curePeak > 90 ? 'HIGH' : 'OK'} />
        <Cell k="Wick risk" v={pred.seam.wickHigh ? 'FAIL' : 'OK'} />
      </div>
      <Card title="Cure Controls">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Slider label="Ambient temperature" value={batch.env.tempC} min={5} max={40} step={1} unit=" °C"
            onChange={(v) => CSL.setEnvVal('tempC', v)} />
          <Slider label="Relative humidity" value={batch.env.humidity} min={20} max={95} step={1} unit=" %"
            onChange={(v) => CSL.setEnvVal('humidity', v)} />
        </div>
      </Card>
    </div>
  );
}

function InterfaceModule({ batch, pred }) {
  const vitals = CSL.seamVitals(batch.seam, batch, pred);
  const wick = CSL.wickingScore(batch);
  return (
    <div className="modulepage">
      <div className="row3">
        <Cell k="Shear capacity" v={vitals.shear.toFixed(2)} unit="kN/m" />
        <Cell k="Stress peak" v={vitals.stressPeak.toFixed(2)} unit="x" />
        <Cell k="Wicking score" v={wick.score.toFixed(2)} />
      </div>
      <div className="row2">
        <Card title="Interface Risk Map" dark>
          <InterfaceMap vitals={vitals} wick={wick} />
        </Card>
        <Card title="Interface Levers">
          <div style={{ display: 'grid', gap: 16 }}>
            <Slider label="Surface roughness" value={batch.seam.roughness} min={0} max={100} step={1}
              onChange={(v) => CSL.setSeamVal('roughness', v)} />
            <Slider label="Fuse bond length" value={batch.seam.bondLength} min={10} max={100} step={1} unit=" mm"
              onChange={(v) => CSL.setSeamVal('bondLength', v)} />
            <Slider label="Fillet radius" value={batch.seam.fillet} min={0} max={5} step={0.1} unit=" mm"
              onChange={(v) => CSL.setSeamVal('fillet', v)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SeamModule({ batch, pred }) {
  const vitals = CSL.seamVitals(batch.seam, batch, pred);
  const profiles = [
    { id: 'butt', label: 'BUTT' },
    { id: 'dovetail', label: 'DOVETAIL' },
    { id: 'shiplap', label: 'SHIP-LAP' },
    { id: 'shark', label: 'SHARK TOOTH' },
  ];
  return (
    <div className="modulepage">
      <div className="row2">
        <Card title="Seam Geometry" dark>
          <SeamDrawing seam={batch.seam} vitals={vitals} />
        </Card>
        <Card title="Geometry Controls">
          <div className="seam-buttons">
            {profiles.map((p) => (
              <button key={p.id}
                className={`btn ${batch.seam.type === p.id ? 'btn--fuse' : 'btn--ghost'}`}
                onClick={() => CSL.setSeamVal('type', p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            <Slider label="Clearance" value={batch.seam.clearance} min={1} max={20} step={0.5} unit=" mm"
              onChange={(v) => CSL.setSeamVal('clearance', v)} />
            <Slider label="Bond length" value={batch.seam.bondLength} min={10} max={100} step={1} unit=" mm"
              onChange={(v) => CSL.setSeamVal('bondLength', v)} />
            <Slider label="Roughness" value={batch.seam.roughness} min={0} max={100} step={1}
              onChange={(v) => CSL.setSeamVal('roughness', v)} />
          </div>
        </Card>
      </div>
      <div className="row3">
        <Cell k="Thermal path" v={vitals.thermal.toFixed(2)} unit="x" />
        <Cell k="Fuse use" v={vitals.volPerM.toFixed(3)} unit="m³/m" />
        <Cell k="Cost / m" v={`$${vitals.costPerM.toFixed(0)}`} />
      </div>
    </div>
  );
}

function ExothermChart({ curves, env }) {
  const w = 760, h = 260, pad = 28;
  const maxT = Math.max(100, ...curves.flatMap((c) => c.points.map((p) => p.T)));
  const x = (t) => pad + (t / 120) * (w - pad * 2);
  const y = (T) => h - pad - ((T - env.tempC) / (maxT - env.tempC)) * (h - pad * 2);
  const color = { flint: 'var(--flint)', fuse: 'var(--fuse)', marrow: 'var(--marrow-warm)' };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="lab-chart">
      <line x1={pad} y1={y(env.tempC)} x2={w - pad} y2={y(env.tempC)} stroke="rgba(232,225,208,0.18)" />
      {[30, 60, 90, 120].map((t) => <line key={t} x1={x(t)} y1={pad} x2={x(t)} y2={h - pad} stroke="rgba(232,225,208,0.08)" />)}
      {curves.map((c) => (
        <path key={c.phase}
          d={c.points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.t).toFixed(1)} ${y(p.T).toFixed(1)}`).join(' ')}
          fill="none" stroke={color[c.phase]} strokeWidth="2" />
      ))}
      {curves.map((c, i) => (
        <text key={c.phase} x={pad + i * 112} y={18} fill={color[c.phase]} fontSize="11" fontFamily="monospace">
          {c.phase.toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

function InterfaceMap({ vitals, wick }) {
  return (
    <svg viewBox="0 0 620 260" className="lab-chart">
      <rect x="40" y="46" width="540" height="62" fill="var(--flint)" opacity="0.9" />
      <rect x="40" y="152" width="540" height="62" fill="var(--marrow-warm)" opacity="0.85" />
      <path d="M40 108 C160 126 260 126 380 108 S520 92 580 108 L580 152 C470 136 360 136 250 152 S100 170 40 152 Z"
        fill="var(--fuse)" opacity="0.92" />
      {vitals.risers.map((r, i) => (
        <circle key={i} cx={40 + r.x * 5.4} cy={84 + r.y * 2.2} r={7 + r.intensity * 10}
          fill="none" stroke="var(--alert)" strokeOpacity={0.25 + r.intensity * 0.5} />
      ))}
      <text x="44" y="32" fill="var(--bone-3)" fontSize="11" fontFamily="monospace">
        WICKING {wick.score.toFixed(2)} · SURFACE AREA {vitals.surfaceArea.toFixed(0)}
      </text>
    </svg>
  );
}

function SeamDrawing({ seam, vitals }) {
  const type = seam.type || 'butt';
  const path = type === 'dovetail'
    ? 'M70 70 L245 70 L285 118 L245 166 L70 166 Z M550 70 L375 70 L335 118 L375 166 L550 166 Z'
    : type === 'shiplap'
      ? 'M70 70 L300 70 L300 112 L245 112 L245 166 L70 166 Z M550 70 L375 70 L375 124 L320 124 L320 166 L550 166 Z'
      : type === 'shark'
        ? 'M70 70 L245 70 L275 94 L245 118 L275 142 L245 166 L70 166 Z M550 70 L375 70 L345 94 L375 118 L345 142 L375 166 L550 166 Z'
        : 'M70 70 L290 70 L290 166 L70 166 Z M550 70 L330 70 L330 166 L550 166 Z';
  return (
    <svg viewBox="0 0 620 240" className="lab-chart">
      <path d={path} fill="var(--flint)" />
      <rect x="292" y="68" width="36" height="100" fill="var(--fuse)" />
      <text x="70" y="204" fill="var(--bone-3)" fontSize="11" fontFamily="monospace">
        {type.toUpperCase()} · THERMAL PATH {vitals.thermal.toFixed(2)} · SHEAR {vitals.shear.toFixed(2)} kN/m
      </text>
    </svg>
  );
}

Object.assign(window, { KineticModule, InterfaceModule, SeamModule });
