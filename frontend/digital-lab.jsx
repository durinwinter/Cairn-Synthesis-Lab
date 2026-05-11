// digital-lab.jsx — Digital lab workflow: objectives, search, provenance, DOE suggestions.

const labUseMemo = React.useMemo;
const labUseState = React.useState;

function DigitalLab({ state, batch, pred, onPick, onOpenFormulation }) {
  const [query, setQuery] = labUseState('');
  const [status, setStatus] = labUseState('all');
  const [minScore, setMinScore] = labUseState(0);
  const candidates = labUseMemo(
    () => CSL.suggestCandidates(batch.id, 6),
    [batch.id, JSON.stringify(batch.phases), JSON.stringify(batch.seam), JSON.stringify(batch.objectives)]
  );
  const rows = labUseMemo(
    () => CSL.searchBatches({ q: query, status, minScore }),
    [query, status, minScore, state.activeId, JSON.stringify(state.batches)]
  );
  const features = CSL.featureVector(batch);
  const measured = CSL.measuredPerformance(batch);
  const summary = CSL.summarizePrediction(batch, pred);

  return (
    <div className="modulepage">
      <div className="lab-hero">
        <div>
          <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.18em' }}>
            DIGITAL LAB · SPEC → RUN → MEASURE → SUGGEST
          </div>
          <h1>{batch.name}</h1>
          <div className="lab-hero__meta">
            <span>{batch.id}</span>
            <span>{batch.status.toUpperCase()}</span>
            <span>{batch.model.id}</span>
            {batch.lineage.parentId && <span>FROM {batch.lineage.parentId}</span>}
          </div>
        </div>
        <div className="lab-score">
          <div className="lab-score__v">{Math.round(summary.score * 100)}</div>
          <div className="lab-score__k">FIT SCORE</div>
        </div>
      </div>

      <div className="row2">
        <ObjectiveCard batch={batch} pred={pred} />
        <ProvenanceCard batch={batch} pred={pred} features={features} measured={measured} />
      </div>

      <Card title="Next Experiments"
        right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>LOCAL DOE · ACTIVE-LEARNING HEURISTIC</span>}>
        <div className="candidate-grid">
          {candidates.map((c) => (
            <CandidateCard key={c.tempId} candidate={c} onCreate={() => CSL.createCandidate(c)} />
          ))}
        </div>
      </Card>

      <Card title="Formulation Library"
        right={<button className="btn btn--ghost" onClick={onOpenFormulation}>OPEN SANDBOX</button>}>
        <div className="library-tools">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batches, notes, tags"
            className="lab-input" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="lab-input">
            <option value="all">All states</option>
            <option value="research">Research</option>
            <option value="bench">Bench</option>
            <option value="locked">Locked</option>
            <option value="failed">Failed</option>
          </select>
          <label className="lab-check">
            <input type="checkbox" checked={minScore > 0} onChange={(e) => setMinScore(e.target.checked ? 0.75 : 0)} />
            <span>High-fit only</span>
          </label>
        </div>
        <div className="library-table">
          <div className="library-row library-row--head">
            <span>Batch</span><span>Score</span><span>Strength</span><span>Bond</span><span>R</span><span>Cost</span>
          </div>
          {rows.map(({ batch: b, summary: s, measured: m }) => (
            <button key={b.id} className="library-row" data-active={b.id === batch.id ? '1' : '0'}
              onClick={() => onPick(b.id)}>
              <span>
                <strong>{b.id}</strong> {b.name}
                {m && <em>{m.avgBreak} MPa measured · n={m.n}</em>}
              </span>
              <span>{Math.round(s.score * 100)}</span>
              <span>{s.comp.toFixed(1)} MPa</span>
              <span>{s.bond.toFixed(2)} MPa</span>
              <span>{s.rValue.toFixed(2)}</span>
              <span>${s.cost}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ObjectiveCard({ batch, pred }) {
  const objective = batch.objectives || CSL.OBJECTIVE_BASE();
  const checks = [
    { k: 'Flint compressive', value: pred.flint_s.comp, target: objective.compMin, unit: 'MPa', dir: 'min' },
    { k: 'Flexural', value: pred.flint_s.flex, target: objective.flexMin, unit: 'MPa', dir: 'min' },
    { k: 'Marrow R-value', value: pred.marrow.R, target: objective.rValueMin, unit: 'm²K/W', dir: 'min' },
    { k: 'Wicking risk', value: pred.seam.wick, target: 0.7, unit: '', dir: 'max' },
    { k: 'Density', value: pred.flint_s.density, target: objective.densityMax, unit: 'g/cm³', dir: 'max' },
    { k: 'Cure peak', value: pred.flint_s.curePeak, target: objective.cureMax, unit: '°C', dir: 'max' },
    { k: 'Cost limit', value: pred.cost.total, target: objective.costMax, unit: '$', dir: 'max' },
  ];
  return (
    <Card title="Structural Objective Checks"
      right={<Stamp kind={pred.flint_s.flash ? 'failed' : 'research'}>{pred.flint_s.flash ? 'RISK' : 'SPEC'}</Stamp>}>
      <div className="objective-list">
        {checks.map((c) => {
          const pass = c.dir === 'min' ? c.value >= c.target : c.value <= c.target;
          return (
            <div key={c.k} className="objective-row" data-pass={pass ? '1' : '0'}>
              <span>{c.k}</span>
              <strong>{Number(c.value).toFixed(c.value < 10 ? 2 : 1)} <em>{c.unit}</em></strong>
              <small>{c.dir === 'min' ? 'min' : 'max'} {c.target}</small>
            </div>
          );
        })}
      </div>
      <div className="objective-controls">
        <Slider label="Strength target" value={objective.compMin} min={30} max={120} step={1} unit=" MPa"
          onChange={(v) => CSL.setObjective('compMin', v)} />
        <Slider label="Bond target" value={objective.bondMin} min={1} max={10} step={0.1} unit=" MPa"
          onChange={(v) => CSL.setObjective('bondMin', v)} />
        <Slider label="Insulation target" value={objective.rMin} min={0.8} max={5.5} step={0.1} unit=" m²K/W"
          onChange={(v) => CSL.setObjective('rMin', v)} />
        <Slider label="Cost ceiling" value={objective.costMax} min={500} max={3000} step={25} unit=" $/m³"
          onChange={(v) => CSL.setObjective('costMax', v)} />
      </div>
    </Card>
  );
}

function ProvenanceCard({ batch, pred, features, measured }) {
  return (
    <Card title="Provenance & Features"
      right={<span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.16em' }}>GEMD-INSPIRED RECORD</span>}>
      <div className="provenance-grid">
        <KV k="Spec" v={batch.id} />
        <KV k="Lineage" v={batch.lineage.parentId || 'seed'} />
        <KV k="Measurements" v={(batch.measurements || []).length} />
        <KV k="Bench breaks" v={measured ? measured.n : 0} />
      </div>
      <div className="feature-chips">
        {Object.entries(features).map(([k, v]) => (
          <span key={k}>{k}: <strong>{Number(v).toFixed(Number(v) < 1 ? 3 : 2)}</strong></span>
        ))}
      </div>
      <div className="mono dim" style={{ fontSize: 10, letterSpacing: '0.08em', marginTop: 10 }}>
        Predicted with {batch.model.id}; score {Math.round(CSL.scoreBatch(batch, pred) * 100)}.
      </div>
    </Card>
  );
}

function CandidateCard({ candidate, onCreate }) {
  const s = candidate.summary;
  return (
    <div className="candidate">
      <div className="candidate__top">
        <span>{candidate.tempId}</span>
        <strong>{Math.round(s.score * 100)}</strong>
      </div>
      <div className="candidate__name">{candidate.name}</div>
      <div className="candidate__metrics">
        <span>{s.comp.toFixed(0)} MPa</span>
        <span>{s.bond.toFixed(1)} bond</span>
        <span>R {s.rValue.toFixed(2)}</span>
        <span>${s.cost}</span>
      </div>
      <div className="candidate__why">
        <div className="mono dim" style={{ fontSize: 9.5 }}>
          {candidate.batch.lineage.method || 'DOE'} · fiber {candidate.batch.phases.flint_s.BasaltFiber.toFixed(1)} ·
          P-{candidate.batch.phases.marrow.Perlite}
        </div>
      </div>
      <button className="btn btn--fuse" onClick={onCreate}>CREATE BATCH</button>
    </div>
  );
}

Object.assign(window, { DigitalLab });
