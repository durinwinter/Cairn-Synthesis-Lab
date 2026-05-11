/* ─────────────────────────────────────────────────────────────────
   Cairn Synthesis Lab — state layer
   Plain JS, exposed on window.CSL. No imports.
   Owns: schema, calc formulas, presets, batch persistence (localStorage),
   and a tiny pub/sub so JSX components can subscribe.
───────────────────────────────────────────────────────────────── */

(function (root) {
  'use strict';

  const STORAGE_KEY = 'csl.v1.state';

  // ── Helpers ─────────────────────────────────────────────────────
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  const uid = () => 'b' + Math.random().toString(36).slice(2, 8);

  // ── Cost coefficients ($/kg) ────────────────────────────────────
  const COSTS = {
    MgO: 0.80, KH2PO4: 1.40, Borax: 0.90, BasaltFiber: 4.50,
    NanoHAp: 40.00, Perlite: 0.30, H2O2: 2.00, Retarder: 3.50,
    Surfactant: 6.00, Seeds: 8.00,
  };

  // ── Joint profiles ──────────────────────────────────────────────
  const JOINTS = {
    butt: {
      name: 'Butt', thermal: 1.00, shearK: 1.00, surfaceK: 1.00, stressK: 0.40,
      desc: 'Flat contact. Baseline.'
    },
    dovetail: {
      name: 'Dovetail', thermal: 1.42, shearK: 2.20, surfaceK: 1.65, stressK: 1.30,
      desc: 'Mechanical interlock. Resists peel.'
    },
    shiplap: {
      name: 'Ship-lap', thermal: 1.78, shearK: 1.50, surfaceK: 1.40, stressK: 0.60,
      desc: 'Z-joint. Tortuous thermal path.'
    },
    shark: {
      name: 'Shark Tooth', thermal: 2.35, shearK: 2.70, surfaceK: 2.50, stressK: 1.50,
      desc: 'Serrated. Max bite into Marrow pith.'
    },
  };

  // ── Default phase recipes ───────────────────────────────────────
  // Each phase has a slot for every parameter the UI exposes, even if
  // it's zero for that phase — keeps the schema flat for the matrix view.
  const PHASE_BASE = () => ({
    flint_s: {
      MgPO4: 6.20,          // molar ratio
      Borax: 4.20,          // wt%
      BasaltFiber: 3.00,    // vol%
      NanoHAp: 0.80,        // wt%
      WB: 0.22,             // water / binder
      H2O2: 0, Perlite: 0, Retarder: 0, Thixo: 0, Seeds: 0, Surfactant: 0,
    },
    flint_e: {
      MgPO4: 6.40,
      Borax: 4.80,
      BasaltFiber: 1.50,    // Less fiber for smoother finish
      NanoHAp: 2.40,        // More HAp for surface hardness and densification
      WB: 0.18,             // Denser mix
      H2O2: 0, Perlite: 0, Retarder: 0, Thixo: 0, Seeds: 0, Surfactant: 0,
    },
    fuse: {
      MgPO4: 6.80,
      Borax: 5.40,
      Retarder: 1.50,       // wt% (beyond borax — citric / boric)
      Thixo: 62,            // 0-100 thixotropy index
      Seeds: 0.6,           // wt% pre-reacted seeds
      WB: 0.20,
      BasaltFiber: 0, NanoHAp: 0, H2O2: 0, Perlite: 0, Surfactant: 0,
    },
    marrow: {
      MgPO4: 5.80,
      Borax: 1.80,
      H2O2: 1.80,           // wt% — foaming agent
      Perlite: 38,          // vol%
      Surfactant: 0.4,
      WB: 0.28,
      BasaltFiber: 0, NanoHAp: 0, Retarder: 0, Thixo: 0, Seeds: 0,
    },
  });

  const SEAM_BASE = () => ({
    type: 'dovetail',
    clearance: 5,            // mm
    roughness: 60,           // 0-100 (smooth→sandblast→etch)
    bondLength: 42,          // mm
    fillet: 1.2,             // mm (corner rounding)
  });

  const ENV_BASE = () => ({ tempC: 22, humidity: 55 });

  const OBJECTIVE_BASE = () => ({
    compMin: 68,
    flexMin: 8,
    bondMin: 4.5,
    rMin: 2.2,
    workMin: 28,
    cureMax: 86,
    costMax: 1350,
    densityMax: 2.45,
  });

  const MODEL_INFO = {
    id: 'cairn-heuristic-v0.5',
    basis: 'Rule-based MKP composite model with local active-learning scoring',
    updatedAt: '2026-05-10',
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function ensureBatchShape(batch) {
    const b = batch || {};
    b.phases = {
      ...PHASE_BASE(),
      ...(b.phases || {}),
      flint_s: { ...PHASE_BASE().flint_s, ...((b.phases && b.phases.flint_s) || {}) },
      flint_e: { ...PHASE_BASE().flint_e, ...((b.phases && b.phases.flint_e) || {}) },
      fuse: { ...PHASE_BASE().fuse, ...((b.phases && b.phases.fuse) || {}) },
      marrow: { ...PHASE_BASE().marrow, ...((b.phases && b.phases.marrow) || {}) },
    };
    b.seam = { ...SEAM_BASE(), ...(b.seam || {}) };
    b.env = { ...ENV_BASE(), ...(b.env || {}) };
    b.objectives = { ...OBJECTIVE_BASE(), ...(b.objectives || {}) };
    b.measurements = b.measurements || [];
    b.benchLogs = b.benchLogs || [];
    b.tags = b.tags || [];
    b.lineage = b.lineage || { parentId: null, method: 'seed' };
    b.model = b.model || MODEL_INFO;
    b.notes = b.notes || '';
    return b;
  }

  // ── Predictions ────────────────────────────────────────────────
  // These are PLAUSIBLE not paper-accurate — but they couple in ways
  // that make the sliders feel alive (every move shifts the radar).
  function predictFlint(p, env) {
    const fiber = p.BasaltFiber;
    const ratioOff = Math.abs(p.MgPO4 - 6.0);
    const flash = ratioOff > 1.8;
    // Compressive strength — peaks near Mg/PO4 = 6, boosted by fiber + HAp
    const comp = 52 + 7.2 * fiber + 4.0 * p.NanoHAp - 6.5 * ratioOff - 18 * (p.WB - 0.22);
    const flex = 7.5 + 1.4 * fiber + 1.8 * p.NanoHAp - 1.2 * ratioOff;
    const E = 13.5 + 1.10 * fiber + 0.45 * p.NanoHAp;
    const density = 2.10 + 0.04 * fiber + 0.025 * p.NanoHAp - 0.6 * (p.WB - 0.22);
    const therm = 1.10 + 0.06 * fiber;
    // Cure peak (°C): low borax + high ambient + tight Mg ratio → hot
    const cure = 68 + 8 * ratioOff - 5.2 * p.Borax + 0.4 * (env.tempC - 22);
    return {
      comp: clamp(round(comp, 1), 10, 140),
      flex: clamp(round(flex, 1), 1, 30),
      E: clamp(round(E, 1), 4, 35),
      density: clamp(round(density, 2), 1.3, 2.6),
      therm: round(therm, 2),
      curePeak: clamp(round(cure, 1), 25, 130),
      flash,
      workMin: clamp(round(8 + 6.5 * p.Borax - 0.4 * (env.tempC - 22), 0), 1, 90),
    };
  }

  function predictFuse(p, env) {
    const ratioOff = Math.abs(p.MgPO4 - 6.4);
    const bond = 4.2 + 2.8 * p.Seeds - 0.35 * p.Retarder - 0.6 * ratioOff
      + 0.012 * (p.Thixo - 50);
    const tensile = 1.4 + 1.1 * p.Seeds - 0.18 * p.Retarder;
    const work = 14 + 7.5 * p.Borax + 5.0 * p.Retarder - 0.6 * (env.tempC - 22);
    const cure = 62 + 6 * ratioOff - 5 * p.Borax - 3.4 * p.Retarder
      + 0.4 * (env.tempC - 22);
    const visc = 1.2 + 0.05 * p.Thixo; // Pa·s
    return {
      bond: clamp(round(bond, 2), 0.2, 14),
      tensile: clamp(round(tensile, 2), 0.1, 6),
      workMin: clamp(round(work, 0), 2, 180),
      curePeak: clamp(round(cure, 1), 25, 110),
      viscosity: round(visc, 1),
    };
  }

  function predictMarrow(p, env) {
    const porosity = clamp(0.18 + 0.10 * p.H2O2 + 0.0035 * p.Perlite, 0.05, 0.85);
    const density = clamp(1900 - 320 * p.H2O2 - 14 * p.Perlite, 200, 2200);
    const R = clamp(0.55 + 0.42 * p.H2O2 + 0.012 * p.Perlite, 0.5, 6.0); // m²·K/W per 100mm
    const therm = round(0.10 / R * 1.05 + 0.02, 3);                          // W/m·K (rough inverse)
    const comp = clamp(8 - 1.9 * p.H2O2 - 0.05 * p.Perlite, 0.2, 14);
    return {
      porosity: round(porosity, 3),
      density: round(density, 0),
      R: round(R, 2),
      therm: therm,
      comp: round(comp, 1),
    };
  }

  // ── Seam vitals (Module 4) ──────────────────────────────────────
  function predictSeam(seam, marrow, fuse) {
    const J = JOINTS[seam.type] || JOINTS.butt;
    const RaN = clamp(seam.roughness, 0, 100) / 100;          // 0..1
    const Lbn = clamp(seam.bondLength, 10, 100) / 40;         // baseline 40mm
    const Cn = clamp(seam.clearance, 1, 20) / 5;             // baseline 5mm
    const filletK = 1 - clamp(seam.fillet, 0, 5) / 7;         // larger fillet → lower stress

    // Thermal path ratio L_path / T_wall
    const thermalRatio = round(J.thermal * (1 + 0.04 * Cn), 2);
    const thermalBridge = thermalRatio < 1.30;

    // Mechanical shear capacity (kN/m) — scales with joint + roughness + length
    const shear = round(J.shearK * (4 + 6 * RaN) * (0.5 + 0.5 * Lbn) * (fuse.bond / 4.2), 2);

    // Stress concentration peak (factor of nominal) — corners on dovetail/shark
    const stress = round(J.stressK * filletK * (1.2 - 0.6 * RaN), 2);

    // Wicking risk score = surface area × marrow porosity
    const wickRaw = J.surfaceK * marrow.porosity * (0.6 + 0.8 * RaN);
    const wick = round(wickRaw, 2);
    const wickHigh = wick > 0.75;

    // Fuse volume (L/m): cross-section area × 1m
    const xs = (seam.clearance * (10 + 30 * J.surfaceK)) / 1000; // cm²
    const fuseVol = round(xs * 100 / 1000, 2); // L/m

    return {
      thermalRatio, thermalBridge,
      shear, stress,
      wick, wickHigh,
      fuseVol,
      joint: J,
    };
  }

  // ── Cost ($/m³) ─────────────────────────────────────────────────
  function costPhase(p) {
    // Convert each ingredient's wt%/vol% into a dollar-per-m³ contribution.
    // Base binder (~1800 kg/m³ for Flint/Fuse, less for Marrow).
    const baseMass = 1800;
    const c =
      baseMass * 0.55 * COSTS.MgO * 0.55 / 100 +
      baseMass * 0.45 * COSTS.KH2PO4 * 0.45 / 100 +
      baseMass * p.Borax / 100 * COSTS.Borax +
      baseMass * p.BasaltFiber / 100 * COSTS.BasaltFiber +
      baseMass * p.NanoHAp / 100 * COSTS.NanoHAp +
      baseMass * p.H2O2 / 100 * COSTS.H2O2 +
      baseMass * p.Perlite / 100 * COSTS.Perlite * 0.4 +
      baseMass * p.Retarder / 100 * COSTS.Retarder +
      baseMass * p.Seeds / 100 * COSTS.Seeds +
      baseMass * p.Surfactant / 100 * COSTS.Surfactant;
    return round(c, 0);
  }

  function predictAll(batch) {
    const flint_s = predictFlint(batch.phases.flint_s, batch.env);
    const flint_e = predictFlint(batch.phases.flint_e, batch.env);
    const fuse = predictFuse(batch.phases.fuse, batch.env);
    const marrow = predictMarrow(batch.phases.marrow, batch.env);
    const seam = predictSeam(batch.seam, marrow, fuse);
    const cost = {
      flint_s: costPhase(batch.phases.flint_s),
      flint_e: costPhase(batch.phases.flint_e),
      fuse: costPhase(batch.phases.fuse),
      marrow: costPhase(batch.phases.marrow),
    };
    cost.total = cost.flint_s + cost.flint_e + cost.fuse + cost.marrow;
    return { flint_s, flint_e, fuse, marrow, seam, cost };
  }

  function scoreBatch(batch, pred) {
    const o = batch.objectives || OBJECTIVE_BASE();
    const penalties = [
      clamp(pred.flint_s.comp / o.compMin, 0, 1.25),
      clamp(pred.flint_s.flex / o.flexMin, 0, 1.25),
      clamp(pred.fuse.bond / o.bondMin, 0, 1.25),
      clamp(pred.marrow.r_value ? pred.marrow.r_value / o.rMin : pred.marrow.R / o.rMin, 0, 1.25),
      clamp(pred.fuse.work_min ? pred.fuse.work_min / o.workMin : pred.fuse.workMin / o.workMin, 0, 1.25),
      clamp(o.cureMax / Math.max(pred.flint_s.cure_peak || pred.flint_s.curePeak, 1), 0, 1.25),
      clamp(o.costMax / Math.max(pred.cost.total, 1), 0, 1.25),
      clamp(o.densityMax / Math.max(pred.flint_s.density, 0.1), 0, 1.25),
    ];
    const mean = penalties.reduce((a, b) => a + b, 0) / penalties.length;
    const safety = (pred.flint_s.flash ? -0.18 : 0) + ((pred.seam.wickHigh || pred.seam.thermalBridge) ? -0.06 : 0);
    return clamp(round(mean + safety, 3), 0, 1.15);
  }

  function summarizePrediction(batch, pred) {
    return {
      score: scoreBatch(batch, pred),
      comp: pred.flint_s.comp,
      flex: pred.flint_s.flex,
      bond: pred.fuse.bond,
      rValue: pred.marrow.R,
      workMin: pred.fuse.workMin,
      curePeak: pred.flint_s.curePeak,
      cost: pred.cost.total,
    };
  }

  function featureVector(batch) {
    const f = batch.phases.flint_s;
    const u = batch.phases.fuse;
    const m = batch.phases.marrow;
    return {
      flintRatioOffset: round(Math.abs(f.MgPO4 - 6), 3),
      flintBinderWater: f.WB,
      reinforcement: f.BasaltFiber,
      densifier: f.NanoHAp,
      fuseRatioOffset: round(Math.abs(u.MgPO4 - 6.4), 3),
      totalRetarder: round(u.Borax + u.Retarder, 2),
      nucleation: u.Seeds,
      foamDrive: m.H2O2,
      voidFormer: m.Perlite,
      seamPath: JOINTS[batch.seam.type]?.thermal || 1,
    };
  }

  function measuredPerformance(batch) {
    const logs = batch.benchLogs || [];
    const breaks = logs.filter((l) => l.kind === 'break' && Number.isFinite(Number(l.mpa)));
    if (!breaks.length) return null;
    const avgBreak = breaks.reduce((sum, l) => sum + Number(l.mpa), 0) / breaks.length;
    return { avgBreak: round(avgBreak, 1), n: breaks.length };
  }

  function mutateBatch(src, index) {
    const b = ensureBatchShape(clone(src));
    const f = b.phases.flint_s;
    const fe = b.phases.flint_e;
    const u = b.phases.fuse;
    const m = b.phases.marrow;
    const variants = [
      () => { f.BasaltFiber += 0.7; f.WB -= 0.01; f.NanoHAp += 0.15; },
      () => { u.Seeds += 0.25; u.Retarder += 0.2; u.Thixo += 7; },
      () => { m.H2O2 += 0.35; m.Perlite += 6; f.BasaltFiber += 0.2; },
      () => { f.MgPO4 -= 0.25; f.Borax += 0.6; u.Borax += 0.4; },
      () => { f.BasaltFiber -= 0.9; f.NanoHAp -= 0.3; m.Perlite += 4; },
      () => { fe.NanoHAp += 0.3; fe.WB -= 0.005; fe.BasaltFiber += 0.2; },
      () => { b.seam.type = ['dovetail', 'shiplap', 'shark'][index % 3]; b.seam.bondLength += 10; b.seam.roughness += 12; },
    ];
    variants[index % variants.length]();
    f.MgPO4 = clamp(round(f.MgPO4, 2), 4.2, 7.8);
    f.Borax = clamp(round(f.Borax, 1), 0.5, 8);
    f.BasaltFiber = clamp(round(f.BasaltFiber, 1), 0, 6);
    f.NanoHAp = clamp(round(f.NanoHAp, 2), 0, 3);
    f.WB = clamp(round(f.WB, 3), 0.16, 0.32);
    fe.MgPO4 = clamp(round(fe.MgPO4, 2), 4.2, 7.8);
    fe.NanoHAp = clamp(round(fe.NanoHAp, 2), 0, 3);
    fe.WB = clamp(round(fe.WB, 3), 0.16, 0.28);
    u.Borax = clamp(round(u.Borax, 1), 0, 8);
    u.Retarder = clamp(round(u.Retarder, 2), 0, 3);
    u.Seeds = clamp(round(u.Seeds, 2), 0, 2);
    u.Thixo = clamp(round(u.Thixo, 0), 0, 100);
    m.H2O2 = clamp(round(m.H2O2, 2), 0.5, 4);
    m.Perlite = clamp(round(m.Perlite, 0), 10, 60);
    b.seam.bondLength = clamp(round(b.seam.bondLength, 0), 10, 100);
    b.seam.roughness = clamp(round(b.seam.roughness, 0), 0, 100);
    return b;
  }

  function suggestCandidates(sourceId, count = 6) {
    const source = ensureBatchShape(sourceId ? state.batches.find((b) => b.id === sourceId) : getActive());
    if (!source) return [];
    const candidates = [];
    for (let i = 0; i < count * 3; i++) {
      const b = mutateBatch(source, i);
      const pred = predictAll(b);
      candidates.push({
        tempId: `C-${String(i + 1).padStart(2, '0')}`,
        name: `${source.name.replace(/\s*\([^)]+\)/, '')} / DOE ${i + 1}`,
        sourceId: source.id,
        batch: b,
        pred,
        summary: summarizePrediction(b, pred),
        features: featureVector(b),
      });
    }
    return candidates
      .sort((a, b) => b.summary.score - a.summary.score)
      .slice(0, count);
  }

  function searchBatches(filters = {}) {
    const q = String(filters.q || '').toLowerCase().trim();
    const status = filters.status || 'all';
    return state.batches
      .map((batch) => {
        const b = ensureBatchShape(batch);
        const pred = predictAll(b);
        return { batch: b, pred, summary: summarizePrediction(b, pred), measured: measuredPerformance(b) };
      })
      .filter((row) => {
        if (status !== 'all' && row.batch.status !== status) return false;
        if (filters.minScore && row.summary.score < filters.minScore) return false;
        if (filters.maxCost && row.summary.cost > filters.maxCost) return false;
        if (!q) return true;
        return [row.batch.id, row.batch.name, row.batch.notes, ...(row.batch.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.summary.score - a.summary.score);
  }

  // ── Performance radar — 6 axes 0..1 ─────────────────────────────
  function radarMetrics(pred) {
    return {
      strength: clamp(pred.flint_s.comp / 100, 0, 1),
      stiffness: clamp(pred.flint_s.E / 25, 0, 1),
      toughness: clamp(pred.flint_s.flex / 20, 0, 1),
      insulation: clamp(pred.marrow.R / 5, 0, 1),
      bond: clamp(pred.fuse.bond / 10, 0, 1),
      workability: clamp(pred.fuse.workMin / 80, 0, 1),
      cost: clamp(1 - pred.cost.total / 6000, 0, 1),
    };
  }

  // ── Preset batches (Tweak-controlled batch state) ───────────────
  function makePreset(kind) {
    const id = uid();
    const now = Date.now();
    const base = {
      id, name: '', createdAt: now, status: 'research',
      phases: PHASE_BASE(), seam: SEAM_BASE(), env: ENV_BASE(),
      objectives: OBJECTIVE_BASE(),
      measurements: [],
      benchLogs: [], notes: '',
      tags: ['mkp', 'bioceramic'],
      lineage: { parentId: null, method: 'preset' },
      model: MODEL_INFO,
    };
    if (kind === 'fresh') {
      base.name = 'Fresh Pour';
      base.status = 'research';
      base.notes = 'Just-mixed sandbox iteration. Bench data pending.';
    } else if (kind === 'fresh') {
      base.name = 'Fresh Pour';
      base.status = 'research';
      base.notes = 'Just-mixed sandbox iteration. Bench data pending.';
    }
    return base;
  }

  // ── Seed corpus ─────────────────────────────────────────────────
  function seedBatches() {
    const out = [];
    const b = makePreset('fresh');
    b.id = 'B-001';
    b.name = 'Formulation 001';
    b.notes = 'Clean base pour mapped to 4-phase system.';
    out.push(b);
    return out;
  }

  // ── Inventory (raw materials, with stock + flag) ────────────────
  const INVENTORY = [
    { sku: 'MGO-DBM-92', name: 'MgO (dead-burned, 92%)', stock: 42.8, unit: 'kg', lot: 'L-2811', flag: null },
    { sku: 'KH2PO4-T', name: 'KH₂PO₄ (technical)', stock: 28.6, unit: 'kg', lot: 'L-3401', flag: null },
    { sku: 'BX-DH', name: 'Borax (decahydrate)', stock: 14.2, unit: 'kg', lot: 'L-1162', flag: 'low' },
    { sku: 'BF-12K', name: 'Basalt fiber (12mm)', stock: 6.4, unit: 'kg', lot: 'L-9921', flag: null },
    { sku: 'NHA-200', name: 'Nano-HAp (<200 nm)', stock: 0.84, unit: 'kg', lot: 'L-7740', flag: 'low' },
    { sku: 'PERL-F', name: 'Perlite (expanded, fine)', stock: 88.0, unit: 'L', lot: 'L-4408', flag: null },
    { sku: 'H2O2-35', name: 'H₂O₂ (35%)', stock: 5.2, unit: 'L', lot: 'L-6612', flag: null },
    { sku: 'SEED-MKP', name: 'Pre-reacted MKP seeds', stock: 2.1, unit: 'kg', lot: 'L-8001', flag: null },
  ];

  // ── Persistence ─────────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.batches) return null;
      return parsed;
    } catch (e) { return null; }
  }
  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
  }
  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
  }

  // ── Tiny pub/sub ────────────────────────────────────────────────
  const subs = new Set();
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  function emit() { subs.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } }); }

  // ── Store ───────────────────────────────────────────────────────
  function normalizeState(s) {
    const next = s || {};
    next.batches = (next.batches || seedBatches()).map(ensureBatchShape);
    next.activeId = next.activeId || (next.batches[0] && next.batches[0].id);
    next.activeModule = next.activeModule || 'dashboard';
    next.inventory = next.inventory || INVENTORY;
    next.objectives = { ...OBJECTIVE_BASE(), ...(next.objectives || {}) };
    next.model = next.model || MODEL_INFO;
    return next;
  }

  localStorage.removeItem('cairn'); // Clear old schema 
  let state = normalizeState(load() || {
    batches: seedBatches(),
    activeId: 'B-001',
    activeModule: 'dashboard',
    inventory: INVENTORY,
    objectives: OBJECTIVE_BASE(),
    model: MODEL_INFO,
  });

  function getState() { return state; }
  function getActive() { return state.batches.find((b) => b.id === state.activeId) || state.batches[0]; }
  function setActiveId(id) { state.activeId = id; save(state); emit(); }
  function setActiveModule(m) { state.activeModule = m; save(state); emit(); }

  function updateActive(patcher) {
    const i = state.batches.findIndex((b) => b.id === state.activeId);
    if (i < 0) return;
    state.batches[i] = ensureBatchShape(patcher({ ...state.batches[i] }) || state.batches[i]);
    save(state); emit();
  }
  function setPhaseVal(phase, key, val) {
    updateActive((b) => {
      b.phases = { ...b.phases, [phase]: { ...b.phases[phase], [key]: val } };
      return b;
    });
  }
  function setSeamVal(key, val) {
    updateActive((b) => { b.seam = { ...b.seam, [key]: val }; return b; });
  }
  function setEnvVal(key, val) {
    updateActive((b) => { b.env = { ...b.env, [key]: val }; return b; });
  }
  function setBatchField(key, val) {
    updateActive((b) => { b[key] = val; return b; });
  }
  function addBenchLog(entry) {
    updateActive((b) => {
      b.benchLogs = [{ ts: Date.now(), ...entry }, ...(b.benchLogs || [])];
      if (entry.kind === 'break' && Number.isFinite(Number(entry.mpa))) {
        b.measurements = [{
          id: 'M-' + Date.now().toString(36).toUpperCase(),
          type: 'compressive_break',
          value: Number(entry.mpa),
          unit: 'MPa',
          at: Date.now(),
          conditions: { ...b.env },
          note: entry.note || '',
        }, ...(b.measurements || [])];
      }
      return b;
    });
  }
  function addMeasurement(measurement) {
    updateActive((b) => {
      b.measurements = [{
        id: 'M-' + Date.now().toString(36).toUpperCase(),
        at: Date.now(),
        conditions: { ...b.env },
        ...measurement,
      }, ...(b.measurements || [])];
      return b;
    });
  }

  function nextBatchId() {
    const used = state.batches.map((b) => b.id).filter((id) => /^B-\d+$/.test(id));
    const max = used.reduce((m, id) => Math.max(m, parseInt(id.slice(2), 10)), 0);
    return 'B-' + String(max + 1).padStart(3, '0');
  }
  function cloneActive() {
    const src = getActive();
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = nextBatchId();
    copy.name = src.name.replace(/\([^)]+\)\s*$/, '').trim() + ' / Mutant';
    copy.status = 'research';
    copy.createdAt = Date.now();
    copy.benchLogs = [];
    copy.measurements = [];
    copy.notes = `Cloned from ${src.id}.`;
    copy.lineage = { parentId: src.id, method: 'clone' };
    copy.model = MODEL_INFO;
    state.batches = [copy, ...state.batches];
    state.activeId = copy.id;
    save(state); emit();
  }
  function applyPreset(kind) {
    // Mutate the active batch to match a preset state (Tweaks).
    const fresh = makePreset(kind);
    updateActive((b) => {
      b.phases = fresh.phases; b.seam = fresh.seam; b.env = fresh.env;
      b.status = fresh.status; b.benchLogs = fresh.benchLogs;
      b.notes = fresh.notes;
      return b;
    });
  }
  function deleteBatch(id) {
    state.batches = state.batches.filter((b) => b.id !== id);
    if (state.activeId === id && state.batches.length) state.activeId = state.batches[0].id;
    save(state); emit();
  }

  function createCandidate(candidate) {
    const source = candidate && candidate.batch ? candidate.batch : mutateBatch(getActive(), 0);
    const b = ensureBatchShape(clone(source));
    b.id = nextBatchId();
    b.name = candidate?.name || `${getActive().name} / Suggested`;
    b.status = 'research';
    b.createdAt = Date.now();
    b.benchLogs = [];
    b.measurements = [];
    b.notes = `Suggested from ${candidate?.sourceId || getActive().id} by ${MODEL_INFO.id}.`;
    b.tags = [...new Set([...(b.tags || []), 'suggested', 'doe'])];
    b.lineage = { parentId: candidate?.sourceId || getActive().id, method: 'active-learning' };
    b.model = MODEL_INFO;
    state.batches = [b, ...state.batches];
    state.activeId = b.id;
    save(state); emit();
    return b;
  }

  function setObjective(key, val) {
    state.objectives = { ...OBJECTIVE_BASE(), ...(state.objectives || {}), [key]: val };
    updateActive((b) => {
      b.objectives = { ...OBJECTIVE_BASE(), ...(b.objectives || {}), [key]: val };
      return b;
    });
  }

  // ── Public ──────────────────────────────────────────────────────
  root.CSL = {
    // schema
    JOINTS, COSTS, INVENTORY,
    PHASE_BASE, SEAM_BASE, ENV_BASE, OBJECTIVE_BASE, MODEL_INFO,
    // predictions
    predictFlint, predictFuse, predictMarrow, predictSeam, predictAll,
    radarMetrics, costPhase, scoreBatch, summarizePrediction, featureVector,
    measuredPerformance, suggestCandidates, searchBatches,
    // store
    getState, getActive, subscribe,
    setActiveId, setActiveModule,
    setPhaseVal, setSeamVal, setEnvVal, setBatchField,
    addBenchLog, addMeasurement, cloneActive, applyPreset, deleteBatch,
    createCandidate, setObjective,
    nextBatchId, makePreset,
    reset,
    // utils
    clamp, lerp, round,
  };
})(window);
