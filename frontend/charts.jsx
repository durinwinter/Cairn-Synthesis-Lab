// charts.jsx — All data-viz primitives for Cairn Synthesis Lab.
// SVG-based, theme-aware. Each chart is a small focused component.
// Exposed on window at the bottom for cross-script consumption.

const { useMemo, useState, useEffect, useRef } = React;

// ─── Color helpers ───────────────────────────────────────────────
const C = {
  ink:    '#0e1014',
  paper:  '#f1ebdb',
  bone:   '#e8e1d0',
  rule:   'rgba(20,18,12,0.18)',
  rule1:  'rgba(20,18,12,0.10)',
  flint:  '#4d6273',
  fuse:   '#c4753a',
  fuseHot:'#e29248',
  marrow: '#c9a878',
  retarder:'#5d7d70',
  good:   '#5c7a4f',
  alert:  '#a8362c',
  cool:   '#2c5f7c',
  basalt: '#25282c',
  basaltDeep: '#16181b',
  bone2:  '#b8b1a0',
  bone3:  '#807a6e',
  concrete:'#bdb5a4',
};

// Linear gradient between two hexes
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ────────────────────────────────────────────────────────────────
// Phase Compass — novel: a triangular balance indicator showing where
// the current batch sits across (Strength · Insulation · Bond).
// Each corner pulls toward its dominant property; the pin is the
// resultant. Acts as a "compass" the user steers with their sliders.
// ────────────────────────────────────────────────────────────────
function PhaseCompass({ metrics, target }) {
  const W = 280, H = 230;
  const cx = W / 2, cy = H / 2 + 12;
  const R = 92;
  const corners = [
    { label: 'STRUCTURE', sub: 'Flint',   color: C.flint,    angle: -Math.PI / 2,         pull: metrics.strength },
    { label: 'INSULATION',sub: 'Marrow',  color: C.marrow,   angle: -Math.PI / 2 + 2.094, pull: metrics.insulation },
    { label: 'BOND',      sub: 'Fuse',    color: C.fuse,     angle: -Math.PI / 2 + 4.188, pull: metrics.bond },
  ];
  const pts = corners.map((c) => ({
    x: cx + Math.cos(c.angle) * R,
    y: cy + Math.sin(c.angle) * R,
  }));
  // Resultant — weight corners by pull
  const total = corners.reduce((s, c) => s + c.pull, 0) || 1;
  const rx = pts.reduce((s, p, i) => s + p.x * corners[i].pull, 0) / total;
  const ry = pts.reduce((s, p, i) => s + p.y * corners[i].pull, 0) / total;

  // Target marker (small ghost)
  let tgt = null;
  if (target) {
    const tot = target.strength + target.insulation + target.bond || 1;
    tgt = {
      x: pts.reduce((s, p, i) => s + p.x * [target.strength, target.insulation, target.bond][i], 0) / tot,
      y: pts.reduce((s, p, i) => s + p.y * [target.strength, target.insulation, target.bond][i], 0) / tot,
    };
  }

  // Concentric rings
  const ringT = [0.33, 0.66, 1.0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="cmp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e29248" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#e29248" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* concentric triangles */}
      {ringT.map((t, i) => {
        const ring = pts.map((p) => [cx + (p.x - cx) * t, cy + (p.y - cy) * t]);
        return (
          <polygon key={i} points={ring.map((p) => p.join(',')).join(' ')}
                   fill="none" stroke="rgba(232,225,208,0.10)"
                   strokeWidth="0.5" strokeDasharray={i < 2 ? '2 3' : '0'} />
        );
      })}
      {/* spokes */}
      {pts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
              stroke="rgba(232,225,208,0.10)" strokeWidth="0.5" />
      ))}
      {/* outer triangle */}
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
               fill="none" stroke="rgba(232,225,208,0.30)" strokeWidth="1" />
      {/* glow under pin */}
      <circle cx={rx} cy={ry} r="36" fill="url(#cmp-glow)" />
      {/* corner ticks + labels */}
      {corners.map((c, i) => {
        const p = pts[i];
        const ox = Math.cos(c.angle) * 18, oy = Math.sin(c.angle) * 18;
        const tx = p.x + ox, ty = p.y + oy;
        const align = i === 0 ? 'middle' : (p.x < cx ? 'end' : 'start');
        return (
          <g key={i}>
            <rect x={p.x - 5} y={p.y - 5} width="10" height="10"
                  fill={c.color} stroke="#16181b" strokeWidth="1" />
            <text x={tx} y={ty} fill="#e8e1d0" fontSize="9"
                  fontFamily="IBM Plex Mono" letterSpacing="0.14em"
                  textAnchor={align} dy={i === 0 ? '-2' : '4'}>
              {c.label}
            </text>
            <text x={tx} y={ty + 11} fill="#807a6e" fontSize="8"
                  fontFamily="IBM Plex Mono" letterSpacing="0.08em"
                  textAnchor={align} dy={i === 0 ? '-2' : '4'}>
              {c.sub.toUpperCase()}
            </text>
          </g>
        );
      })}
      {/* target ghost */}
      {tgt && (
        <g>
          <circle cx={tgt.x} cy={tgt.y} r="8" fill="none"
                  stroke="rgba(232,225,208,0.4)" strokeWidth="1" strokeDasharray="2 2" />
          <line x1={tgt.x - 4} y1={tgt.y} x2={tgt.x + 4} y2={tgt.y}
                stroke="rgba(232,225,208,0.4)" strokeWidth="0.5" />
          <line x1={tgt.x} y1={tgt.y - 4} x2={tgt.x} y2={tgt.y + 4}
                stroke="rgba(232,225,208,0.4)" strokeWidth="0.5" />
        </g>
      )}
      {/* pin */}
      <g>
        <circle cx={rx} cy={ry} r="9" fill="#e29248" stroke="#16181b" strokeWidth="1.5" />
        <circle cx={rx} cy={ry} r="3" fill="#16181b" />
        {/* crosshairs */}
        <line x1={rx - 14} y1={ry} x2={rx - 11} y2={ry} stroke="#e29248" strokeWidth="1" />
        <line x1={rx + 11} y1={ry} x2={rx + 14} y2={ry} stroke="#e29248" strokeWidth="1" />
        <line x1={rx} y1={ry - 14} x2={rx} y2={ry - 11} stroke="#e29248" strokeWidth="1" />
        <line x1={rx} y1={ry + 11} x2={rx} y2={ry + 14} stroke="#e29248" strokeWidth="1" />
      </g>
      {/* axis ticks on rings (compass marks) */}
      <text x={cx} y={H - 8} fill="#807a6e" fontSize="8"
            fontFamily="IBM Plex Mono" textAnchor="middle" letterSpacing="0.20em">
        PHASE COMPASS  ·  N {(metrics.strength * 100).toFixed(0)}  E {(metrics.insulation * 100).toFixed(0)}  W {(metrics.bond * 100).toFixed(0)}
      </text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Performance Radar — 6-axis spider
// ────────────────────────────────────────────────────────────────
function PerformanceRadar({ metrics }) {
  const W = 300, H = 260;
  const cx = W / 2, cy = H / 2 - 4;
  const R = 86;
  const axes = [
    { k: 'strength',    label: 'STRENGTH' },
    { k: 'stiffness',   label: 'STIFFNESS' },
    { k: 'toughness',   label: 'TOUGHNESS' },
    { k: 'bond',        label: 'BOND' },
    { k: 'insulation',  label: 'INSULATION' },
    { k: 'workability', label: 'WORK WINDOW' },
    { k: 'cost',        label: 'COST €' },
  ];
  const n = axes.length;
  const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];

  const polyPts = axes.map((a, i) => pt(i, (metrics[a.k] || 0) * R).join(','));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* rings */}
      {[0.25, 0.5, 0.75, 1.0].map((t, i) => (
        <polygon key={i}
                 points={axes.map((_, ii) => pt(ii, R * t).join(',')).join(' ')}
                 fill="none" stroke={C.rule1} strokeWidth="0.5" />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.rule1} strokeWidth="0.5" />;
      })}
      {/* fill */}
      <polygon points={polyPts.join(' ')} fill="rgba(196,117,58,0.20)"
               stroke={C.fuse} strokeWidth="1.5" />
      {/* vertex dots */}
      {axes.map((a, i) => {
        const [x, y] = pt(i, (metrics[a.k] || 0) * R);
        return <rect key={i} x={x - 2.5} y={y - 2.5} width="5" height="5" fill={C.fuse} />;
      })}
      {/* axis labels */}
      {axes.map((a, i) => {
        const [x, y] = pt(i, R + 12);
        const ax = i === 0 ? 'middle' : (x < cx - 4 ? 'end' : (x > cx + 4 ? 'start' : 'middle'));
        const val = ((metrics[a.k] || 0) * 100).toFixed(0);
        return (
          <g key={i}>
            <text x={x} y={y} fill={C.ink} fontSize="9"
                  fontFamily="IBM Plex Mono" fontWeight="600"
                  letterSpacing="0.12em" textAnchor={ax} dy={y < cy ? '-2' : '6'}>
              {a.label}
            </text>
            <text x={x} y={y} fill={C.ink} fontSize="11"
                  fontFamily="IBM Plex Mono" fontWeight="700"
                  textAnchor={ax} dy={y < cy ? '8' : '17'}>
              {val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Ternary Plot — MgO / KH2PO4 / H2O
// Each batch is a point on the triangle.
// ────────────────────────────────────────────────────────────────
function TernaryPlot({ batches, activeId }) {
  const W = 340, H = 300;
  const cx = W / 2, cy = H / 2 + 6;
  const R = 110;
  // Corners
  const A = [cx, cy - R];                          // MgO (top)
  const B = [cx - R * 0.866, cy + R * 0.5];        // KH2PO4 (bottom-left)
  const C2 = [cx + R * 0.866, cy + R * 0.5];       // H2O (bottom-right)

  const toXY = ({ mgo, kp, h2o }) => {
    const s = mgo + kp + h2o || 1;
    const a = mgo / s, b = kp / s, c = h2o / s;
    return [a * A[0] + b * B[0] + c * C2[0], a * A[1] + b * B[1] + c * C2[1]];
  };

  // Derive ternary coords from each batch's Flint phase
  const points = batches.map((b) => {
    const r = b.phases.flint.MgPO4;
    // Convert Mg/PO4 molar ratio to MgO/KH2PO4 mass-ish split, plus W/B → H2O
    const mgo = clampN(r / (r + 1), 0.4, 0.85);
    const kp = 1 - mgo;
    const h2o = b.phases.flint.WB * 1.3;
    return {
      id: b.id, status: b.status,
      pt: toXY({ mgo: mgo * (1 - h2o * 0.5), kp: kp * (1 - h2o * 0.5), h2o }),
    };
  });

  // Phase stability regions (rough painted zones)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0,6 L6,0" stroke="rgba(168,54,44,0.3)" strokeWidth="0.6" />
        </pattern>
      </defs>
      {/* flash-set zone */}
      <polygon
        points={`${A[0]},${A[1]} ${(A[0]+cx)/2},${(A[1]+cy)/2} ${(cx+A[0])/2 - 30},${cy - 20}`}
        fill="url(#hatch)" opacity="0.6" />
      {/* triangle */}
      <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C2[0]},${C2[1]}`}
               fill="rgba(232,225,208,0.04)" stroke="rgba(232,225,208,0.4)" strokeWidth="1" />
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const pa = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
        const pb = [A[0] + (C2[0] - A[0]) * t, A[1] + (C2[1] - A[1]) * t];
        const pc = [B[0] + (C2[0] - B[0]) * t, B[1] + (C2[1] - B[1]) * t];
        const pd = [B[0] + (A[0] - B[0]) * t, B[1] + (A[1] - B[1]) * t];
        return (
          <g key={i} stroke="rgba(232,225,208,0.10)" strokeWidth="0.5">
            <line x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} />
            <line x1={pc[0]} y1={pc[1]} x2={pd[0]} y2={pd[1]} />
          </g>
        );
      })}
      {/* phase stability sweet-spot (small painted circle near center-top) */}
      <circle cx={cx + 2} cy={cy - 18} r="18" fill="rgba(92,122,79,0.18)"
              stroke="rgba(92,122,79,0.55)" strokeWidth="0.8" strokeDasharray="2 2" />
      <text x={cx + 22} y={cy - 14} fill={C.bone2} fontSize="8.5"
            fontFamily="IBM Plex Mono" letterSpacing="0.10em">
        STABLE
      </text>
      {/* corner labels */}
      <text x={A[0]} y={A[1] - 8} fill={C.bone} fontSize="11"
            fontFamily="IBM Plex Mono" fontWeight="700" textAnchor="middle"
            letterSpacing="0.10em">MgO</text>
      <text x={B[0] - 8} y={B[1] + 12} fill={C.bone} fontSize="11"
            fontFamily="IBM Plex Mono" fontWeight="700" textAnchor="end"
            letterSpacing="0.10em">KH₂PO₄</text>
      <text x={C2[0] + 8} y={C2[1] + 12} fill={C.bone} fontSize="11"
            fontFamily="IBM Plex Mono" fontWeight="700" textAnchor="start"
            letterSpacing="0.10em">H₂O</text>
      {/* points */}
      {points.map((p) => {
        const active = p.id === activeId;
        const color =
          p.status === 'locked'   ? C.good :
          p.status === 'bench'    ? C.fuse :
          p.status === 'failed'   ? C.alert : C.flint;
        return (
          <g key={p.id} transform={`translate(${p.pt[0]}, ${p.pt[1]})`}>
            {active && <circle r="10" fill="none" stroke={C.fuseHot} strokeWidth="1.2" />}
            <rect x={-4} y={-4} width="8" height="8" fill={color}
                  stroke={C.basaltDeep} strokeWidth="1" />
            {active && (
              <text x={8} y={-6} fill={C.bone} fontSize="9.5"
                    fontFamily="IBM Plex Mono" fontWeight="700">
                {p.id}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
function clampN(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// ────────────────────────────────────────────────────────────────
// Exotherm Curve — cure heat over time, with multiple Borax overlays
// ────────────────────────────────────────────────────────────────
function ExothermCurve({ phase, env, overlays = [] }) {
  const W = 560, H = 280;
  const M = { l: 44, r: 16, t: 14, b: 36 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const tMax = 120; // minutes
  const yMax = 110; // °C

  const x = (t) => M.l + (t / tMax) * iw;
  const y = (v) => M.t + ih - (v / yMax) * ih;

  // Generate a curve for a given borax / Mg ratio
  function curve(borax, MgPO4, env) {
    const ratioOff = Math.abs(MgPO4 - 6.0);
    const peakT = 12 + 8 * borax + 3 * ratioOff;       // min of peak
    const peakV = 78 + 6 * ratioOff - 5.4 * borax + 0.4 * (env.tempC - 22);
    const ambient = env.tempC;
    const pts = [];
    for (let t = 0; t <= tMax; t += 2) {
      // Asymmetric bell: slow rise, fast spike, gradual decay
      const rise = Math.exp(-Math.pow((t - peakT) / (peakT * 0.55), 2) * 1.4);
      const decay = t > peakT ? Math.exp(-(t - peakT) / 80) : 1;
      const v = ambient + (peakV - ambient) * rise * decay;
      pts.push([t, v]);
    }
    return { pts, peakT, peakV };
  }

  const main = curve(phase.Borax, phase.MgPO4, env);
  const series = overlays.map((o) => ({
    label: o.label, color: o.color,
    ...curve(o.borax, phase.MgPO4, env),
  }));

  const pathOf = (pts) => 'M ' + pts.map(([t, v]) => `${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join(' L ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* axes */}
      <g stroke="rgba(232,225,208,0.18)" strokeWidth="0.5">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={M.l} y1={M.t + ih * t} x2={W - M.r} y2={M.t + ih * t} />
        ))}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t, i) => (
          <line key={i} x1={M.l + iw * t} y1={M.t} x2={M.l + iw * t} y2={M.t + ih} />
        ))}
      </g>
      {/* y-axis labels */}
      {[20, 40, 60, 80, 100].map((v) => (
        <text key={v} x={M.l - 6} y={y(v)} fill={C.bone3} fontSize="9"
              fontFamily="IBM Plex Mono" textAnchor="end" dy="3">
          {v}°
        </text>
      ))}
      {/* x-axis labels */}
      {[0, 20, 40, 60, 80, 100, 120].map((t) => (
        <text key={t} x={x(t)} y={H - M.b + 14} fill={C.bone3} fontSize="9"
              fontFamily="IBM Plex Mono" textAnchor="middle">
          {t}m
        </text>
      ))}
      {/* working-window band */}
      <rect x={x(0)} y={M.t} width={x(main.peakT * 0.8) - x(0)}
            height={ih} fill="rgba(92,125,112,0.10)" />
      <text x={x(main.peakT * 0.4)} y={M.t + 14} fill={C.retarder} fontSize="9"
            fontFamily="IBM Plex Mono" textAnchor="middle" letterSpacing="0.16em">
        ◀  WORKING WINDOW
      </text>
      {/* overlays */}
      {series.map((s, i) => (
        <g key={i}>
          <path d={pathOf(s.pts)} fill="none" stroke={s.color}
                strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
          <text x={x(s.peakT)} y={y(s.peakV) - 6} fill={s.color}
                fontSize="9" fontFamily="IBM Plex Mono">{s.label}</text>
        </g>
      ))}
      {/* main curve */}
      <path d={pathOf(main.pts)} fill="none" stroke={C.fuseHot}
            strokeWidth="2.2" />
      {/* peak marker */}
      <g>
        <line x1={x(main.peakT)} y1={y(main.peakV)} x2={x(main.peakT)} y2={M.t + ih}
              stroke={C.fuseHot} strokeWidth="0.6" strokeDasharray="2 2" />
        <circle cx={x(main.peakT)} cy={y(main.peakV)} r="4" fill={C.fuseHot}
                stroke={C.basaltDeep} strokeWidth="1.2" />
        <text x={x(main.peakT) + 8} y={y(main.peakV) - 4} fill={C.fuseHot}
              fontSize="10" fontFamily="IBM Plex Mono" fontWeight="700">
          PEAK  {main.peakV.toFixed(1)}°C
        </text>
        <text x={x(main.peakT) + 8} y={y(main.peakV) + 8} fill={C.bone2}
              fontSize="9" fontFamily="IBM Plex Mono">
          T+{main.peakT.toFixed(0)} min
        </text>
      </g>
      {/* axis titles */}
      <text x={M.l} y={M.t - 4} fill={C.bone3} fontSize="9"
            fontFamily="IBM Plex Mono" letterSpacing="0.14em">
        TEMPERATURE  / °C
      </text>
      <text x={W - M.r} y={H - 4} fill={C.bone3} fontSize="9"
            fontFamily="IBM Plex Mono" textAnchor="end" letterSpacing="0.14em">
        TIME FROM MIX  / min
      </text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Stress Concentration Heatmap on a 2D seam cross-section
// ────────────────────────────────────────────────────────────────
function StressHeatmap({ joint, fillet = 1, intensity = 1 }) {
  const W = 380, H = 220;
  // Draw a horizontal seam: Flint (top) / Fuse (mid) / Marrow (bot)
  // with the joint profile mid-line.
  const top = 30, bot = H - 30, midC = H / 2;
  const left = 20, right = W - 20;
  const seamH = 12; // base gap

  // Generate joint profile points along the X axis
  function profile() {
    const xs = [], ys = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = left + (right - left) * t;
      let y = 0;
      if (joint === 'dovetail') {
        // 3 dovetail teeth
        const seg = (t * 3) % 1;
        y = (seg < 0.2) ? (seg / 0.2) * 22 :
            (seg < 0.5) ? 22 :
            (seg < 0.7) ? 22 - ((seg - 0.5) / 0.2) * 44 :
            (seg < 0.9) ? -22 :
            -22 + ((seg - 0.9) / 0.1) * 22;
      } else if (joint === 'shiplap') {
        const seg = (t * 2) % 1;
        y = (seg < 0.45) ? 14 :
            (seg < 0.55) ? 14 - ((seg - 0.45) / 0.10) * 28 :
            -14;
      } else if (joint === 'shark') {
        const seg = (t * 7) % 1;
        y = (seg < 0.5) ? (seg / 0.5) * 16 - 8 : 24 - (seg / 0.5) * 16;
      } else {
        y = 0;
      }
      xs.push(x); ys.push(midC + y);
    }
    return { xs, ys };
  }

  const { xs, ys } = profile();
  const upper = `M ${left} ${top} L ${xs.map((x, i) => `${x.toFixed(1)} ${(ys[i] - seamH/2).toFixed(1)}`).join(' L ')} L ${right} ${top} Z`;
  const lower = `M ${left} ${bot} L ${xs.map((x, i) => `${x.toFixed(1)} ${(ys[i] + seamH/2).toFixed(1)}`).join(' L ')} L ${right} ${bot} Z`;
  const fusePath = `M ${left} ${top} L ${xs.map((x, i) => `${x.toFixed(1)} ${(ys[i] - seamH/2).toFixed(1)}`).join(' L ')} L ${right} ${top} L ${right} ${bot} L ${xs.slice().reverse().map((x, i) => `${x.toFixed(1)} ${(ys[ys.length - 1 - i] + seamH/2).toFixed(1)}`).join(' L ')} L ${left} ${bot} Z`;

  // Stress hot-spots at concave corners
  const hotspots = [];
  for (let i = 1; i < xs.length - 1; i++) {
    const prev = ys[i - 1], cur = ys[i], next = ys[i + 1];
    const curvature = (next - cur) - (cur - prev);
    if (Math.abs(curvature) > 6) {
      const heat = Math.min(1, Math.abs(curvature) / 25) * intensity / (fillet * 0.5 + 0.5);
      hotspots.push({ x: xs[i], y: cur, r: 14 + heat * 14, heat });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id="flint-tex" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#4d6273" />
          <circle cx="1" cy="1" r="0.6" fill="#3a4a58" />
          <circle cx="3" cy="3" r="0.4" fill="#5d7488" />
        </pattern>
        <pattern id="marrow-tex" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="#c9a878" />
          <circle cx="1.5" cy="1.5" r="0.8" fill="#b08e60" />
          <circle cx="4" cy="3" r="0.6" fill="#dec19a" />
        </pattern>
        <pattern id="fuse-tex" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#c4753a" />
          <rect x="0" y="0" width="1" height="1" fill="#a4602e" />
        </pattern>
        <radialGradient id="stress-glow">
          <stop offset="0%" stopColor="#a8362c" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#c98c2a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c98c2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Flint (top) */}
      <path d={upper} fill="url(#flint-tex)" stroke="#2a2e34" strokeWidth="0.5" />
      {/* Marrow (bottom) */}
      <path d={lower} fill="url(#marrow-tex)" stroke="#8a6b40" strokeWidth="0.5" />
      {/* Fuse (the gap) */}
      <path d={fusePath} fill="url(#fuse-tex)" stroke="#8a4d20" strokeWidth="0.5" />
      {/* stress hot-spots */}
      {hotspots.map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r={h.r} fill="url(#stress-glow)" />
          {h.heat > 0.5 && (
            <circle cx={h.x} cy={h.y} r="3" fill="#a8362c" stroke="#fff" strokeWidth="0.6" />
          )}
        </g>
      ))}
      {/* labels */}
      <text x={left + 6} y={top + 14} fill="#e8e1d0" fontSize="9"
            fontFamily="IBM Plex Mono" fontWeight="700" letterSpacing="0.18em">
        FLINT
      </text>
      <text x={left + 6} y={bot - 6} fill="#3a2a14" fontSize="9"
            fontFamily="IBM Plex Mono" fontWeight="700" letterSpacing="0.18em">
        MARROW
      </text>
      <text x={right - 6} y={midC + 3} fill="#fff" fontSize="9"
            fontFamily="IBM Plex Mono" fontWeight="700" textAnchor="end" letterSpacing="0.18em">
        FUSE
      </text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Porosity Heatmap — Marrow density visualization
// ────────────────────────────────────────────────────────────────
function PorosityHeatmap({ h2o2, perlite }) {
  const W = 280, H = 200;
  const cols = 28, rows = 18;
  const cw = (W - 12) / cols, ch = (H - 12) / rows;
  // Deterministic-looking field driven by inputs
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
      const noise = (seed - Math.floor(seed));
      const porosity = clampN(0.18 + 0.10 * h2o2 + 0.0035 * perlite, 0.05, 0.85);
      const local = clampN(porosity + (noise - 0.5) * 0.5, 0, 1);
      cells.push({ r, c, local });
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} fill="#16181b" />
      {cells.map((cell, i) => {
        const x = 6 + cell.c * cw;
        const y = 6 + cell.r * ch;
        // Color: warm earth (dense) → bone (porous)
        const t = cell.local;
        const color = mix('#8a6b40', '#f1ebdb', t);
        // Add a bubble (circle) inside porous cells
        const bubble = t > 0.55;
        return (
          <g key={i}>
            <rect x={x} y={y} width={cw - 0.5} height={ch - 0.5} fill={color} />
            {bubble && (
              <circle cx={x + cw / 2} cy={y + ch / 2}
                      r={Math.min(cw, ch) * 0.30 * t}
                      fill="#16181b" opacity={0.5} />
            )}
          </g>
        );
      })}
      {/* legend */}
      <rect x="6" y={H - 14} width="80" height="8" fill="url(#por-grad)" />
      <defs>
        <linearGradient id="por-grad" x1="0" x2="1">
          <stop offset="0" stopColor="#8a6b40" />
          <stop offset="1" stopColor="#f1ebdb" />
        </linearGradient>
      </defs>
      <text x="6" y={H - 18} fill={C.bone3} fontSize="8" fontFamily="IBM Plex Mono"
            letterSpacing="0.16em">DENSE</text>
      <text x="86" y={H - 18} fill={C.bone3} fontSize="8" fontFamily="IBM Plex Mono"
            letterSpacing="0.16em">POROUS</text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Stress–strain curve — neat vs basalt-loaded
// ────────────────────────────────────────────────────────────────
function StressStrain({ pred, fiberPct }) {
  const W = 380, H = 220;
  const M = { l: 36, r: 12, t: 12, b: 28 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const xMax = 0.012; // strain
  const yMax = 120;   // MPa

  const x = (s) => M.l + (s / xMax) * iw;
  const y = (v) => M.t + ih - (v / yMax) * ih;

  // Neat curve: brittle. Loaded: tougher, more area under curve.
  function curveFor(fiber) {
    const peak = Math.min(yMax, 50 + 7 * fiber);
    const peakS = 0.0035 + fiber * 0.0006;
    const failS = peakS + 0.001 + fiber * 0.0015;
    const pts = [];
    for (let s = 0; s <= failS; s += 0.0002) {
      let v;
      if (s < peakS) v = (s / peakS) * peak;
      else v = peak * (1 - (s - peakS) / (failS - peakS));
      pts.push([s, Math.max(0, v)]);
    }
    return { pts, peak, peakS, failS };
  }

  const neat = curveFor(0);
  const loaded = curveFor(fiberPct);

  const pathOf = (pts) => 'M ' + pts.map(([s, v]) => `${x(s).toFixed(1)} ${y(v).toFixed(1)}`).join(' L ');
  const fillOf = (pts) => pathOf(pts) + ` L ${x(pts[pts.length - 1][0])} ${y(0)} L ${x(0)} ${y(0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* grid */}
      <g stroke="rgba(20,18,12,0.10)" strokeWidth="0.5">
        {[0, 30, 60, 90, 120].map((v) => (
          <line key={v} x1={M.l} y1={y(v)} x2={W - M.r} y2={y(v)} />
        ))}
      </g>
      {[0, 30, 60, 90, 120].map((v) => (
        <text key={v} x={M.l - 6} y={y(v)} fontSize="9" fontFamily="IBM Plex Mono"
              fill={C.ink} textAnchor="end" dy="3">{v}</text>
      ))}
      {[0, 0.003, 0.006, 0.009, 0.012].map((s) => (
        <text key={s} x={x(s)} y={H - M.b + 13} fontSize="9" fontFamily="IBM Plex Mono"
              fill={C.ink} textAnchor="middle">{(s * 1000).toFixed(1)}‰</text>
      ))}
      {/* fills */}
      <path d={fillOf(loaded.pts)} fill="rgba(196,117,58,0.15)" />
      <path d={fillOf(neat.pts)}   fill="rgba(77,98,115,0.10)" />
      {/* lines */}
      <path d={pathOf(neat.pts)} stroke={C.flint} strokeWidth="1.4"
            fill="none" strokeDasharray="3 3" />
      <path d={pathOf(loaded.pts)} stroke={C.fuse} strokeWidth="2" fill="none" />
      {/* peak markers */}
      <circle cx={x(loaded.peakS)} cy={y(loaded.peak)} r="3" fill={C.fuse} />
      <circle cx={x(neat.peakS)}   cy={y(neat.peak)}   r="3" fill={C.flint} />
      {/* axis titles */}
      <text x={M.l} y={M.t - 2} fontSize="9" fontFamily="IBM Plex Mono"
            fill={C.ink} letterSpacing="0.14em">σ / MPa</text>
      <text x={W - M.r} y={H - 4} fontSize="9" fontFamily="IBM Plex Mono"
            fill={C.ink} textAnchor="end" letterSpacing="0.14em">ε (strain)</text>
      {/* legend */}
      <g transform={`translate(${M.l + 12} ${M.t + 8})`}>
        <rect width="10" height="2" y="4" fill={C.flint} />
        <text x="14" y="8" fontSize="9" fontFamily="IBM Plex Mono" fill={C.ink}>
          NEAT MKP
        </text>
        <rect width="10" height="2" y="18" fill={C.fuse} />
        <text x="14" y="22" fontSize="9" fontFamily="IBM Plex Mono" fill={C.ink}>
          + {fiberPct.toFixed(1)}% BASALT
        </text>
      </g>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Waterfall chart — cost contribution
// ────────────────────────────────────────────────────────────────
function Waterfall({ items, total, unit = '$/m³' }) {
  const W = 380, H = 220;
  const M = { l: 14, r: 14, t: 18, b: 50 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const max = Math.max(total, items.reduce((s, i) => s + Math.abs(i.value), 0)) * 1.05;
  const bw = iw / (items.length + 1) - 6;

  let running = 0;
  const bars = items.map((it, i) => {
    const startY = M.t + ih - (running / max) * ih;
    running += it.value;
    const endY = M.t + ih - (running / max) * ih;
    return {
      x: M.l + i * (bw + 6), top: Math.min(startY, endY),
      h: Math.abs(endY - startY),
      color: it.color, label: it.label, value: it.value,
      sign: it.value >= 0,
    };
  });
  const totalBar = {
    x: M.l + items.length * (bw + 6),
    top: M.t + ih - (total / max) * ih,
    h: (total / max) * ih,
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line x1={M.l} y1={M.t + ih} x2={W - M.r} y2={M.t + ih}
            stroke={C.rule} strokeWidth="1" />
      {bars.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.top} width={bw} height={b.h} fill={b.color}
                stroke={C.ink} strokeWidth="0.5" />
          {/* connector line */}
          {i < bars.length - 1 && (
            <line x1={b.x + bw} y1={i === bars.length - 1 ? b.top : b.top + (b.sign ? 0 : b.h)}
                  x2={bars[i + 1].x} y2={i === bars.length - 1 ? b.top : b.top + (b.sign ? 0 : b.h)}
                  stroke={C.rule} strokeWidth="0.5" strokeDasharray="2 2" />
          )}
          <text x={b.x + bw / 2} y={b.top - 4} fontSize="10"
                fontFamily="IBM Plex Mono" fontWeight="700"
                textAnchor="middle" fill={C.ink}>
            {b.value.toFixed(0)}
          </text>
          <text x={b.x + bw / 2} y={M.t + ih + 14} fontSize="8.5"
                fontFamily="IBM Plex Mono" textAnchor="middle"
                fill={C.ink} letterSpacing="0.10em">
            {b.label.toUpperCase()}
          </text>
        </g>
      ))}
      {/* total */}
      <rect x={totalBar.x} y={totalBar.top} width={bw} height={totalBar.h}
            fill={C.ink} stroke={C.ink} strokeWidth="0.5" />
      <text x={totalBar.x + bw / 2} y={totalBar.top - 4} fontSize="10"
            fontFamily="IBM Plex Mono" fontWeight="700"
            textAnchor="middle" fill={C.ink}>
        {total.toFixed(0)}
      </text>
      <text x={totalBar.x + bw / 2} y={M.t + ih + 14} fontSize="8.5"
            fontFamily="IBM Plex Mono" textAnchor="middle"
            fill={C.ink} fontWeight="700" letterSpacing="0.10em">
        TOTAL
      </text>
      <text x={totalBar.x + bw / 2} y={M.t + ih + 28} fontSize="8" fontFamily="IBM Plex Mono"
            fill={C.ink} textAnchor="middle" letterSpacing="0.16em">
        {unit}
      </text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Joint SVG — small icons used in the joint picker
// ────────────────────────────────────────────────────────────────
function JointIcon({ kind, w = 100, h = 64 }) {
  const top = 12, bot = h - 12, mid = h / 2;
  let path;
  if (kind === 'butt') {
    path = `M0 ${top} L${w} ${top} M0 ${bot} L${w} ${bot}`;
  } else if (kind === 'dovetail') {
    path = `M0 ${top} L${w} ${top}
            M0 ${bot} L${w} ${bot}
            M0 ${mid} L${w * 0.18} ${mid - 12} L${w * 0.38} ${mid - 12} L${w * 0.5} ${mid + 12}
              L${w * 0.62} ${mid + 12} L${w * 0.82} ${mid - 12} L${w} ${mid - 12}`;
  } else if (kind === 'shiplap') {
    path = `M0 ${top} L${w} ${top}
            M0 ${bot} L${w} ${bot}
            M0 ${mid - 8} L${w * 0.5} ${mid - 8} L${w * 0.5} ${mid + 8} L${w} ${mid + 8}`;
  } else if (kind === 'shark') {
    const teeth = 6;
    const tw = w / teeth;
    let p = `M0 ${mid} `;
    for (let i = 0; i < teeth; i++) {
      p += `L${i * tw + tw * 0.5} ${mid - 9} L${(i + 1) * tw} ${mid} `;
    }
    path = `M0 ${top} L${w} ${top}
            M0 ${bot} L${w} ${bot}
            ${p}`;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }}>
      <rect x="0" y={top} width={w} height={mid - top} fill="#4d6273" opacity="0.85" />
      <rect x="0" y={mid} width={w} height={bot - mid} fill="#c9a878" opacity="0.85" />
      <path d={path} fill="none" stroke="#16181b" strokeWidth="1.4" />
      {/* fuse line */}
      <path d={path} fill="none" stroke="#c4753a" strokeWidth="0.8" strokeDasharray="2 2" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Sparkline — small inline curve for cells
// ────────────────────────────────────────────────────────────────
function Sparkline({ data, w = 60, h = 18, color = C.flint, fill = false }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / rng) * (h - 2) - 1,
  ]);
  const d = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {fill && <path d={d + ` L ${w} ${h} L 0 ${h} Z`} fill={color} opacity="0.2" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────
// Mini ring gauge — for status displays
// ────────────────────────────────────────────────────────────────
function RingGauge({ value, label, color = C.fuse, size = 60 }) {
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.rule} strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={circ} strokeDashoffset={off}
              transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
      <text x={cx} y={cy} fontSize="11" fontFamily="IBM Plex Mono" fontWeight="700"
            textAnchor="middle" dy="4" fill={C.ink}>{Math.round(value * 100)}</text>
    </svg>
  );
}

// Expose to global scope
Object.assign(window, {
  PhaseCompass, PerformanceRadar, TernaryPlot,
  ExothermCurve, StressHeatmap, PorosityHeatmap,
  StressStrain, Waterfall, JointIcon, Sparkline, RingGauge,
  ChartColors: C,
});
