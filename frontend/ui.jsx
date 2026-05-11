// ui.jsx — Shared UI atoms for Cairn Synthesis Lab.

const { useState: uiUseState, useEffect: uiUseEffect, useRef: uiUseRef, useCallback: uiUseCallback, useMemo: uiUseMemo } = React;

// ── Slider ─────────────────────────────────────────────────────
// Industrial slider with optional safety zones (warn/good) and ticks.
function Slider({
  label, hint, value, min = 0, max = 100, step = 1, unit = '',
  zones = [], ticks, onChange, precision,
}) {
  const ref = uiUseRef(null);
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = precision != null ? precision : (String(step).split('.')[1] || '').length;
  const fmt = (v) => Number(v).toFixed(decimals);

  return (
    <div className="slider">
      <div className="slider__head">
        <div>
          <div className="slider__label">{label}</div>
          {hint && <div className="slider__hint">{hint}</div>}
        </div>
        <div className="slider__val">
          {fmt(value)}{unit && <em>{unit}</em>}
        </div>
      </div>
      <div className="slider__track-wrap" ref={ref}>
        <div className="slider__track">
          {zones.map((z, i) => {
            const a = ((z.from - min) / (max - min)) * 100;
            const b = ((z.to - min) / (max - min)) * 100;
            return (
              <div key={i} className={`slider__zone slider__zone--${z.kind}`}
                style={{ left: `${a}%`, width: `${b - a}%` }} />
            );
          })}
          <div className="slider__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="slider__thumb" style={{ left: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
      </div>
      {ticks && (
        <div className="slider__ticks">
          {ticks.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

// ── Stamp ─────────────────────────────────────────────────────
function Stamp({ kind, children }) {
  return <span className={`stamp stamp--${kind}`}>{children || kind}</span>;
}

// ── KV row ────────────────────────────────────────────────────
function KV({ k, v, unit }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{v}{unit && <em style={{ color: 'var(--ink-3)', fontStyle: 'normal', fontWeight: 400, fontSize: 9.5, letterSpacing: '0.06em', paddingLeft: 3 }}>{unit}</em>}</span>
    </div>
  );
}

// ── Cell ──────────────────────────────────────────────────────
function Cell({ k, v, unit, delta, dark, children }) {
  return (
    <div className={`cell${dark ? ' cell--dark' : ''}`}>
      <div className="cell__k">{k}</div>
      <div className="cell__v">
        {v}{unit && <em>{unit}</em>}
      </div>
      {delta != null && (
        <div className={`cell__delta cell__delta--${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}{unit}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Card / Panel ──────────────────────────────────────────────
function Card({ title, dark, right, children, style, bodyStyle }) {
  return (
    <div className={dark ? 'panel-dark' : 'card'} style={style}>
      {(title || right) && (
        <div className="card__hd">
          {title && <div className="card__title">{title}</div>}
          {right}
        </div>
      )}
      <div className="card__body" style={bodyStyle}>{children}</div>
    </div>
  );
}

// ── Pour Pipeline header ──────────────────────────────────────
function PourPipeline({ batch, pred }) {
  const steps = [
    { k: 'CHARGE', v: 'MgO + KH₂PO₄', sub: `${batch.phases.flint_s.MgPO4.toFixed(2)} Mg/PO₄`, active: false },
    { k: 'MIX', v: 'BORAX HOLD', sub: `+ ${batch.phases.flint_s.Borax.toFixed(1)}% borax`, active: false },
    { k: 'POUR', v: 'WORKING', sub: `${pred.flint_s.workMin} min window`, active: true },
    { k: 'CURE', v: `Δ ${pred.flint_s.curePeak.toFixed(0)}°C`, sub: `peak T+${(8 + 6 * batch.phases.flint_s.Borax).toFixed(0)} min`, active: false },
    { k: 'SET', v: `${pred.flint_s.comp.toFixed(0)} MPa`, sub: '28-day target', active: false },
  ];
  const progress = Math.max(0, Math.min(100, Math.round(
    (pred.flint_s.workMin / 60) * 100
  )));
  return (
    <div className="pipeline">
      {steps.map((s, i) => (
        <div key={i} className="pipeline__step" data-active={s.active ? '1' : '0'}>
          <div className="pipeline__dot" />
          <div className="pipeline__k">0{i + 1} · {s.k}</div>
          <div className="pipeline__v">{s.v}</div>
          <div className="pipeline__sub">{s.sub}</div>
        </div>
      ))}
      <div className="pipeline__progress">
        <div className="v">{progress}</div>
        <div className="k">% WINDOW</div>
      </div>
    </div>
  );
}

// ── Batch list (sidebar) ──────────────────────────────────────
function BatchListItem({ batch, active, onClick }) {
  const statusKey = batch.status;
  const created = new Date(batch.createdAt);
  const days = Math.floor((Date.now() - batch.createdAt) / 86400000);
  return (
    <div className="batch" data-active={active ? '1' : '0'}
      data-status={statusKey} onClick={onClick}>
      <div className="batch__stripe" />
      <div className="batch__body">
        <div className="batch__id">{batch.id} · {STATUS_LABEL[statusKey]}</div>
        <div className="batch__name">{batch.name}</div>
        <div className="batch__meta">
          {days === 0 ? 'today' : `${days}d ago`}
          {batch.benchLogs && batch.benchLogs.length > 0 && ` · ${batch.benchLogs.length} log${batch.benchLogs.length === 1 ? '' : 's'}`}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL = {
  locked: 'LOCKED',
  bench: 'BENCH',
  research: 'RESEARCH',
  failed: 'FAILED',
};

// ── Top nav ───────────────────────────────────────────────────
function TopNav({ active, onChange }) {
  const tabs = [
    { id: 'dashboard', ix: '00', label: 'DASHBOARD' },
    { id: 'formulation', ix: '01', label: 'FORMULATION' },
    { id: 'lab', ix: '02', label: 'DIGITAL LAB' },
    { id: 'kinetic', ix: '03', label: 'KINETIC' },
    { id: 'interface', ix: '04', label: 'INTERFACE' },
    { id: 'seam', ix: '05', label: 'SEAM' },
  ];
  return (
    <div className="topbar__nav">
      {tabs.map((t) => (
        <button key={t.id} className="topbar__navbtn"
          data-active={active === t.id ? '1' : '0'}
          onClick={() => onChange(t.id)}>
          <span className="ix">{t.ix}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ── Inventory rail (sidebar bottom) ───────────────────────────
function Inventory({ items }) {
  return (
    <div className="ruled" style={{ padding: '6px 14px 14px' }}>
      {items.map((it) => (
        <div key={it.sku} title={it.lot}>
          <span className="k" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <span className={`dot ${it.flag === 'low' ? 'dot--alert' : ''}`} />
            {it.name}
          </span>
          <span className="v" style={{ whiteSpace: 'nowrap' }}>
            {it.stock.toFixed(it.stock < 1 ? 2 : 1)} <em style={{
              color: 'var(--ink-3)', fontStyle: 'normal', fontWeight: 400,
              fontSize: 9, padding: '0 0 0 2px',
            }}>{it.unit}</em>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Warning banner ────────────────────────────────────────────
function Warning({ title, children, good }) {
  return (
    <div className={`warning${good ? ' warning--good' : ''}`}>
      <span style={{ fontWeight: 700 }}>{good ? '◉' : '⚠'}</span>
      <div>
        {title && <div className="warning__title">{title}</div>}
        <div style={{ marginTop: title ? 2 : 0 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Tag ───────────────────────────────────────────────────────
function Tag({ children, dot }) {
  return (
    <span className="tag">
      {dot && <span className={`dot dot--${dot}`} style={{ width: 6, height: 6, marginRight: 2 }} />}
      {children}
    </span>
  );
}

// ── Bench feed (compact list of recent bench logs) ────────────
function BenchFeed({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="mono dim" style={{ fontSize: 11, padding: '12px 4px', letterSpacing: '0.06em' }}>
        No bench entries yet. Hit <strong style={{ color: 'var(--ink)' }}>+ BENCH</strong> after the lab.
      </div>
    );
  }
  const KIND_COLOR = {
    cast: 'var(--marrow-edge)',
    cure: 'var(--retarder)',
    break: 'var(--alert)',
    note: 'var(--ink-3)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {logs.slice(0, 6).map((l, i) => {
        const date = l.at ? new Date(l.at) : null;
        const stamp = date
          ? date.toISOString().slice(5, 16).replace('T', ' ')
          : '—';
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '56px 1fr auto',
            gap: 10, alignItems: 'baseline',
            padding: '7px 0',
            borderTop: i === 0 ? 'none' : '1px dashed var(--rule)',
            fontSize: 11.5,
          }}>
            <span className="mono" style={{
              fontSize: 9.5, letterSpacing: '0.12em', fontWeight: 700,
              color: KIND_COLOR[l.kind] || 'var(--ink-3)',
            }}>
              {(l.kind || 'note').toUpperCase()}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.kind === 'break' && l.mpa != null
                ? <><strong>{Number(l.mpa).toFixed(1)} MPa</strong> <span className="mono dim" style={{ fontSize: 10 }}>· {l.mode || '—'}</span> {l.note ? ` — ${l.note}` : ''}</>
                : (l.note || '—')}
            </span>
            <span className="mono dim" style={{ fontSize: 9.5, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {stamp}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashboard rail (right column) ─────────────────────────────
function DashboardRail({ batch, pred, onClone, onBench, onIpVault, onPreset }) {
  return (
    <div className="rail">
      <div className="rail__sec">
        <div className="rail__hd">PHASE COMPASS</div>
        {window.PhaseCompass
          ? <window.PhaseCompass batch={batch} pred={pred} />
          : <div className="mono dim" style={{ padding: 14, fontSize: 11 }}>compass —</div>}
      </div>

      <div className="rail__sec">
        <div className="rail__hd">PERFORMANCE RADAR</div>
        {window.PerformanceRadar
          ? <window.PerformanceRadar pred={pred} batch={batch} />
          : <div className="mono dim" style={{ padding: 14, fontSize: 11 }}>radar —</div>}
      </div>

      <div className="rail__sec">
        <div className="rail__hd">ACTIONS</div>
        <div style={{ display: 'grid', gap: 6, padding: '8px 12px 12px' }}>
          <button className="btn btn--fuse" onClick={onClone}>＋ CLONE & MUTATE</button>
          <button className="btn" onClick={onBench}>＋ BENCH ENTRY</button>
          <button className="btn btn--ghost" onClick={onIpVault}>↑ IP VAULT EXPORT</button>
        </div>
      </div>

      <div className="rail__sec">
        <div className="rail__hd">BATCH STATE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '8px 12px 12px' }}>
          {[
            { k: 'fresh', label: 'FRESH' },
            { k: 'midpour', label: 'MID-POUR' },
            { k: 'cured', label: 'CURED' },
            { k: 'failed', label: 'FAILED' },
          ].map((p) => (
            <button key={p.k} className="btn btn--ghost"
              onClick={() => onPreset(p.k)}
              style={{ fontSize: 10, padding: '6px 4px' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rail__sec">
        <div className="rail__hd">BENCH LOG · RECENT</div>
        <div style={{ padding: '4px 12px 12px' }}>
          <BenchFeed logs={batch.benchLogs} />
        </div>
      </div>
    </div>
  );
}

// Expose
Object.assign(window, {
  Slider, Stamp, KV, Cell, Card,
  PourPipeline, BatchListItem, TopNav,
  Inventory, Warning, Tag,
  BenchFeed, DashboardRail,
  STATUS_LABEL,
});
