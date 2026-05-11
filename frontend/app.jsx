// app.jsx — Top-level shell + state wiring for Cairn Synthesis Lab.

const { useState: appUseState, useEffect: appUseEffect, useMemo: appUseMemo, useCallback: appUseCallback } = React;

/* ──────────────────────────────────────────────────────────────
   CSL compatibility shim
   The modules I wrote use slightly different field names than
   state.js. Patch CSL to expose aliases and helpers the modules
   call directly.
   ────────────────────────────────────────────────────────────── */
(function patchCSL() {
  // logBench → addBenchLog
  CSL.logBench = CSL.addBenchLog;

  // setSeamVal: accept profile/bond aliases
  const origSetSeam = CSL.setSeamVal;
  CSL.setSeamVal = function (key, val) {
    if (key === 'profile') key = 'type';
    if (key === 'bond') key = 'bondLength';
    origSetSeam(key, val);
  };

  // Exotherm curve generator — returns array of {t, T} points
  CSL.exothermCurve = function (phase, env, phaseId) {
    const ratioOff = Math.abs(phase.MgPO4 - 6.0);
    const peakT = 12 + 8 * (phase.Borax || 0) + 3 * ratioOff +
      5 * (phase.Retarder || 0);
    const peakV = (phaseId === 'marrow' ? 48 : 78) +
      6 * ratioOff - 5.4 * (phase.Borax || 0)
      - 3.4 * (phase.Retarder || 0) + 0.4 * (env.tempC - 22);
    const ambient = env.tempC;
    const pts = [];
    for (let t = 0; t <= 120; t += 2) {
      const rise = Math.exp(-Math.pow((t - peakT) / (peakT * 0.55), 2) * 1.4);
      const decay = t > peakT ? Math.exp(-(t - peakT) / 80) : 1;
      pts.push({ t, T: ambient + (peakV - ambient) * rise * decay });
    }
    pts.peakT = peakT; pts.peakV = peakV;
    return pts;
  };

  // Wicking score (used in InterfaceModule)
  CSL.wickingScore = function (batch) {
    const pred = CSL.predictAll(batch);
    const f = batch.phases.fuse;
    const areaFactor = 1 + (batch.seam.roughness || 0) / 100 * 0.8;
    const retarder = (f.Borax || 0) + (f.Retarder || 0);
    const raw = pred.marrow.porosity * areaFactor * (1 - Math.min(0.7, retarder * 0.08));
    return { score: Math.max(0, Math.min(1, raw)), areaFactor };
  };

  // Seam vitals (used in SeamModule) — richer return than state.predictSeam
  CSL.seamVitals = function (seam, batch, pred) {
    const profile = seam.profile || seam.type || 'butt';
    const profMap = {
      butt: { strength: 1.0, area: 1.00, path: 1.00, stressK: 0.6 },
      dovetail: { strength: 2.4, area: 1.85, path: 1.42, stressK: 2.6 },
      shiplap: { strength: 1.6, area: 1.55, path: 1.78, stressK: 1.0 },
      serrated: { strength: 2.0, area: 2.35, path: 1.20, stressK: 1.8 },
      shark: { strength: 2.0, area: 2.35, path: 1.20, stressK: 1.8 },
    };
    const P = profMap[profile] || profMap.butt;
    const clearance = seam.clearance ?? 5;
    const bondLength = seam.bond ?? seam.bondLength ?? 40;
    const filletK = 1 - Math.min(5, seam.fillet || 0) / 6;
    const RaN = Math.min(30, seam.roughness || 1) / 30;

    const thermal = P.path * (1 + 0.03 * clearance / 5);
    const surfaceArea = 100 * P.area * (1 + 0.4 * RaN);
    const bondPerArea = pred.fuse.bond;
    const bondTotal = bondPerArea * surfaceArea * 0.01;
    const shear = bondTotal * P.strength * 0.5;
    const stressPeak = P.stressK * filletK * (1.0 + 0.4 * (1 - RaN));
    const wicking = Math.min(1,
      pred.marrow.porosity * P.area * (0.6 + 0.8 * RaN) *
      (1 - Math.min(0.6, (batch.phases.fuse.Borax + batch.phases.fuse.Retarder) * 0.08))
    );
    const volPerM = (clearance / 1000) * (0.06 + 0.04 * P.area);
    const pullout = P.strength;

    const fuseVolL = volPerM * 1000;
    const costPerM = (fuseVolL / 1000) * (pred.cost.fuse / 1.0);
    const costBaseline = (clearance / 1000 * 1.0 * 1000) / 1000 * pred.cost.fuse;

    const risers = [];
    if (profile === 'dovetail') {
      [20, 40, 60, 80].forEach((x) => {
        risers.push({ x, y: 6, intensity: 0.7 * filletK });
        risers.push({ x: x + 4, y: 32, intensity: 0.5 * filletK });
      });
    } else if (profile === 'serrated' || profile === 'shark') {
      for (let i = 0; i < 11; i++)
        risers.push({ x: 6 + i * 9, y: 20, intensity: 0.45 * filletK });
    } else if (profile === 'shiplap') {
      [30, 70].forEach((x) =>
        risers.push({ x, y: 16, intensity: 0.55 * filletK }));
    }

    return {
      thermal, shear, stressPeak, wicking, volPerM,
      surfaceArea, bondTotal, pullout, costPerM, costBaseline,
      risers,
    };
  };
})();

/* ──────────────────────────────────────────────────────────────
   useStore — subscribe to CSL store changes
   ────────────────────────────────────────────────────────────── */
function useStore() {
  const [, force] = appUseState(0);
  appUseEffect(() => CSL.subscribe(() => force((n) => n + 1)), []);
  return CSL.getState();
}

/* ──────────────────────────────────────────────────────────────
   The seam.jsx module expects batch.seam.{profile,bond,roughness}
   while state stores {type,bondLength,roughness}. Decorate.
   ────────────────────────────────────────────────────────────── */
function decorateBatch(b) {
  const seam = { ...b.seam };
  seam.profile = seam.type;
  seam.bond = seam.bondLength;
  seam.roughness = Math.round(seam.roughness * 0.3 * 10) / 10;
  return { ...b, seam };
}

function normalizeApiPredictions(flint, fuse, marrow) {
  return {
    flint: {
      ...flint,
      E: flint.E ?? flint.e_modulus,
      curePeak: flint.curePeak ?? flint.cure_peak,
      workMin: flint.workMin ?? flint.work_min,
    },
    fuse: {
      ...fuse,
      workMin: fuse.workMin ?? fuse.work_min,
      curePeak: fuse.curePeak ?? fuse.cure_peak,
    },
    marrow: {
      ...marrow,
      R: marrow.R ?? marrow.r_value,
    },
  };
}

/* ──────────────────────────────────────────────────────────────
   Coming Soon — placeholder for modules not yet shipped
   ────────────────────────────────────────────────────────────── */
function ComingSoon({ module: mod }) {
  const labels = {
    kinetic: { num: '02', name: 'Curing & Kinetic Timeline', desc: 'Exotherm curves, working window, Borax comparison overlays.' },
    interface: { num: '03', name: 'Interface & Seam Analytics', desc: 'Bond stress simulator, porosity heatmap, wicking risk.' },
    seam: { num: '04', name: 'Seam Geometry Designer', desc: 'Joint picker, parametric controls, seam vitals, DXF export.' },
  };
  const info = labels[mod] || { num: '—', name: mod, desc: '' };
  return (
    <div className="modulepage" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        maxWidth: 520, margin: '80px auto', padding: '48px 40px',
        background: 'var(--paper)', border: '1px solid var(--rule-2)',
        borderTop: '3px solid var(--fuse)',
      }}>
        <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.22em', marginBottom: 10 }}>
          MODULE {info.num}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink-1)', marginBottom: 8 }}>
          {info.name}
        </div>
        <div className="mono dim" style={{ fontSize: 11, letterSpacing: '0.06em', lineHeight: 1.6, marginBottom: 24 }}>
          {info.desc}
        </div>
        <div style={{
          padding: '10px 14px',
          background: 'var(--basalt)', color: 'var(--bone-2)',
          fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.14em',
        }}>
          IN DEVELOPMENT · NEXT COMMIT
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   App
   ────────────────────────────────────────────────────────────── */
function App() {
  const state = useStore();
  const active = CSL.getActive();
  const batchView = appUseMemo(() => decorateBatch(active), [active]);

  // Predict async from Rust Backend
  const [pred, setPred] = appUseState(() => CSL.predictAll(batchView)); // initial fallback

  appUseEffect(() => {
    let canceled = false;
    async function fetchPredictions() {
      async function postPrediction(url, body) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        if (!res.ok) throw new Error(`Prediction API ${res.status}`);
        return res.json();
      }
      try {
        const bodyFS = JSON.stringify({ params: batchView.phases.flint_s, env: batchView.env });
        const flintDataS = await postPrediction('http://127.0.0.1:8000/api/predict/flint', bodyFS);

        const bodyFE = JSON.stringify({ params: batchView.phases.flint_e, env: batchView.env });
        const flintDataE = await postPrediction('http://127.0.0.1:8000/api/predict/flint', bodyFE);

        const bodyB = JSON.stringify({ params: batchView.phases.fuse, env: batchView.env });
        const fuseData = await postPrediction('http://127.0.0.1:8000/api/predict/fuse', bodyB);

        const bodyM = JSON.stringify({ params: batchView.phases.marrow, env: batchView.env });
        const marrowData = await postPrediction('http://127.0.0.1:8000/api/predict/marrow', bodyM);

        if (canceled) return;

        const normalized = normalizeApiPredictions(flintDataS, fuseData, marrowData);

        // Merge back into pred format
        const seam = CSL.predictSeam(batchView.seam, normalized.marrow, normalized.fuse);
        const cost = {
          flint_s: CSL.costPhase(batchView.phases.flint_s),
          flint_e: CSL.costPhase(batchView.phases.flint_e),
          fuse: CSL.costPhase(batchView.phases.fuse),
          marrow: CSL.costPhase(batchView.phases.marrow),
        };
        cost.total = cost.flint_s + cost.flint_e + cost.fuse + cost.marrow;

        setPred({ flint_s: flintDataS, flint_e: flintDataE, fuse: fuseData, marrow: marrowData, seam, cost });
      } catch (err) {
        if (!canceled) {
          console.warn('API fetch failed, falling back to local JS calculation');
          setPred(CSL.predictAll(batchView));
        }
      }
    }
    fetchPredictions();
    return () => { canceled = true; };
  }, [batchView]);

  const [benchOpen, setBenchOpen] = appUseState(false);
  const [vaultOpen, setVaultOpen] = appUseState(false);
  const [helpOpen,  setHelpOpen]  = appUseState(false);
  const [initialPhase, setInitialPhase] = appUseState('flint_s');

  const goModule = (id, phase) => {
    CSL.setActiveModule(id);
    if (phase) setInitialPhase(phase);
  };

  return (
    <div className="app">
      <TopBar batch={batchView} pred={pred}
        activeModule={state.activeModule}
        onModule={(m) => CSL.setActiveModule(m)}
        onBench={() => setBenchOpen(true)}
        onClone={() => CSL.cloneActive()}
        onHelp={() => setHelpOpen(true)} />

      <div className="main3">
        <Sidebar state={state} batchView={batchView} onPick={(id) => CSL.setActiveId(id)} />

        <main className="stage">
          {state.activeModule === 'dashboard' && (
            <Dashboard batch={batchView} pred={pred}
              onModule={goModule}
              onBench={() => setBenchOpen(true)}
              onClone={() => CSL.cloneActive()}
              onIpVault={() => setVaultOpen(true)} />
          )}
          {state.activeModule === 'formulation' && (
            <FormulationModule batch={batchView} pred={pred} initialPhase={initialPhase} />
          )}
          {state.activeModule === 'lab' && (
            <DigitalLab state={state} batch={batchView} pred={pred}
              onPick={(id) => CSL.setActiveId(id)}
              onOpenFormulation={() => CSL.setActiveModule('formulation')} />
          )}
          {state.activeModule === 'kinetic' && <KineticModule batch={batchView} pred={pred} />}
          {state.activeModule === 'interface' && <InterfaceModule batch={batchView} pred={pred} />}
          {state.activeModule === 'seam' && <SeamModule batch={batchView} pred={pred} />}
        </main>

        <aside className="rail-wrap">
          <DashboardRail batch={batchView} pred={pred}
            onClone={() => CSL.cloneActive()}
            onBench={() => setBenchOpen(true)}
            onIpVault={() => setVaultOpen(true)}
            onModule={(m) => CSL.setActiveModule(m)} />
        </aside>
      </div>

      {benchOpen && (
        <BenchOverlay batch={batchView} pred={pred}
          onClose={() => setBenchOpen(false)} />
      )}
      {vaultOpen && (
        <IpVaultOverlay batch={batchView} pred={pred}
          onClose={() => setVaultOpen(false)} />
      )}
      {helpOpen && window.HelpOverlay && (
        <window.HelpOverlay onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Top Bar
   ────────────────────────────────────────────────────────────── */
function TopBar({ batch, pred, activeModule, onModule, onBench, onClone, onHelp }) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__mark">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <rect x="3" y="14" width="6" height="7" fill="var(--basalt)" />
            <rect x="9" y="10" width="6" height="11" fill="var(--flint)" />
            <rect x="15" y="6" width="6" height="15" fill="var(--fuse)" />
          </svg>
        </div>
        <div>
          <div className="topbar__title">Cairn Synthesis Lab</div>
          <div className="topbar__sub mono">v0.4 · DIGITAL TWIN · CONFIDENTIAL</div>
        </div>
      </div>
      <TopNav active={activeModule} onChange={onModule} />
      <div className="topbar__rt">
        <div className="topbar__env mono">
          <span className="dim">AMB</span> {batch.env.tempC}°C
          <span className="dim" style={{ marginLeft: 10 }}>RH</span> {batch.env.humidity}%
        </div>
        <button className="btn btn--ghost" onClick={onBench}>+ BENCH</button>
        <button className="btn btn--fuse" onClick={onClone}>+ CLONE</button>
        <button className="btn btn--ghost" onClick={onHelp}
                style={{ fontWeight: 700, minWidth: 32, padding: '6px 10px' }}>?</button>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────
   Sidebar — batches + inventory
   ────────────────────────────────────────────────────────────── */
function Sidebar({ state, batchView, onPick }) {
  return (
    <aside className="sidebar">
      {/* Wizard launch — fixed position, always visible */}
      <a href="wizard.html" target="_blank" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--fuse)',
        color: '#fff',
        textDecoration: 'none',
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--fuse-deep)',
        flexShrink: 0,
      }}>
        ⬡ Batch Wizard
      </a>

      <div className="sidebar__sec">
        <div className="sidebar__hd">
          <div className="sidebar__k">PROJECTS · BATCHES</div>
          <span className="mono dim" style={{ fontSize: 9.5 }}>{state.batches.length}</span>
        </div>
        <div className="batches">
          {state.batches.map((b) => (
            <BatchListItem key={b.id} batch={b}
              active={b.id === state.activeId}
              onClick={() => onPick(b.id)} />
          ))}
        </div>
      </div>
      <div className="sidebar__sec sidebar__sec--inv">
        <div className="sidebar__hd">
          <div className="sidebar__k">MATERIAL INVENTORY</div>
          <span className="mono dim" style={{ fontSize: 9.5 }}>{state.inventory.length} SKU</span>
        </div>
        <Inventory items={state.inventory} />
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────
   Bench Entry overlay
   ────────────────────────────────────────────────────────────── */
function BenchOverlay({ batch, pred, onClose }) {
  const [kind, setKind] = appUseState('break');
  const [mpa, setMpa] = appUseState('');
  const [mode, setMode] = appUseState('brittle');
  const [note, setNote] = appUseState('');

  const submit = () => {
    const entry = { kind, note };
    if (kind === 'break') {
      entry.mpa = parseFloat(mpa) || 0;
      entry.mode = mode;
    }
    CSL.addBenchLog(entry);
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__hd">
          <div>
            <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.18em' }}>
              BENCH ENTRY
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
              {batch.name}
            </div>
            <div className="mono dim" style={{ fontSize: 11, marginTop: 4 }}>
              {batch.id} · WHERE THE REAL WORLD HITS THE MODEL
            </div>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>✕ CLOSE</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.16em', marginBottom: 6 }}>
                  ENTRY TYPE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                  {[
                    { k: 'cast', label: 'CAST' },
                    { k: 'cure', label: 'CURE' },
                    { k: 'break', label: 'BREAK' },
                    { k: 'note', label: 'NOTE' },
                  ].map((o) => (
                    <button key={o.k}
                      className={`btn ${kind === o.k ? 'btn--fuse' : 'btn--ghost'}`}
                      onClick={() => setKind(o.k)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {kind === 'break' && (
                <>
                  <div>
                    <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.16em', marginBottom: 6 }}>
                      ACTUAL BREAK POINT
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <input type="number" step="0.1" value={mpa}
                        onChange={(e) => setMpa(e.target.value)}
                        placeholder="0.0"
                        className="mono"
                        style={{
                          flex: 1, padding: '10px 12px',
                          background: 'var(--paper)',
                          border: '1px solid var(--rule-2)',
                          fontSize: 20, fontWeight: 700,
                          fontFamily: 'var(--f-mono)',
                        }} />
                      <span className="mono dim" style={{ fontSize: 14, letterSpacing: '0.12em' }}>MPa</span>
                    </div>
                    {mpa && (
                      <div className="mono dim" style={{ fontSize: 11, marginTop: 6, letterSpacing: '0.06em' }}>
                        Predicted (Flint comp): {pred.flint_s.comp.toFixed(1)} MPa  ·
                        Δ <strong style={{
                          color: (parseFloat(mpa) - pred.flint_s.comp) < 0 ? 'var(--alert)' : 'var(--good)',
                        }}>{(parseFloat(mpa) - pred.flint_s.comp).toFixed(1)} MPa</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.16em', marginBottom: 6 }}>
                      FAILURE MODE
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {[
                        { k: 'brittle', label: 'BRITTLE' },
                        { k: 'ductile', label: 'DUCTILE' },
                        { k: 'delaminated', label: 'DELAMINATED' },
                        { k: 'crumbled', label: 'CRUMBLED' },
                      ].map((o) => (
                        <button key={o.k}
                          className={`btn ${mode === o.k ? 'btn--fuse' : 'btn--ghost'}`}
                          onClick={() => setMode(o.k)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.16em', marginBottom: 6 }}>
                  NOTES
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Observed fracture surface, conditions, anything anomalous…"
                  rows={4}
                  style={{
                    width: '100%', padding: 10,
                    background: 'var(--paper)',
                    border: '1px solid var(--rule-2)',
                    fontSize: 12, fontFamily: 'var(--f-sans)',
                    color: 'var(--ink)', resize: 'vertical',
                  }} />
              </div>

              <div>
                <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.16em', marginBottom: 6 }}>
                  PHOTO LOG
                </div>
                <div style={{
                  border: '1.5px dashed var(--rule-2)',
                  padding: 18, textAlign: 'center',
                  background: 'var(--paper)',
                }}>
                  <div className="mono dim" style={{ fontSize: 11, letterSpacing: '0.10em' }}>
                    Drop SEM or macro photos here · drag-and-drop
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Card title="What the Model Predicts">
                <div className="ruled">
                  <div><span className="k">Flint comp.</span><span className="v">{pred.flint_s.comp.toFixed(1)} MPa</span></div>
                  <div><span className="k">Flint flex.</span><span className="v">{pred.flint_s.flex.toFixed(1)} MPa</span></div>
                  <div><span className="k">Fuse bond</span><span className="v">{pred.fuse.bond.toFixed(2)} MPa</span></div>
                  <div><span className="k">Marrow R</span><span className="v">{pred.marrow.R.toFixed(2)} m²K/W</span></div>
                </div>
              </Card>
              <Card title="Recent Bench Logs">
                <BenchFeed logs={batch.benchLogs} />
              </Card>
            </div>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn--fuse" onClick={submit}>SAVE ENTRY</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   IP Vault overlay
   ────────────────────────────────────────────────────────────── */
function IpVaultOverlay({ batch, pred, onClose }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880 }}>
        <div className="modal__hd">
          <div>
            <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.18em' }}>
              IP VAULT · FORMULATION REFERENCE
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
              {batch.name}
            </div>
            <div className="mono dim" style={{ fontSize: 11, marginTop: 4 }}>
              {batch.id} · GENERATED {new Date().toISOString().slice(0, 10)} · FOR PATENT/SPEC SHEET USE
            </div>
          </div>
          <button className="btn btn--ghost" onClick={onClose}>✕ CLOSE</button>
        </div>
        <div className="modal__body" style={{ background: 'var(--paper)' }}>
          <div style={{
            background: 'white', padding: 32,
            border: '1px solid var(--rule-2)',
            fontFamily: 'var(--f-serif, Newsreader, Georgia, serif)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              borderBottom: '2px solid var(--ink)', paddingBottom: 8, marginBottom: 16
            }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', fontWeight: 700 }}>
                CAIRN SYNTHESIS LAB · FORMULATION REFERENCE
              </span>
              <span className="mono dim" style={{ fontSize: 11, letterSpacing: '0.12em' }}>
                {batch.id} · {batch.status.toUpperCase()}
              </span>
            </div>
            <h2 style={{ fontSize: 22, margin: '0 0 6px', fontWeight: 700 }}>{batch.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '0 0 18px', maxWidth: 640 }}>
              Multi-phase MKP-based assembly. Composed of a basalt-loaded Flint shell,
              a thixotropic Fuse interfacial adhesive, and a perlite-foamed Marrow core
              joined via a {(batch.seam.profile || 'butt').replace(/^./, (c) => c.toUpperCase())} seam profile.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              {['flint_s', 'flint_e', 'fuse', 'marrow'].map((ph) => (
                <div key={ph}>
                  <h3 className="mono" style={{
                    fontSize: 11, letterSpacing: '0.22em',
                    fontWeight: 700, margin: '0 0 8px',
                    borderBottom: '1px solid var(--ink)', paddingBottom: 4
                  }}>
                    PHASE · {ph.toUpperCase()}
                  </h3>
                  <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(batch.phases[ph]).filter(([, v]) => v !== 0).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ padding: '3px 0', color: 'var(--ink-2)' }}>{k}</td>
                          <td className="mono" style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600 }}>
                            {Number(v).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <h3 className="mono" style={{
              fontSize: 11, letterSpacing: '0.22em',
              fontWeight: 700, margin: '24px 0 8px',
              borderBottom: '1px solid var(--ink)', paddingBottom: 4
            }}>
              PREDICTED PERFORMANCE
            </h3>
            <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td>Flint (S) compressive</td><td className="mono" style={{ textAlign: 'right' }}>{pred.flint_s.comp.toFixed(1)} MPa</td>
                  <td>Fuse bond shear</td><td className="mono" style={{ textAlign: 'right' }}>{pred.fuse.bond.toFixed(2)} MPa</td></tr>
                <tr><td>Flint (S) flexural</td><td className="mono" style={{ textAlign: 'right' }}>{pred.flint_s.flex.toFixed(1)} MPa</td>
                  <td>Fuse work window</td><td className="mono" style={{ textAlign: 'right' }}>{pred.fuse.workMin} min</td></tr>
                <tr><td>Marrow R-value</td><td className="mono" style={{ textAlign: 'right' }}>{pred.marrow.R.toFixed(2)} m²K/W</td>
                  <td>Marrow density</td><td className="mono" style={{ textAlign: 'right' }}>{pred.marrow.density.toFixed(0)} kg/m³</td></tr>
                <tr><td>Cost / m³</td><td className="mono" style={{ textAlign: 'right' }}>${pred.cost.total}</td>
                  <td>Ambient / RH</td><td className="mono" style={{ textAlign: 'right' }}>{batch.env.tempC}°C · {batch.env.humidity}%</td></tr>
              </tbody>
            </table>

            <div style={{
              marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--rule-2)',
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, letterSpacing: '0.16em',
              fontFamily: 'var(--f-mono)', color: 'var(--ink-3)'
            }}>
              <span>CONFIDENTIAL · INTERNAL USE</span>
              <span>SIG: {batch.id}-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="modal__ft">
          <button className="btn btn--ghost" onClick={onClose}>CLOSE</button>
          <button className="btn" onClick={() => window.print()}>PRINT</button>
          <button className="btn btn--fuse" onClick={() => {
            CSL.addBenchLog({ kind: 'note', note: `Exported IP Vault sheet at ${new Date().toISOString()}` });
            onClose();
          }}>EXPORT + LOG</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Tweaks Panel (visual + batch presets)
   ────────────────────────────────────────────────────────────── */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c4753a",
  "density": "comfortable",
  "preset": "—"
}/*EDITMODE-END*/;

function AppTweaks() {
  if (!window.TweaksPanel) return null;
  const [t, setT] = window.useTweaks(TWEAK_DEFAULTS);

  appUseEffect(() => {
    document.documentElement.style.setProperty('--fuse', t.accent);
  }, [t.accent]);

  appUseEffect(() => {
    document.documentElement.dataset.density = t.density;
  }, [t.density]);

  return (
    <window.TweaksPanel title="Tweaks">
      <window.TweakSection title="VISUALS">
        <window.TweakColor
          label="Accent · Fuse"
          value={t.accent}
          options={['#c4753a', '#a8362c', '#5d7d70', '#2c5f7c', '#807a6e']}
          onChange={(v) => setT('accent', v)} />
        <window.TweakRadio
          label="Density"
          value={t.density}
          options={[
            { value: 'comfortable', label: 'Comfy' },
            { value: 'dense', label: 'Dense' },
          ]}
          onChange={(v) => setT('density', v)} />
      </window.TweakSection>
      <window.TweakSection title="BATCH STATE">
        <div style={{ display: 'grid', gap: 6 }}>
          {[
            { k: 'fresh', label: 'Fresh pour', desc: 'New mix · no bench data' },
            { k: 'midpour', label: 'Mid-pour', desc: 'Cured 24h · some logs' },
            { k: 'cured', label: 'Cured 28d', desc: 'Locked · break logs in' },
            { k: 'failed', label: 'Failed', desc: 'Delaminated · post-mortem' },
          ].map((p) => (
            <button key={p.k} className="btn btn--ghost"
              onClick={() => {
                CSL.applyPreset(p.k);
                setT('preset', p.k);
              }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', gap: 2, padding: '8px 10px',
                textAlign: 'left'
              }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
                {p.label.toUpperCase()}
              </span>
              <span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.04em' }}>
                {p.desc}
              </span>
            </button>
          ))}
        </div>
      </window.TweakSection>
      <window.TweakSection title="DATA">
        <window.TweakButton onClick={() => {
          if (confirm('Reset all batches to seed data?')) {
            CSL.reset(); location.reload();
          }
        }}>RESET ALL BATCHES</window.TweakButton>
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.Fragment>
    <App />
    <AppTweaks />
  </React.Fragment>
);
