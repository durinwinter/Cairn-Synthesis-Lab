// formulation.jsx — Module 1: Multi-Phase Formulation Engine.

const { useState: formUseState } = React;

function FormulationModule({ batch, pred, initialPhase = 'flint_s' }) {
  const [phase, setPhase] = formUseState(initialPhase);
  const phaseData = batch.phases[phase];
  const phasePred = pred[phase];

  const setVal = (k, v) => CSL.setPhaseVal(phase, k, v);
  const setEnv = (k, v) => CSL.setEnvVal(k, v);

  return (
    <div className="modulepage">
      {/* Phase Toggle */}
      <PhaseTabs phase={phase} setPhase={setPhase} batch={batch} pred={pred} />

      {/* Sliders + Prediction split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Left — Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PhaseSliders phase={phase} data={phaseData} setVal={setVal} />
          <EnvCard env={batch.env} setEnv={setEnv} />
        </div>
        {/* Right — Predictions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PredictionPanel phase={phase} pred={phasePred} batch={batch} pred_all={pred} />
          <Card title="Theoretical Maxes"
            right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>SANDBOX · NOT YET BENCH-VERIFIED</span>}>
            <TheoreticalMaxes pred={pred} phase={phase} />
          </Card>
        </div>
      </div>

      {/* Stress strain for Flint */}
      {phase.startsWith('flint') && (
        <Card title="Stress–Strain · Fiber Reinforcement"
          dark
          right={<span className="mono dim-d" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>TOUGHNESS = AREA UNDER CURVE</span>}>
          <StressStrain pred={pred} fiberPct={phaseData.BasaltFiber} />
        </Card>
      )}

      {/* Porosity for Marrow */}
      {phase === 'marrow' && (
        <Card title="Porosity Heatmap · Marrow Density"
          dark
          right={<span className="mono dim-d" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>H₂O₂ × PERLITE</span>}>
          <PorosityHeatmap h2o2={phaseData.H2O2} perlite={phaseData.Perlite} />
        </Card>
      )}

      {/* Cost waterfall always */}
      <Card title="Cost Decomposition"
        right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>USD / m³ · {phase.toUpperCase()}</span>}>
        <PhaseCostWaterfall phase={phase} data={phaseData} />
      </Card>
    </div>
  );
}

function PhaseTabs({ phase, setPhase, batch, pred }) {
  const phases = [
    { id: 'flint_s', num: '01', name: 'FLINT (S)', sub: 'Structural Shell', comp: `${pred.flint_s.comp.toFixed(0)} MPa`, w: 'STRENGTH' },
    { id: 'flint_e', num: '02', name: 'FLINT (E)', sub: 'Exterior Skin', comp: `${pred.flint_e.comp.toFixed(0)} MPa`, w: 'STRENGTH' },
    { id: 'marrow', num: '03', name: 'MARROW', sub: 'Thermal Core', comp: `${pred.marrow.R.toFixed(2)} m²K/W`, w: 'R-VALUE' },
    { id: 'fuse', num: '04', name: 'FUSE', sub: 'Structural Joint', comp: `${pred.fuse.bond.toFixed(1)} MPa`, w: 'BOND SHEAR' },
  ];
  return (
    <div className="phasetabs">
      {phases.map((p) => (
        <button key={p.id} className="phasetab"
          data-phase={p.id}
          data-active={phase === p.id ? '1' : '0'}
          onClick={() => setPhase(p.id)}>
          <div className="mono" style={{ fontSize: 9.5, opacity: 0.5, letterSpacing: '0.1em', marginBottom: 2 }}>{p.num}</div>
          <div className="phasetab__k">{p.sub}</div>
          <div className="phasetab__n">{p.name}</div>
          <div className="phasetab__m">{p.comp}  ·  {p.w}</div>
          <span className="phasetab__swatch" />
        </button>
      ))}
    </div>
  );
}

function PhaseSliders({ phase, data, setVal }) {
  if (phase.startsWith('flint')) {
    const isExt = phase === 'flint_e';
    return (
      <Card title={isExt ? "FLINT (E) · Sandbox" : "FLINT (S) · Sandbox"} right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>BASALT-LOADED MKP</span>}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Slider label="Mg/PO₄ molar ratio" hint="Safety buffer · 4.5–7.5"
            value={data.MgPO4} min={3.5} max={10} step={0.05}
            zones={[
              { from: 3.5, to: 4.5, kind: 'warn' },
              { from: 4.5, to: 7.5, kind: 'good' },
              { from: 7.5, to: 10, kind: 'warn' },
            ]}
            ticks={['3.5', '5.0', '6.5', '8.0', '9.5']}
            onChange={(v) => setVal('MgPO4', v)} />
          <Slider label="Borax (retarder)" hint="Extends working window"
            value={data.Borax} min={0} max={8} step={0.1} unit=" wt%"
            ticks={['0%', '2%', '4%', '6%', '8%']}
            onChange={(v) => setVal('Borax', v)} />
          <Slider label="Basalt fiber" hint="Toughens — flex + impact"
            value={data.BasaltFiber} min={0} max={6} step={0.1} unit=" vol%"
            ticks={['0', '1.5', '3.0', '4.5', '6.0']}
            onChange={(v) => setVal('BasaltFiber', v)} />
          <Slider label="Nano-hydroxyapatite" hint="Densifies the matrix"
            value={data.NanoHAp} min={0} max={3} step={0.05} unit=" wt%"
            onChange={(v) => setVal('NanoHAp', v)} />
          <Slider label="Water / binder" hint="Lower = stronger, harder to pour"
            value={data.WB} min={0.16} max={0.32} step={0.005}
            ticks={['0.16', '0.20', '0.24', '0.28', '0.32']}
            onChange={(v) => setVal('WB', v)} />
        </div>
      </Card>
    );
  }
  if (phase === 'fuse') {
    return (
      <Card title="FUSE · Sandbox" right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>THIXOTROPIC INTERFACE</span>}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Slider label="Mg/PO₄ molar ratio" value={data.MgPO4} min={4} max={9} step={0.05}
            zones={[
              { from: 4, to: 5, kind: 'warn' },
              { from: 5, to: 8, kind: 'good' },
              { from: 8, to: 9, kind: 'warn' },
            ]}
            onChange={(v) => setVal('MgPO4', v)} />
          <Slider label="Borax (retarder)" value={data.Borax} min={0} max={8} step={0.1} unit=" wt%"
            onChange={(v) => setVal('Borax', v)} />
          <Slider label="Secondary retarder" hint="Citric / boric acid"
            value={data.Retarder} min={0} max={3} step={0.05} unit=" wt%"
            onChange={(v) => setVal('Retarder', v)} />
          <Slider label="MKP seeds" hint="Pre-reacted nuclei accelerate bond"
            value={data.Seeds} min={0} max={2} step={0.05} unit=" wt%"
            onChange={(v) => setVal('Seeds', v)} />
          <Slider label="Thixotropy index" hint="0 = flows like water · 100 = trowel gel"
            value={data.Thixo} min={0} max={100} step={1}
            ticks={['flow', '25', 'gel', '75', 'paste']}
            onChange={(v) => setVal('Thixo', v)} />
        </div>
      </Card>
    );
  }
  // Marrow
  return (
    <Card title="MARROW · Sandbox" right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>FOAMED INSULATING CORE</span>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Slider label="Mg/PO₄ molar ratio" value={data.MgPO4} min={4} max={9} step={0.05}
          onChange={(v) => setVal('MgPO4', v)} />
        <Slider label="H₂O₂ (foaming)" hint="Generates O₂ — bubble formation"
          value={data.H2O2} min={0.5} max={4} step={0.05} unit=" wt%"
          zones={[
            { from: 0.5, to: 2.5, kind: 'good' },
            { from: 3.2, to: 4, kind: 'warn' },
          ]}
          onChange={(v) => setVal('H2O2', v)} />
        <Slider label="Perlite (aggregate)" hint="Lightweight expanded volcanic glass"
          value={data.Perlite} min={10} max={60} step={1} unit=" vol%"
          onChange={(v) => setVal('Perlite', v)} />
        <Slider label="Borax" value={data.Borax} min={0} max={4} step={0.05} unit=" wt%"
          onChange={(v) => setVal('Borax', v)} />
        <Slider label="Surfactant" hint="Stabilises bubble walls"
          value={data.Surfactant} min={0} max={1} step={0.02} unit=" wt%"
          onChange={(v) => setVal('Surfactant', v)} />
      </div>
    </Card>
  );
}

function EnvCard({ env, setEnv }) {
  return (
    <Card title="Environment · Pour Conditions"
      right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>SHIFTS ALL PHASE PREDICTIONS</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Slider label="Ambient temperature"
          value={env.tempC} min={5} max={40} step={1} unit=" °C"
          zones={[
            { from: 5, to: 12, kind: 'warn' },
            { from: 12, to: 30, kind: 'good' },
            { from: 30, to: 40, kind: 'warn' },
          ]}
          onChange={(v) => setEnv('tempC', v)} />
        <Slider label="Relative humidity"
          value={env.humidity} min={20} max={95} step={1} unit=" %"
          onChange={(v) => setEnv('humidity', v)} />
      </div>
    </Card>
  );
}

function PredictionPanel({ phase, pred, batch, pred_all }) {
  const isFlint = phase.startsWith('flint');
  const items = isFlint ? [
    { k: 'COMPRESSIVE', v: pred.comp, u: 'MPa', max: 100 },
    { k: 'FLEXURAL', v: pred.flex, u: 'MPa', max: 20 },
    { k: 'E-MODULUS', v: pred.E, u: 'GPa', max: 25 },
    { k: 'DENSITY', v: pred.density, u: 'g/cm³', max: 2.6 },
    { k: 'CURE PEAK', v: pred.curePeak, u: '°C', max: 110 },
    { k: 'WORK WINDOW', v: pred.workMin, u: 'min', max: 60 },
  ] : phase === 'fuse' ? [
    { k: 'BOND SHEAR', v: pred.bond, u: 'MPa', max: 10 },
    { k: 'TENSILE', v: pred.tensile, u: 'MPa', max: 4 },
    { k: 'WORK WINDOW', v: pred.workMin, u: 'min', max: 80 },
    { k: 'VISCOSITY', v: pred.viscosity, u: 'Pa·s', max: 8 },
    { k: 'CURE PEAK', v: pred.curePeak, u: '°C', max: 100 },
  ] : [
    { k: 'DENSITY', v: pred.density, u: 'kg/m³', max: 2000 },
    { k: 'R-VALUE', v: pred.R, u: 'm²K/W', max: 5 },
    { k: 'CONDUCTIVITY', v: pred.therm, u: 'W/mK', max: 1.5 },
    { k: 'COMPRESSIVE', v: pred.comp, u: 'MPa', max: 10 },
    { k: 'POROSITY', v: pred.porosity, u: '', max: 0.85 },
  ];
  return (
    <Card title={`Predicted · ${phase.toUpperCase()}`}
      dark
      right={<Stamp kind="research">LIVE</Stamp>}>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((it) => (
          <div key={it.k}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 3,
            }}>
              <span className="mono" style={{
                fontSize: 9.5, color: 'var(--bone-3)', letterSpacing: '0.14em',
              }}>{it.k}</span>
              <span className="mono" style={{
                fontSize: 14, fontWeight: 700, color: 'var(--bone-1)',
              }}>
                {Number(it.v).toFixed(it.v < 1 ? 2 : 1)}
                <em style={{
                  color: 'var(--bone-3)', fontStyle: 'normal', fontWeight: 400,
                  fontSize: 9.5, paddingLeft: 4,
                }}>{it.u}</em>
              </span>
            </div>
            <div className="bar" style={{ background: 'rgba(232,225,208,0.10)', border: 'none' }}>
              <div className="bar__fill bar__fill--fuse"
                style={{ width: `${Math.min(100, (it.v / it.max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TheoreticalMaxes({ pred, phase }) {
  // Cross-phase couplings — show how this phase interacts with the others
  const isFlint = phase.startsWith('flint');
  const flintPred = isFlint ? pred[phase] : null;
  const rows = isFlint ? [
    { k: 'Flexural / Compressive', v: (flintPred.flex / flintPred.comp * 100).toFixed(1) + ' %' },
    { k: 'Predicted cure heat', v: flintPred.curePeak.toFixed(1) + ' °C' },
    { k: 'Bond compatibility', v: pred.fuse.bond > 4 ? 'OK · ' + pred.fuse.bond.toFixed(1) + ' MPa' : 'LOW' },
    { k: 'Cost contribution', v: '$' + pred.cost[phase] + '/m³' },
  ] : phase === 'fuse' ? [
    { k: 'Wickability vs Marrow', v: pred.marrow.porosity > 0.5 ? 'HIGH RISK' : 'OK' },
    { k: 'Working window', v: pred.fuse.workMin + ' min' },
    { k: 'Cure heat', v: pred.fuse.curePeak.toFixed(1) + ' °C' },
    { k: 'Bond / shear capacity', v: pred.seam.shear + ' kN/m' },
    { k: 'Cost contribution', v: '$' + pred.cost.fuse + '/m³' },
  ] : [
    { k: 'Density delta vs Flint(S)', v: '−' + (pred.flint_s.density * 1000 - pred.marrow.density).toFixed(0) + ' kg/m³' },
    { k: 'Insulation gain (R)', v: pred.marrow.R.toFixed(2) },
    { k: 'Wicking risk', v: pred.seam.wickHigh ? 'HIGH' : 'OK' },
    { k: 'Cost contribution', v: '$' + pred.cost.marrow + '/m³' },
  ];
  return (
    <div className="ruled">
      {rows.map((r) => (
        <div key={r.k}>
          <span className="k">{r.k}</span>
          <span className="v">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function PhaseCostWaterfall({ phase, data }) {
  const items = [];
  const base = 1800;
  const push = (label, key, mass, color) => {
    const c = mass * (CSL.COSTS[key] || 0);
    if (c > 1) items.push({ label, value: c, color });
  };
  // Base binder (always present)
  push('MgO', 'MgO', base * 0.55 * 0.55 / 100, 'var(--concrete-300)');
  push('KH₂PO₄', 'KH2PO4', base * 0.45 * 0.45 / 100, 'var(--flint)');
  push('Borax', 'Borax', base * data.Borax / 100, 'var(--retarder)');
  if (phase.startsWith('flint')) {
    push('Basalt', 'BasaltFiber', base * data.BasaltFiber / 100, 'var(--basalt)');
    push('NanoHAp', 'NanoHAp', base * data.NanoHAp / 100, 'var(--marrow-warm)');
  }
  if (phase === 'fuse') {
    push('Retarder', 'Retarder', base * data.Retarder / 100, 'var(--retarder)');
    push('Seeds', 'Seeds', base * data.Seeds / 100, 'var(--fuse)');
  }
  if (phase === 'marrow') {
    push('H₂O₂', 'H2O2', base * data.H2O2 / 100, 'var(--cool)');
    push('Perlite', 'Perlite', base * data.Perlite / 100 * 0.4, 'var(--marrow-warm)');
    push('Surfactant', 'Surfactant', base * data.Surfactant / 100, 'var(--fuse)');
  }
  const total = items.reduce((s, it) => s + it.value, 0);
  return <Waterfall items={items} total={total} unit="$ / m³" />;
}

Object.assign(window, { FormulationModule });
