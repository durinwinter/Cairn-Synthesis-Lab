// dashboard.jsx — Master view for Cairn Synthesis Lab.

const dashUseMemo = React.useMemo;
const dashUseState = React.useState;

function Dashboard({ batch, pred, onModule, onBench, onClone, onIpVault }) {
  const metrics = dashUseMemo(() => CSL.radarMetrics(pred), [pred]);
  const radarMetrics = metrics;

  return (
    <div className="modulepage" style={{ paddingTop: 18 }}>
      {/* Pour Pipeline header */}
      <PourPipeline batch={batch} pred={pred} />

      {/* Master matrix — Flint / Fuse / Marrow side-by-side */}
      <MasterMatrix batch={batch} pred={pred} onModule={onModule} />

      {/* Module shortcuts */}
      <div>
        <SectionHead title="MODULES" sub="Drill into any system layer." />
        <ModuleGrid onModule={onModule} pred={pred} />
      </div>

      {/* Ternary + cost waterfall */}
      <div className="row2">
        <Card title="Phase Stability · Ternary"
              dark
              right={<span className="dim-d mono" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>FLINT · MgO–KH₂PO₄–H₂O</span>}>
          <TernaryPlot batches={CSL.getState().batches} activeId={batch.id} />
        </Card>
        <Card title="Cost / m³ · Waterfall"
              right={<span className="dim mono" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>USD · ALL PHASES</span>}>
          <Waterfall
            items={[
              { label: 'Flint',   value: pred.cost.flint,  color: 'var(--flint)' },
              { label: 'Fuse',    value: pred.cost.fuse,   color: 'var(--fuse)' },
              { label: 'Marrow',  value: pred.cost.marrow, color: 'var(--marrow-warm)' },
            ]}
            total={pred.cost.total}
          />
        </Card>
      </div>

      {/* Bench log feed */}
      <Card title="Bench Log · Recent"
            right={<button className="btn btn--ghost" onClick={onBench}>+ ENTRY</button>}>
        <BenchFeed logs={batch.benchLogs} />
      </Card>
    </div>
  );
}

// ── Section heading inside dashboard ─────────────────────────
function SectionHead({ title, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      borderBottom: '1px solid var(--rule-2)',
      paddingBottom: 8, marginBottom: 10,
    }}>
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-2)',
      }}>{title}</div>
      {sub && <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 10,
        color: 'var(--ink-3)', letterSpacing: '0.08em',
      }}>{sub}</div>}
    </div>
  );
}

// ── The Master Matrix: 3 columns of phase recipes ─────────────
function MasterMatrix({ batch, pred, onModule }) {
  return (
    <div className="row3" style={{ gap: 12 }}>
      <PhaseColumn
        phase="flint"
        accent="var(--flint)"
        title="FLINT"
        subtitle="Precast Structural Shell"
        recipe={batch.phases.flint}
        recipeFields={[
          { k: 'MgPO4', label: 'Mg/PO₄', unit: '', warn: (v) => v > 7.5 || v < 5.0 },
          { k: 'Borax', label: 'Borax', unit: '%' },
          { k: 'BasaltFiber', label: 'Basalt fiber', unit: 'v%' },
          { k: 'NanoHAp', label: 'Nano-HAp', unit: '%' },
          { k: 'WB', label: 'W/B', unit: '' },
        ]}
        predictions={[
          { k: 'Compressive',  v: pred.flint.comp,    unit: 'MPa' },
          { k: 'Flexural',     v: pred.flint.flex,    unit: 'MPa' },
          { k: 'E-modulus',    v: pred.flint.E,       unit: 'GPa' },
          { k: 'Density',      v: pred.flint.density, unit: 'g/cm³' },
        ]}
        onModule={onModule}
        flash={pred.flint.flash}
      />
      <PhaseColumn
        phase="fuse"
        accent="var(--fuse)"
        title="FUSE"
        subtitle="Interfacial Bond Adhesive"
        recipe={batch.phases.fuse}
        recipeFields={[
          { k: 'MgPO4', label: 'Mg/PO₄', unit: '' },
          { k: 'Borax', label: 'Borax', unit: '%' },
          { k: 'Retarder', label: 'Retarder', unit: '%' },
          { k: 'Seeds', label: 'MKP seeds', unit: '%' },
          { k: 'Thixo', label: 'Thixotropy', unit: '' },
        ]}
        predictions={[
          { k: 'Bond shear',   v: pred.fuse.bond,    unit: 'MPa' },
          { k: 'Tensile',      v: pred.fuse.tensile, unit: 'MPa' },
          { k: 'Work window',  v: pred.fuse.workMin, unit: 'min' },
          { k: 'Viscosity',    v: pred.fuse.viscosity, unit: 'Pa·s' },
        ]}
        onModule={onModule}
      />
      <PhaseColumn
        phase="marrow"
        accent="var(--marrow-warm)"
        title="MARROW"
        subtitle="Insulating Foamed Core"
        recipe={batch.phases.marrow}
        recipeFields={[
          { k: 'MgPO4', label: 'Mg/PO₄', unit: '' },
          { k: 'H2O2', label: 'H₂O₂', unit: '%' },
          { k: 'Perlite', label: 'Perlite', unit: 'v%' },
          { k: 'Borax', label: 'Borax', unit: '%' },
          { k: 'Surfactant', label: 'Surfactant', unit: '%' },
        ]}
        predictions={[
          { k: 'Density',      v: pred.marrow.density, unit: 'kg/m³' },
          { k: 'R-value',      v: pred.marrow.R,       unit: 'm²K/W' },
          { k: 'Conductivity', v: pred.marrow.therm,   unit: 'W/mK' },
          { k: 'Comp.',        v: pred.marrow.comp,    unit: 'MPa' },
        ]}
        onModule={onModule}
      />
    </div>
  );
}

function PhaseColumn({ phase, accent, title, subtitle, recipe, recipeFields,
                       predictions, onModule, flash }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card__hd" style={{
        background: 'var(--basalt)', color: 'var(--bone-1)',
        borderBottom: `2px solid ${accent}`,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--bone-3)',
            letterSpacing: '0.18em', fontWeight: 600,
          }}>PHASE · {phase.toUpperCase()}</div>
          <div style={{
            fontFamily: 'var(--f-sans)', fontSize: 18, fontWeight: 800,
            color: 'var(--bone-1)', letterSpacing: '-0.01em', marginTop: 2,
          }}>{title}</div>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 9.5, color: 'var(--bone-2)',
            letterSpacing: '0.10em', marginTop: 1,
          }}>{subtitle}</div>
        </div>
        <span className="phasetab__swatch" style={{
          position: 'static',
          background: accent,
          width: 18, height: 18,
          border: '1px solid rgba(0,0,0,0.4)',
        }} />
      </div>

      <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Recipe */}
        <div>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 4,
          }}>RECIPE</div>
          <div className="ruled">
            {recipeFields.map((f) => {
              const v = recipe[f.k];
              const warn = f.warn && f.warn(v);
              return (
                <div key={f.k}>
                  <span className="k" style={{ color: warn ? 'var(--alert)' : 'var(--ink-3)' }}>
                    {warn && <span style={{ marginRight: 4 }}>⚠</span>}
                    {f.label}
                  </span>
                  <span className="v">
                    {Number(v).toFixed(v < 1 ? 2 : 1)}<em style={{
                      color: 'var(--ink-3)', fontStyle: 'normal', fontWeight: 400,
                      fontSize: 9.5, paddingLeft: 3,
                    }}>{f.unit}</em>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Predictions */}
        <div>
          <div style={{
            fontFamily: 'var(--f-mono)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 4,
          }}>PREDICTED</div>
          <div className="ruled">
            {predictions.map((p) => (
              <div key={p.k}>
                <span className="k">{p.k}</span>
                <span className="v" style={{ color: accent }}>
                  {Number(p.v).toFixed(p.v < 1 ? 3 : 1)}<em style={{
                    color: 'var(--ink-3)', fontStyle: 'normal', fontWeight: 400,
                    fontSize: 9.5, paddingLeft: 3,
                  }}>{p.unit}</em>
                </span>
              </div>
            ))}
          </div>
        </div>
        {flash && (
          <Warning title="FLASH-SET RISK">
            Mg/PO₄ outside safety buffer. Add Borax or reduce ambient T.
          </Warning>
        )}
        <button className="btn btn--ghost" onClick={() => onModule('formulation', phase)}
                style={{ alignSelf: 'flex-start' }}>
          OPEN SANDBOX →
        </button>
      </div>
    </div>
  );
}

// ── Module shortcut grid ──────────────────────────────────────
function ModuleGrid({ onModule, pred }) {
  const cards = [
    {
      id: 'formulation', num: '01', name: 'Multi-Phase\nFormulation',
      desc: 'Sandbox the chemical DNA — Flint, Fuse, Marrow recipes with safety buffers.',
      diag: (
        <svg viewBox="0 0 120 28" width="100%" height="28">
          <line x1="0" y1="14" x2="120" y2="14" stroke="var(--rule-2)" />
          {[12, 28, 48, 68, 88, 108].map((x, i) => (
            <rect key={i} x={x - 4} y={6 + (i % 3) * 4} width="8" height={16 - (i % 3) * 4}
                  fill={i === 2 ? 'var(--fuse)' : i === 4 ? 'var(--marrow-warm)' : 'var(--flint)'} />
          ))}
        </svg>
      ),
    },
    {
      id: 'kinetic', num: '02', name: 'Curing &\nKinetic Timeline',
      desc: 'The life of a pour — exotherm, working window, environmental coupling.',
      diag: (
        <svg viewBox="0 0 120 28" width="100%" height="28">
          <path d="M0 26 Q 30 26, 50 6 T 120 22" fill="none" stroke="var(--fuse)" strokeWidth="1.6" />
          <circle cx="50" cy="6" r="3" fill="var(--fuse)" />
        </svg>
      ),
    },
    {
      id: 'interface', num: '03', name: 'Interface &\nSeam Analytics',
      desc: 'Bond stress simulator, porosity heatmap, wicking warning at the seam.',
      diag: (
        <svg viewBox="0 0 120 28" width="100%" height="28">
          {Array.from({ length: 30 }).map((_, i) => {
            const r = Math.sin(i * 12.9) * 43.5;
            const t = (r - Math.floor(r));
            const c = t > 0.5 ? 'var(--marrow-warm)' : 'var(--flint)';
            return <rect key={i} x={i * 4} y={2 + (i % 5) * 4} width="3" height="3" fill={c} opacity={t} />;
          })}
        </svg>
      ),
    },
    {
      id: 'seam', num: '04', name: 'Seam Geometry\nDesigner',
      desc: 'Pick a joint, simulate vitals, export the mold profile.',
      diag: (
        <svg viewBox="0 0 120 28" width="100%" height="28">
          <rect x="0" y="2" width="120" height="10" fill="var(--flint)" opacity="0.85" />
          <rect x="0" y="16" width="120" height="10" fill="var(--marrow-warm)" opacity="0.85" />
          <path d="M0 14 L20 14 L26 8 L40 8 L46 20 L60 20 L66 8 L80 8 L86 20 L100 20 L106 8 L120 8"
                fill="none" stroke="var(--ink)" strokeWidth="1.4" />
        </svg>
      ),
    },
  ];
  return (
    <div className="modulegrid">
      {cards.map((c) => (
        <button key={c.id} className="modulecard" onClick={() => onModule(c.id)}>
          <div className="modulecard__hd">
            <div className="modulecard__num">MODULE {c.num}</div>
            <span className="mono dim" style={{ fontSize: 12 }}>→</span>
          </div>
          <div className="modulecard__name" style={{ whiteSpace: 'pre-line' }}>{c.name}</div>
          <div className="modulecard__desc">{c.desc}</div>
          <div className="modulecard__diag">{c.diag}</div>
        </button>
      ))}
    </div>
  );
}

// ── Bench feed ────────────────────────────────────────────────
function BenchFeed({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="mono dim" style={{ padding: 12, fontSize: 11, textAlign: 'center', letterSpacing: '0.08em' }}>
        — no bench entries yet · click "+ ENTRY" to log a result —
      </div>
    );
  }
  const kindLabel = { cast: 'CAST', cure: 'CURE', break: 'BREAK', note: 'NOTE' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {logs.slice(0, 6).map((l, i) => {
        const ts = new Date(l.ts);
        const days = Math.floor((Date.now() - l.ts) / 86400000);
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '80px 80px 1fr auto',
            gap: 12, padding: '8px 0',
            borderBottom: i < logs.slice(0, 6).length - 1 ? '1px solid var(--rule-1)' : 'none',
            alignItems: 'baseline',
          }}>
            <span className="mono dim" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
              {ts.toISOString().slice(2, 10).replace(/-/g, '·')}
            </span>
            <span className="stamp" style={{
              color: l.kind === 'break' ? 'var(--alert)' : 'var(--ink-2)',
              fontSize: 8, padding: '2px 5px 1px', justifySelf: 'start',
            }}>
              {kindLabel[l.kind] || l.kind.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-1)' }}>
              {l.mpa != null && (
                <span className="mono" style={{ fontWeight: 700, marginRight: 8 }}>
                  {l.mpa} MPa
                </span>
              )}
              {l.mode && <Tag>{l.mode}</Tag>}
              {l.note && <span style={{ marginLeft: l.mode ? 8 : 0, color: 'var(--ink-2)' }}>{l.note}</span>}
            </span>
            <span className="mono dim" style={{ fontSize: 10 }}>
              T-{days}d
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Right rail (Dashboard) ────────────────────────────────────
function DashboardRail({ batch, pred, onClone, onBench, onIpVault, onPreset }) {
  const metrics = CSL.radarMetrics(pred);
  const days = Math.floor((Date.now() - batch.createdAt) / 86400000);
  const totalLogs = (batch.benchLogs || []).length;

  // Last break vs predicted (compute delta if exists)
  const lastBreak = (batch.benchLogs || []).find((l) => l.kind === 'break');

  return (
    <div className="rail">
      {/* Batch header */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8,
        }}>
          <div>
            <div className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.18em' }}>
              ACTIVE BATCH
            </div>
            <div style={{
              fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em',
              marginTop: 2, lineHeight: 1.15,
            }}>{batch.name}</div>
            <div className="mono dim" style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.06em' }}>
              {batch.id} · {days}d · {totalLogs} log{totalLogs === 1 ? '' : 's'}
            </div>
          </div>
          <Stamp kind={batch.status} />
        </div>
        {batch.notes && (
          <div className="mono dim" style={{
            fontSize: 10.5, marginTop: 8, lineHeight: 1.5,
            padding: 8, background: 'var(--paper)',
            border: '1px solid var(--rule-1)', borderLeft: '3px solid var(--concrete-300)',
          }}>
            {batch.notes}
          </div>
        )}
      </div>

      {/* Phase Compass */}
      <Card title="Phase Compass" dark
            right={<span className="mono dim-d" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>STEER YOUR POUR</span>}>
        <PhaseCompass metrics={metrics} />
      </Card>

      {/* Performance Radar */}
      <Card title="Performance Radar"
            right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>0–100 NORM.</span>}>
        <PerformanceRadar metrics={metrics} />
      </Card>

      {/* Quick actions */}
      <Card title="Actions">
        <div style={{ display: 'grid', gap: 6 }}>
          <button className="btn btn--fuse" onClick={onClone}>+ CLONE &amp; MUTATE</button>
          <button className="btn" onClick={onBench}>BENCH ENTRY</button>
          <button className="btn btn--ghost" onClick={onIpVault}>PRINT LAB SHEET</button>
          <button className="btn btn--ghost" onClick={onIpVault}>EXPORT IP VAULT</button>
        </div>
      </Card>

      {/* Delta */}
      {lastBreak && (
        <Card title="Predicted vs Actual">
          <DeltaRow label="Compressive break"
                    actual={lastBreak.mpa}
                    predicted={pred.flint.comp}
                    unit="MPa" mode={lastBreak.mode} />
        </Card>
      )}
    </div>
  );
}

function DeltaRow({ label, actual, predicted, unit, mode }) {
  const delta = actual - predicted;
  const pct = (delta / predicted) * 100;
  return (
    <div>
      <div className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.14em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <div>
          <div className="mono dim" style={{ fontSize: 8.5, letterSpacing: '0.16em' }}>ACTUAL</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{actual}<em style={{
            color: 'var(--ink-3)', fontSize: 10, fontStyle: 'normal', padding: '0 0 0 2px',
          }}>{unit}</em></div>
        </div>
        <div>
          <div className="mono dim" style={{ fontSize: 8.5, letterSpacing: '0.16em' }}>PREDICTED</div>
          <div className="mono dim" style={{ fontSize: 14, fontWeight: 600 }}>{predicted.toFixed(1)}{unit}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div className="mono dim" style={{ fontSize: 8.5, letterSpacing: '0.16em' }}>Δ</div>
          <div className="mono" style={{
            fontSize: 14, fontWeight: 700,
            color: delta < 0 ? 'var(--alert)' : 'var(--good)',
          }}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}<em style={{
            color: 'var(--ink-3)', fontSize: 10, fontStyle: 'normal', padding: '0 0 0 3px',
          }}>{pct.toFixed(0)}%</em></div>
        </div>
      </div>
      {mode && (
        <div style={{ marginTop: 6 }}>
          <Tag dot={mode === 'delaminated' ? 'alert' : 'flint'}>{mode}</Tag>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Dashboard, DashboardRail, SectionHead });
