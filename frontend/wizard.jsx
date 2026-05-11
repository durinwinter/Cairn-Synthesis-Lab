// wizard.jsx — CSL Batch Wizard · Cairn Synthesis Lab
// All quantities in absolute mass (g). Tolerances shown.
// SKU codes from the CSL inventory. SIWAREX-ready export on done screen.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ── Batch size presets (grams of total binder) ────────────────────
const BATCH_SIZES = [
  { label: '250 g',  value: 250,  note: 'Single test cylinder' },
  { label: '500 g',  value: 500,  note: 'Standard lab batch' },
  { label: '1 kg',   value: 1000, note: 'Panel specimen' },
  { label: '2 kg',   value: 2000, note: 'Full panel' },
];

// ── Cairn Fuse: Biocompatible Solution ───────────────────────────
// Per Cairn Material System Mapping: "Biocompatible solution replacing water"
// Replaces 20 wt% of mix water. Visual QC: pink/salmon = correct dose.
const BIO_SOLUTION = {
  name:         'Cairn Biocompatible Solution',
  shortName:    'Bio-Sol',
  replaceRatio: 0.20,
  workMin:      15,
  compatNote:   null,
  colourNote:   'Expected colour: pink/salmon. Pale or white = under-dosed — do not proceed.',
  voice:        'Biocompatible solution loaded. Struvite-K crystals grow through the organic matrix and penetrate both panels — that crystal ingress is the bond.',
};

// ── Weight computation ────────────────────────────────────────────
// All weights in grams. Returns typed ingredient objects with SKU + tolerance.

function ing(sku, label, grams, tolPct = 2, unit = 'g', note = '') {
  const tol = Math.max(0.1, grams * tolPct / 100);
  return { sku, label, grams: round2(grams), tol: round2(tol), unit, note };
}
function ingML(sku, label, mL, tolPct = 3, note = '') {
  const tol = Math.max(0.5, mL * tolPct / 100);
  return { sku, label, grams: null, mL: round2(mL), tol: round2(tol), unit: 'mL', note };
}
function round2(n) { return Math.round(n * 100) / 100; }

function computeWeights(layerId, B, phases) {
  switch (layerId) {
    case 'flintS': return computeFlintS(B, phases.flint_s);
    case 'flintE': return computeFlintE(B, phases.flint_e);
    case 'marrow': return computeMarrow(B, phases.marrow);
    case 'fuse':   return computeFuse(B, phases.fuse);
    default:       return {};
  }
}

function computeFlintS(B, p) {
  const mgo     = B * p.MgPO4 / (p.MgPO4 + 1);
  const kh2po4  = B - mgo;
  const borax   = mgo * p.Borax / 100;
  const nanoHAp = B * p.NanoHAp / 100;
  const water   = B * p.WB;
  // Basalt fiber: vol% of wet mix. Wet mix ~1900 g/L density for dense Flint paste.
  const pasteVol  = (B + water) / 1900; // L
  const fiberMass = pasteVol * (p.BasaltFiber / 100) * 2650; // basalt ~2650 g/L
  return {
    dryBlend: [
      ing('MGO-DBM-92', 'MgO (dead-burned, 92%)',   mgo,     2),
      ing('KH2PO4-T',   'KH₂PO₄ (technical)',        kh2po4,  2),
      ing('BX-DH',      'Borax (decahydrate)',         borax,   2),
      ing('NHA-200',    'Nano-HAp (<200 nm)',          nanoHAp, 3),
    ],
    fiberAdd: [
      ing('BF-12K',     'Basalt fiber 12 mm chopped', fiberMass, 5),
    ],
    water: [
      ing('H2O',        'Distilled water',             water, 1),
    ],
    // flat list for weigh sheet + SIWAREX export
    all: [
      ing('MGO-DBM-92', 'MgO (dead-burned, 92%)',   mgo,      2, 'g', '1st dry'),
      ing('KH2PO4-T',   'KH₂PO₄ (technical)',        kh2po4,   2, 'g', '2nd dry'),
      ing('BX-DH',      'Borax (decahydrate)',         borax,    2, 'g', '3rd dry'),
      ing('NHA-200',    'Nano-HAp (<200 nm)',          nanoHAp,  3, 'g', '4th dry'),
      ing('H2O',        'Distilled water',             water,    1, 'g', 'add all at once'),
      ing('BF-12K',     'Basalt fiber 12 mm',          fiberMass,5, 'g', 'fold in last'),
    ],
  };
}

function computeFlintE(B, p) {
  const mgo     = B * p.MgPO4 / (p.MgPO4 + 1);
  const kh2po4  = B - mgo;
  const borax   = mgo * p.Borax / 100;
  const nanoHAp = B * p.NanoHAp / 100;
  const water   = B * p.WB;
  const pasteVol  = (B + water) / 2000;
  const fiberMass = pasteVol * (p.BasaltFiber / 100) * 2650;
  // Pigment: 12 g per kg binder (from protocol)
  const pigment = B * 12 / 1000;
  return {
    pigmentDry: [
      ing('MGO-DBM-92', 'MgO (dead-burned, 92%)',       mgo,     2),
      ing('KH2PO4-T',   'KH₂PO₄ (technical)',            kh2po4,  2),
      ing('BX-DH',      'Borax (decahydrate)',             borax,   2),
      ing('NHA-200',    'Nano-HAp (<200 nm)',              nanoHAp, 3),
      ing('PIGMT',      'Inorganic pigment (iron/Cr oxide)', pigment, 5, 'g', 'add first, blend 120 s'),
    ],
    water: [
      ing('H2O',        'Distilled water',                water,   1),
    ],
    fiberAdd: [
      ing('BF-12K',     'Basalt fiber 12 mm chopped',     fiberMass, 5),
    ],
    all: [
      ing('PIGMT',      'Inorganic pigment',              pigment,  5, 'g', '1st — dry blend 120 s'),
      ing('MGO-DBM-92', 'MgO (dead-burned, 92%)',         mgo,      2, 'g', '2nd dry'),
      ing('KH2PO4-T',   'KH₂PO₄ (technical)',             kh2po4,   2, 'g', '3rd dry'),
      ing('BX-DH',      'Borax (decahydrate)',              borax,    2, 'g', '4th dry'),
      ing('NHA-200',    'Nano-HAp (<200 nm)',               nanoHAp,  3, 'g', '5th dry'),
      ing('H2O',        'Distilled water',                 water,    1, 'g', 'add all at once'),
      ing('BF-12K',     'Basalt fiber 12 mm',              fiberMass,5, 'g', 'fold in last'),
    ],
  };
}

function computeMarrow(B, p) {
  const mgo        = B * p.MgPO4 / (p.MgPO4 + 1);
  const kh2po4     = B - mgo;
  const borax      = mgo * p.Borax / 100;
  // Surfactant wt% of binder (consistent with cost model in state.js)
  const surfactant = B * p.Surfactant / 100;
  const water      = B * p.WB;

  // Perlite: vol% of final mix volume
  // Liquid phase mass, density ~1100 g/L for MKPC slurry
  const liquidMass = B + water + surfactant;
  const liquidVol  = liquidMass / 1100; // L
  const pvf        = p.Perlite / 100;
  const perliteVol = liquidVol * pvf / (1 - pvf); // L
  const perliteML  = perliteVol * 1000;            // mL — measure by volume
  const perliteG   = perliteVol * 100;             // g (bulk density 100 g/L)

  // H₂O₂: wt% of slurry (binder + water + perlite)
  const slurryMass    = liquidMass + perliteG;
  const h2o2PureG     = slurryMass * p.H2O2 / 100;
  // Diluted to 10 % working solution from 35 % stock
  const h2o2SolML     = (h2o2PureG / 0.10);           // mL of 10% solution to add
  const h2o2StockML   = (h2o2PureG / 0.35);           // mL of 35% stock to dilute

  return {
    dryBlend: [
      ing('MGO-DBM-92', 'MgO (lightly calcined)',     mgo,      2),
      ing('KH2PO4-T',   'KH₂PO₄ (technical)',          kh2po4,   2),
      ing('BX-DH',      'Borax (decahydrate)',           borax,    2, 'g', 'CRITICAL — 7–8 wt% of MgO'),
    ],
    surfactantWater: [
      ing('H2O',        'Distilled water',               water,    1),
      ing('SURF-P',     'Protein surfactant (pre-dissolved)', surfactant, 5, 'g',
          'dissolve in water fraction before adding to dry'),
    ],
    perlite: [
      ingML('PERL-F',   'Perlite (expanded fine grade)', perliteML, 5,
            `≈ ${perliteG.toFixed(1)} g — measure by volume, bulk density varies`),
    ],
    h2o2: [
      ingML('H2O2-35',  'H₂O₂ (10 % working solution)', h2o2SolML, 3,
            `Dilute ${h2o2StockML.toFixed(1)} mL of 35% stock to ${h2o2SolML.toFixed(0)} mL total with water`),
    ],
    all: [
      ing('MGO-DBM-92', 'MgO (lightly calcined)',      mgo,        2, 'g', '1st dry'),
      ing('KH2PO4-T',   'KH₂PO₄ (technical)',           kh2po4,    2, 'g', '2nd dry'),
      ing('BX-DH',      'Borax (decahydrate)',            borax,     2, 'g', '3rd dry — CRITICAL'),
      ing('H2O',        'Distilled water',                water,     1, 'g', 'with surfactant pre-dissolved'),
      ing('SURF-P',     'Protein surfactant',             surfactant,5, 'g', 'pre-dissolved in water'),
      { ...ingML('PERL-F', 'Perlite expanded',           perliteML, 5), note: 'fold in after base slurry' },
      { ...ingML('H2O2-35','H₂O₂ (10% solution)',       h2o2SolML, 3), note: 'add last — POUR IMMEDIATELY' },
    ],
    h2o2PureG, h2o2SolML, h2o2StockML, perliteML, perliteG,
  };
}

function computeFuse(B, p) {
  const mgo        = B * p.MgPO4 / (p.MgPO4 + 1);
  const kh2po4     = B - mgo;
  const borax      = mgo * p.Borax / 100;
  // Retarder wt% of binder
  const retarder   = B * p.Retarder / 100;
  // MKP seeds wt% of binder
  const seeds      = B * p.Seeds / 100;
  // Nano-HAp at 1 wt% for nucleation (added in Fuse protocol)
  const nanoHAp    = B * 0.01;
  // Fumed silica at 0.75 wt% for thixotropy
  const fumedSilica= B * 0.0075;
  // Water
  const waterTotal  = B * p.WB;
  const bioSolMass  = waterTotal * BIO_SOLUTION.replaceRatio;
  const waterActual = waterTotal - bioSolMass;
  // Primer (50 mL per 100 cm² surface — provide enough for a typical seam)
  const primerML    = 50; // conservative estimate for typical seam length

  return {
    primer: [
      ingML('H3PO4-01', 'H₃PO₄ primer (0.05–0.1 M)',  primerML, 10,
            'brush coat both surfaces — wait 8–10 min before mixing Fuse'),
    ],
    bioSolution: [
      ing('BIO-SOL',   'Cairn Biocompatible Solution', bioSolMass,  3, 'g',
          'replaces 20 wt% of mix water — colour check: pink/salmon'),
      ing('H2O',       'Distilled water (remaining)',   waterActual, 1, 'g',
          'add to bio-solution, mix until uniform before combining with powders'),
    ],
    dryBlend: [
      ing('MGO-DBM-92','MgO (dead-burned, 92%)',        mgo,        2),
      ing('KH2PO4-T',  'KH₂PO₄ (technical)',             kh2po4,    2),
      ing('BX-DH',     'Borax (decahydrate)',              borax,     2, 'g', '6.5–7.0 wt% of MgO'),
      ing('SEED-MKP',  'Pre-reacted MKP seeds',           seeds,     5, 'g', 'nucleation at cold joint'),
      ing('NHA-200',   'Nano-HAp (<200 nm)',               nanoHAp,   3, 'g', 'additional nucleation'),
      ing('FSIL-200',  'Fumed silica (Aerosil 200)',       fumedSilica,5,'g', 'thixotropy — add last of dry'),
    ],
    retarder: retarder > 0.1 ? [
      ing('RET-CIT',   'Secondary retarder (citric/boric)', retarder, 5, 'g',
          'wt% of binder — add with dry blend'),
    ] : [],
    all: [
      { ...ingML('H3PO4-01','H₃PO₄ primer 0.05–0.1 M', primerML, 10), note: 'step 1 — prime surfaces' },
      ing('BIO-SOL',   'Cairn Biocompatible Solution',  bioSolMass,  3, 'g', 'step 3 — dissolve in water'),
      ing('H2O',       'Distilled water',               waterActual, 1, 'g', 'step 3'),
      ing('KH2PO4-T',  'KH₂PO₄ (technical)',             kh2po4,    2, 'g', 'step 4 — add to liquid'),
      ing('MGO-DBM-92','MgO (dead-burned, 92%)',         mgo,        2, 'g', 'step 4'),
      ing('BX-DH',     'Borax (decahydrate)',             borax,      2, 'g', 'step 4'),
      ing('SEED-MKP',  'Pre-reacted MKP seeds',          seeds,      5, 'g', 'step 4'),
      ing('NHA-200',   'Nano-HAp (<200 nm)',              nanoHAp,    3, 'g', 'step 4'),
      ing('FSIL-200',  'Fumed silica (Aerosil 200)',      fumedSilica,5, 'g', 'step 4 — last dry'),
      ...(retarder > 0.1 ? [ing('RET-CIT','Secondary retarder', retarder, 5, 'g', 'step 4')] : []),
    ],
    bioSolMass, waterActual, waterTotal,
  };
}

// ── SIWAREX-compatible recipe export ─────────────────────────────
function buildSiwarexText(layerName, batchSizeG, batchId, ingredients) {
  const date = new Date().toISOString().slice(0, 10);
  const recipeId = `CAIRN-${layerName.replace(/\s+/g, '-').toUpperCase()}-${batchId}`;
  const header = [
    `; CAIRN SYNTHESIS LAB — SIWAREX RECIPE BLOCK`,
    `; RECIPE_ID  : ${recipeId}`,
    `; BATCH      : ${batchId}`,
    `; LAYER      : ${layerName}`,
    `; BINDER_MASS: ${batchSizeG} g`,
    `; GENERATED  : ${date}`,
    `; NOTE       : Tolerance ± values at 2 sigma. Gravimetric dosing sequence.`,
    `;`,
    `; SEQ  SKU           MATERIAL                          TARGET_G  TOL_PLUS  TOL_MINUS  FEED_TYPE`,
  ];
  const rows = ingredients
    .filter((i) => i.grams !== null && i.grams > 0)
    .map((item, idx) => {
      const seq   = String(idx + 1).padStart(3, ' ');
      const sku   = (item.sku || 'CUSTOM').padEnd(14, ' ');
      const label = item.label.substring(0, 34).padEnd(34, ' ');
      const tg    = String(item.grams.toFixed(1)).padStart(8, ' ');
      const tp    = String(item.tol.toFixed(1)).padStart(8, ' ');
      const tm    = String(item.tol.toFixed(1)).padStart(9, ' ');
      const feed  = item.unit === 'mL' ? 'LIQUID_VOL ' : 'GRAVIMETRIC';
      return `  ${seq}  ${sku}  ${label}  ${tg}  ${tp}  ${tm}  ${feed}`;
    });
  const footer = [
    `;`,
    `; VOLUME INGREDIENTS (measure separately):`,
    ...ingredients
      .filter((i) => i.mL != null)
      .map((i) => `;   ${(i.sku || '').padEnd(14)} ${i.label}: ${i.mL.toFixed(1)} mL ± ${i.tol.toFixed(1)} mL`),
    `;`,
    `; END RECIPE ${recipeId}`,
  ];
  return [...header, ...rows, ...footer].join('\n');
}

// ── Layer definitions ─────────────────────────────────────────────
const LAYERS = [
  {
    id: 'flintS', name: 'Flint (S)', fullName: 'Cairn Flint · Structural',
    tag: 'Structural Shell', tagColor: 'var(--flint-hot)', accentColor: 'var(--flint)', dataColor: 'flint-s',
    driver: 'Mg/PO₄ = 7.0 · Dead-burned MgO · Vibration compacted',
    sauce: 'Metal-ceramic toughness. Basalt fiber reinforcement. Target ≥ 80 MPa compressive.',
    buildSteps: (w) => [
      {
        id: 'preflight', title: 'Pre-flight: vibration table + weigh-out',
        detail: 'Weigh all dry ingredients before mixing. Load the vibration table. Confirm mold is bolted. There is no stopping once water contact begins.',
        checklist: [
          'Vibration table ON and confirmed at 50–60 Hz',
          'Mold cleaned, release agent applied',
          'Scale zeroed — tare the mixing vessel',
          'Safety glasses and nitrile gloves on',
        ],
        quantities: w ? [
          { label: 'MgO (dead-burned, 92%)',  value: `${w.dryBlend[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[0].tol.toFixed(1)} g`, sku: 'MGO-DBM-92' },
          { label: 'KH₂PO₄ (technical)',       value: `${w.dryBlend[1].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[1].tol.toFixed(1)} g`, sku: 'KH2PO4-T' },
          { label: 'Borax (decahydrate)',       value: `${w.dryBlend[2].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[2].tol.toFixed(1)} g`, sku: 'BX-DH' },
          { label: 'Nano-HAp (<200 nm)',        value: `${w.dryBlend[3].grams.toFixed(2)}`, unit: 'g', tol: `± ${w.dryBlend[3].tol.toFixed(2)} g`, sku: 'NHA-200', crit: true },
          { label: 'Basalt fiber 12 mm',        value: `${w.fiberAdd[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.fiberAdd[0].tol.toFixed(1)} g`, sku: 'BF-12K' },
          { label: 'Distilled water',           value: `${w.water[0].grams.toFixed(1)}`,    unit: 'g', tol: `± ${w.water[0].tol.toFixed(1)} g`,    sku: 'H2O' },
        ] : [],
        voice: 'Weigh out everything before you start mixing. Once water touches MgO the clock starts — there is no going back to fix a measurement.',
      },
      {
        id: 'drymix', title: 'Dry blend — 90 s',
        detail: 'Combine MgO + KH₂PO₄ + Borax + Nano-HAp. The Borax must coat MgO particles before water contact — this is the only way to control the working window. Do NOT add fiber yet.',
        timer: { seconds: 90, label: 'Dry blend (90 s)' },
        voice: 'Dry mixing. Borax chelates Mg²⁺ on first water contact — uneven distribution now means hot-spots in the paste that set early.',
      },
      {
        id: 'water', title: 'Add water — all at once',
        detail: 'Add all water in a single pour to the centre of the dry blend. Never add water in stages. Start the wet mix timer immediately.',
        quantities: w ? [
          { label: 'Distilled water (total)', value: `${w.water[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.water[0].tol.toFixed(1)} g`, sku: 'H2O' },
        ] : [],
        timer: { seconds: 90, label: 'Wet mix (90 s)' },
        warn: 'Working window starts NOW. Do not add water in stages — staged addition creates a stratified set front.',
        voice: 'Water added. Mix for 90 seconds. Flint (S) should flow but not slump — enough body to accept vibration without running from the mold.',
      },
      {
        id: 'fiber', title: 'Fold in basalt fiber — low-speed only',
        detail: 'Add the pre-weighed chopped fiber. Fold with a spatula or switch to the lowest mixer speed — 3 passes maximum. High-speed mixing tangles and breaks fiber bundles, converting pull-out toughening into brittle notches.',
        quantities: w ? [
          { label: 'Basalt fiber 12 mm (pre-weighed)', value: `${w.fiberAdd[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.fiberAdd[0].tol.toFixed(1)} g`, sku: 'BF-12K' },
        ] : [],
        timer: { seconds: 30, label: 'Low-speed fold (30 s max)' },
        warn: '3 passes maximum. Over-mixing = fiber balling = brittle failure mode instead of pull-out toughening.',
        voice: 'Fiber folded in. From here the trowel is your tool. Slow and deliberate.',
      },
      {
        id: 'pour', title: 'Pour and vibrate — 60 s',
        detail: 'Pour into mold. Engage vibration table immediately at 50–60 Hz. Hold for 60 s. Watch the surface develop a sheen as entrapped air escapes. Target paste density > 2.1 g/cm³.',
        timer: { seconds: 60, label: 'Vibration compaction (60 s)' },
        voice: 'Pouring and vibrating. The surface sheen is air leaving. Keep vibrating until the surface goes still.',
      },
      {
        id: 'cure', title: 'Cure monitoring — log peak exotherm',
        detail: 'Insert thermocouple 20 mm from mold wall. Cover with damp cloth. Record temperature every 5 minutes for the first hour. Expected peak: 60–85 °C at T+22–35 min from water addition.',
        checklist: [
          'Thermocouple inserted — tip 20 mm from wall',
          'Damp cloth cover applied',
          'Ambient temperature and humidity logged',
          'Peak temperature and time-to-peak recorded',
        ],
        voice: 'Cure watch active. The exotherm shape tells you Borax distribution quality. A flat or early peak means non-uniform coating.',
      },
    ],
  },

  {
    id: 'flintE', name: 'Flint (E)', fullName: 'Cairn Flint · Exterior',
    tag: 'Exterior Skin', tagColor: 'var(--retarder-hot)', accentColor: 'var(--retarder)', dataColor: 'flint-e',
    driver: 'UV-stable inorganic pigment · Basalt scrim · Dense W/B',
    sauce: 'Vapour-permeable exterior face. Colour locked at casting — designed for 500-year colour stability.',
    buildSteps: (w) => [
      {
        id: 'weigh', title: 'Weigh all components + pigment dry-blend',
        detail: 'Weigh everything before mixing. Pigment must be blended into dry solids for a full 120 s before water contact. Colour uniformity is set here — any streak in the dry blend becomes a permanent vein in the panel face.',
        quantities: w ? [
          { label: 'Inorganic pigment (iron/Cr oxide)', value: `${w.pigmentDry[4].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.pigmentDry[4].tol.toFixed(1)} g`, sku: 'PIGMT', warn: true },
          { label: 'MgO (dead-burned, 92%)',            value: `${w.pigmentDry[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.pigmentDry[0].tol.toFixed(1)} g`, sku: 'MGO-DBM-92' },
          { label: 'KH₂PO₄ (technical)',                value: `${w.pigmentDry[1].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.pigmentDry[1].tol.toFixed(1)} g`, sku: 'KH2PO4-T' },
          { label: 'Borax (decahydrate)',                value: `${w.pigmentDry[2].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.pigmentDry[2].tol.toFixed(1)} g`, sku: 'BX-DH' },
          { label: 'Nano-HAp (<200 nm)',                 value: `${w.pigmentDry[3].grams.toFixed(2)}`, unit: 'g', tol: `± ${w.pigmentDry[3].tol.toFixed(2)} g`, sku: 'NHA-200', crit: true },
          { label: 'Distilled water',                   value: `${w.water[0].grams.toFixed(1)}`,       unit: 'g', tol: `± ${w.water[0].tol.toFixed(1)} g`,       sku: 'H2O' },
        ] : [],
        timer: { seconds: 120, label: 'Pigment dry-blend (120 s)' },
        warn: 'Organic pigments only — iron oxide, chromium oxide, or cobalt-based. Organic dyes degrade in the phosphate matrix within 5 years.',
        voice: 'Dry-blending pigment now. This is your only chance to set the colour uniformly. Any streak becomes a 500-year record of a bad mix.',
      },
      {
        id: 'scrim', title: 'Prepare and position basalt scrim',
        detail: 'Cut scrim to mold dimensions. Tension flat — no sag, no wrinkles. Set spacers to place mesh at 40–50 % of panel depth. Pre-wet the scrim with dilute phosphate solution to prevent capillary suction pulling water from the face layer.',
        checklist: [
          'Scrim cut to mold dimensions',
          'Mesh tensioned flat — no sag at centre',
          'Spacers set: mesh at 40–50 % panel depth',
          'Scrim pre-wetted with dilute H₃PO₄ solution',
        ],
        voice: 'Scrim positioning is a structural decision. The mesh intercepts crack propagation under thermal cycling and UV stress for the life of the structure.',
      },
      {
        id: 'mix', title: 'Add water + mix — 90 s',
        detail: 'Add all water in one pour. Mix 90 s. Consistency should be self-levelling but not runny — it must flow through the scrim without aggregate segregation.',
        quantities: w ? [
          { label: 'Distilled water', value: `${w.water[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.water[0].tol.toFixed(1)} g`, sku: 'H2O' },
        ] : [],
        timer: { seconds: 90, label: 'Wet mix (90 s)' },
        warn: 'Working window starts NOW. Do not allow surface skinning before the scrim is embedded.',
        voice: 'Mix active. Flint (E) needs to flow through the scrim without segregation. Not runny — self-levelling.',
      },
      {
        id: 'face', title: 'Pour face layer — 15 mm',
        detail: 'Pour a 15 mm base layer into the mold. Trowel smooth. This is the exterior face — the UV-exposed surface. Wait 2 minutes for slight set resistance before placing the scrim.',
        timer: { seconds: 120, label: 'Wait before scrim placement (2 min)' },
        voice: 'Face layer poured. This surface faces the sun. Take time on the trowel — there are no second chances on the exterior face.',
      },
      {
        id: 'scrim2', title: 'Embed scrim + back fill',
        detail: 'Press the scrim into the still-plastic face layer. Ensure full contact — no lifting at edges, no air pockets under mesh. Pour remaining mix over the scrim to complete the panel.',
        checklist: [
          'Scrim pressed flat into face layer — no lifting',
          'Back fill poured — scrim fully buried',
          'No air bubbles visible at scrim depth',
        ],
        voice: 'Scrim embedded. Complete the pour. Any void at the mesh is a future crack initiation site.',
      },
      {
        id: 'cure', title: 'Cure + demold inspection',
        detail: 'Cover with damp cloth. Cure at ambient temperature. Demold at 24 h. Photograph the face surface immediately — pigment streaking is easiest to diagnose in the first hour after demold.',
        checklist: [
          'Damp cloth cover applied immediately',
          'Cure temperature logged every 30 min (first 2 h)',
          'Demold at 24 h — face surface photographed',
          'Colour non-uniformity logged in results if present',
        ],
        voice: 'Flint (E) curing. In 24 hours you see the exterior face. Photograph immediately after demold.',
      },
    ],
  },

  {
    id: 'marrow', name: 'Marrow', fullName: 'Cairn Marrow · Thermal Core',
    tag: 'Thermal + Acoustic', tagColor: 'var(--marrow-warm)', accentColor: 'var(--marrow-warm)', dataColor: 'marrow',
    driver: 'H₂O₂ foaming · Perlite aggregate · Borax 7–8 wt% of MgO',
    sauce: 'Sound-damping open porosity. λ < 0.15 W/m·K. Protein surfactant for stable bubble walls.',
    buildSteps: (w) => [
      {
        id: 'preflight', title: 'Pre-flight: temperature check + weigh-out',
        detail: 'Weigh everything before mixing. Note the room temperature — H₂O₂ decomposition rate roughly doubles every 10 °C. Above 25 °C add 1 wt% extra Borax and pre-chill the mix water to 10 °C.',
        quantities: w ? [
          { label: 'MgO (lightly calcined)',           value: `${w.dryBlend[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[0].tol.toFixed(1)} g`, sku: 'MGO-DBM-92' },
          { label: 'KH₂PO₄ (technical)',               value: `${w.dryBlend[1].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[1].tol.toFixed(1)} g`, sku: 'KH2PO4-T' },
          { label: 'Borax (decahydrate)',               value: `${w.dryBlend[2].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[2].tol.toFixed(1)} g`, sku: 'BX-DH', crit: true },
          { label: 'Protein surfactant (pre-dissolved)',value: `${w.surfactantWater[1].grams.toFixed(2)}`,unit:'g',tol:`± ${w.surfactantWater[1].tol.toFixed(2)} g`,sku:'SURF-P' },
          { label: 'Distilled water',                  value: `${w.surfactantWater[0].grams.toFixed(1)}`,unit:'g',tol:`± ${w.surfactantWater[0].tol.toFixed(1)} g`,sku:'H2O' },
          { label: 'Perlite (expanded fine) — by volume', value: `${w.perliteML.toFixed(0)}`, unit: 'mL', tol: `± ${(w.perliteML * 0.05).toFixed(0)} mL`, sku: 'PERL-F', note: `≈ ${w.perliteG.toFixed(0)} g` },
          { label: 'H₂O₂ (10% working solution)',      value: `${w.h2o2SolML.toFixed(1)}`,         unit: 'mL', tol: `± ${(w.h2o2SolML * 0.03).toFixed(1)} mL`, sku: 'H2O2-35', warn: true },
        ] : [],
        checklist: [
          'Room temperature measured and logged',
          `Perlite measured: ${w ? w.perliteML.toFixed(0) : '—'} mL in graduated cylinder`,
          `H₂O₂ stock (35%): dilute ${w ? w.h2o2StockML.toFixed(1) : '—'} mL to ${w ? w.h2o2SolML.toFixed(0) : '—'} mL with water → 10% working solution`,
          'Protein surfactant pre-dissolved in water fraction',
          'Mold in final position — cannot move after H₂O₂ addition',
        ],
        warn: w && w.h2o2PureG > 0 ? `H₂O₂: ${w.h2o2PureG.toFixed(2)} g pure H₂O₂ in ${w.h2o2SolML.toFixed(0)} mL of 10% solution. Dilute from ${w.h2o2StockML.toFixed(1)} mL of 35% stock.` : null,
        voice: 'Marrow is the most time-sensitive mix. Everything must be staged before H₂O₂ is added — that step starts an irreversible clock.',
      },
      {
        id: 'cmc', title: 'Verify surfactant CMC in phosphate medium',
        detail: 'Commercial CMC values are for plain water. In KH₂PO₄ solution, effective CMC is 1.5–2× higher. Do a 30 mL jar test before committing to the full batch.',
        checklist: [
          'Jar test done: 30 mL KH₂PO₄ solution + surfactant at target dose',
          'Fine stable foam produced within 60 s of shaking → CMC confirmed',
          'Coarse bubbles or foam collapse → increase surfactant by 0.3 wt% of binder and retest',
        ],
        warn: 'Synthetic anionic surfactants adsorb onto KH₂PO₄ crystals — use protein-based (hydrolysed casein or keratin) for reliable foam stability in phosphate medium.',
        voice: 'Surfactant confirmed in phosphate medium. The jar test takes two minutes and prevents a ruined batch.',
      },
      {
        id: 'base', title: 'Mix base slurry — 90 s',
        detail: 'Combine the dry blend (MgO + KH₂PO₄ + Borax) with the water + surfactant solution. Mix 90 s. The Borax dose is higher than Flint or Fuse — it must hold the matrix open until foam expansion completes.',
        timer: { seconds: 90, label: 'Base slurry mix (90 s)' },
        voice: 'Base slurry mixing. The high Borax loading is not negotiable — it holds the crystallisation window open while the gas does its work.',
      },
      {
        id: 'perlite', title: 'Fold in perlite — 30 s low-speed',
        detail: 'Add the pre-measured perlite by volume. Fold gently — 2–3 passes. High-speed mixing crushes the expanded perlite particles, destroying insulation value.',
        quantities: w ? [
          { label: 'Perlite (expanded fine)', value: `${w.perliteML.toFixed(0)}`, unit: 'mL', tol: `± ${(w.perliteML * 0.05).toFixed(0)} mL`, sku: 'PERL-F', note: `≈ ${w.perliteG.toFixed(0)} g` },
        ] : [],
        timer: { seconds: 30, label: 'Perlite fold (30 s max)' },
        warn: 'Low-speed fold only. Crushed perlite = lower R-value = failed thermal grade.',
        voice: 'Perlite folded in. The slurry should be visibly thicker now — this viscosity holds the bubbles during rise.',
      },
      {
        id: 'h2o2', title: 'Add H₂O₂ solution — 20 s mix then POUR',
        detail: 'Add the pre-measured 10% H₂O₂ working solution to the slurry. Mix at low speed for exactly 20 seconds. Then pour immediately — foam rise begins within 2–5 minutes. The mold must already be in final position.',
        quantities: w ? [
          { label: 'H₂O₂ (10% working solution)', value: `${w.h2o2SolML.toFixed(1)}`, unit: 'mL', tol: `± ${(w.h2o2SolML * 0.03).toFixed(1)} mL`, sku: 'H2O2-35', warn: true },
        ] : [],
        timer: { seconds: 20, label: '20 s mix → POUR IMMEDIATELY' },
        warn: 'Do not exceed the H₂O₂ dose. Too much → foam expands faster than it stabilises → collapse before set.',
        voice: 'H₂O₂ added. Twenty seconds, then pour. The gas is forming right now. Do not hesitate.',
      },
      {
        id: 'rise', title: 'Watch the rise — log peak time',
        detail: 'Log the time of pour and the time when expansion stops. Target: foam completes expansion before 10 minutes. Collapse before 10 min = insufficient Borax or temperature too high.',
        checklist: [
          'Time of pour recorded',
          'Time to peak rise recorded',
          'Expansion ratio estimated (final height ÷ initial height)',
          'No collapse before 10 min — confirmed',
        ],
        voice: 'Rise watch. If the foam collapses before the surface freezes still, your Borax was not enough for this temperature.',
      },
    ],
  },

  {
    id: 'fuse', name: 'Fuse', fullName: 'Cairn Fuse · Structural Joint',
    tag: 'System Integrity', tagColor: 'var(--fuse-hot)', accentColor: 'var(--fuse)', dataColor: 'fuse',
    driver: 'Cairn Biocompatible Solution · Crystal penetration bonding · Caulking gun',
    sauce: 'Struvite-K grows through the organic matrix and penetrates both adjacent panels. The seam is the strongest zone.',
    buildSteps: (w) => [
      {
        id: 'substrate', title: 'Verify substrate readiness',
        detail: 'Both Flint and Marrow panels must be fully cured (minimum 24 h). Marrow face must be wire-brushed or coarse-grit abraded to expose perlite aggregate. Flint face must have its dovetail or keyway machined or cast-in.',
        checklist: [
          'Flint panel: cured ≥ 24 h — dovetail/keyway face prepared',
          'Marrow panel: cured ≥ 24 h — bond face wire-brushed',
          'Both faces clean — no dust, no release agent residue',
          'Caulking gun and 300 mL cartridge available',
          'Scale zeroed — ready to weigh mix',
        ],
        voice: 'Substrate check. Fuse crystal penetration requires open, clean pore structure. Contamination or under-cure blocks the mechanism.',
      },
      {
        id: 'primer', title: 'Prime both surfaces — dwell 8–10 min',
        detail: 'Brush-apply 0.05–0.1 M H₃PO₄ solution to both bond faces. The primer saturates the pores with phosphate-compatible fluid, eliminating the suction gradient that causes water theft and flash-set at the interface.',
        quantities: w ? [
          { label: 'H₃PO₄ primer (0.05–0.1 M)', value: `${w.primer[0].mL.toFixed(0)}`, unit: 'mL', tol: `± ${w.primer[0].tol.toFixed(0)} mL`, sku: 'H3PO4-01', note: 'brush coat both surfaces' },
        ] : [],
        timer: { seconds: 600, label: 'Primer dwell — minimum 8 min' },
        warn: 'Plain water is NOT a valid substitute. Water dilutes KH₂PO₄ at the interface and degrades struvite-K nucleation precisely where bond is needed.',
        voice: 'Primer applied. Eight minutes on the clock. Start mixing only after the dwell timer completes — not before.',
      },
      {
        id: 'biosol', title: 'Prepare Cairn Biocompatible Solution',
        detail: 'Weigh the Biocompatible Solution and dissolve in the water fraction before combining with any powders. Colour check: pink/salmon at correct concentration. Pale or colourless = under-dosed — do not proceed.',
        quantities: w ? [
          { label: 'Cairn Biocompatible Solution', value: `${w.bioSolution[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.bioSolution[0].tol.toFixed(1)} g`, sku: 'BIO-SOL', crit: true, note: 'replaces 20 wt% of mix water' },
          { label: 'Distilled water (remaining)', value: `${w.bioSolution[1].grams.toFixed(1)}`,  unit: 'g', tol: `± ${w.bioSolution[1].tol.toFixed(1)} g`, sku: 'H2O' },
        ] : [],
        warn: w ? `Total mix water = ${w.waterTotal.toFixed(1)} g: ${w.bioSolMass.toFixed(1)} g Bio-Sol + ${w.waterActual.toFixed(1)} g water. Bio-Sol replaces exactly 20 wt% of mix water.` : null,
        voice: 'Biocompatible solution loaded. Colour is your QC check — pink/salmon means the concentration is right. The organic matrix is what struvite-K crystals will grow through.',
      },
      {
        id: 'mix', title: 'Mix Cairn Fuse — 90 s',
        detail: 'Add bio-solution to KH₂PO₄ liquid first. Then add MgO + Borax + MKP seeds + Nano-HAp + fumed silica. Mix 90 s. The bio-solution thickens the paste — this is expected and correct.',
        quantities: w ? [
          { label: 'MgO (dead-burned, 92%)',      value: `${w.dryBlend[0].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[0].tol.toFixed(1)} g`, sku: 'MGO-DBM-92' },
          { label: 'KH₂PO₄ (technical)',           value: `${w.dryBlend[1].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[1].tol.toFixed(1)} g`, sku: 'KH2PO4-T' },
          { label: 'Borax (decahydrate)',           value: `${w.dryBlend[2].grams.toFixed(1)}`, unit: 'g', tol: `± ${w.dryBlend[2].tol.toFixed(1)} g`, sku: 'BX-DH' },
          { label: 'Pre-reacted MKP seeds',        value: `${w.dryBlend[3].grams.toFixed(2)}`, unit: 'g', tol: `± ${w.dryBlend[3].tol.toFixed(2)} g`, sku: 'SEED-MKP', crit: true },
          { label: 'Nano-HAp (<200 nm)',            value: `${w.dryBlend[4].grams.toFixed(2)}`, unit: 'g', tol: `± ${w.dryBlend[4].tol.toFixed(2)} g`, sku: 'NHA-200', crit: true },
          { label: 'Fumed silica (Aerosil 200)',    value: `${w.dryBlend[5].grams.toFixed(2)}`, unit: 'g', tol: `± ${w.dryBlend[5].tol.toFixed(2)} g`, sku: 'FSIL-200' },
        ] : [],
        timer: { seconds: 90, label: 'Fuse mix (90 s)' },
        warn: `Working window: ${BIO_SOLUTION.workMin} min from water contact. Load the cartridge gun immediately after mixing.`,
        voice: `Fuse mixed. Working time is ${BIO_SOLUTION.workMin} minutes. Load the cartridge. The seam is either the strongest or weakest point — this pour decides.`,
      },
      {
        id: 'cartridge', title: 'Load cartridge gun + extrusion test',
        detail: 'Transfer mix into a 300 mL caulking cartridge. Cut nozzle at 45° for a 6–8 mm bead width. Test-extrude 50 mm onto scrap — must hold shape on a vertical surface without sagging. If it slumps, add 0.3 wt% of binder extra fumed silica and re-test.',
        checklist: [
          'Cartridge filled — no air pockets',
          'Nozzle cut at 45° for 6–8 mm bead',
          'Test bead holds shape vertically — no sag',
          'Colour check: pink/salmon visible in cartridge',
        ],
        voice: 'Cartridge loaded. The gun gives you precision placement at the back of the seam. The nozzle tip should reach the base of the joint before you squeeze.',
      },
      {
        id: 'apply', title: 'Apply Fuse — continuous bead from back',
        detail: 'Insert nozzle to the back of the seam. Apply a continuous bead as you draw the gun forward. Do not stop mid-seam. Both substrate faces must contact the Fuse simultaneously — crystal penetration cannot occur across a gap.',
        checklist: [
          'Bead started from deepest point of seam',
          'Continuous application — no stops',
          'Both Flint and Marrow faces contacted — no visible voids',
          'Proud bead trowelled flush',
          'Damp cloth applied immediately',
        ],
        timer: { seconds: BIO_SOLUTION.workMin * 60, label: 'Working window remaining' },
        voice: 'Seam filling. Push the nozzle forward steadily. The bead fills behind it. You are growing a seam, not gluing one.',
      },
      {
        id: 'cure', title: 'Cure seam — 24 h, no loading',
        detail: 'Cover with damp cloth. No structural loading for 24 h minimum. Pull-off test at 48 h using a 50 mm dolly (ASTM C1583). Target: > 1.5 MPa cohesive failure. Adhesive failure at the Marrow face = primer dwell was too short.',
        checklist: [
          'Damp cloth cover applied across full seam length',
          'No direct sunlight or heat source',
          'Assembly unmoved for 24 h',
          'Pull-off test scheduled at 48 h',
        ],
        voice: `Fuse curing. Return in 48 hours with a pull-off tester. Cohesive failure above 1.5 MPa confirms the crystal penetration mechanism is working.`,
      },
    ],
  },
];

// ── Timer hook ────────────────────────────────────────────────────
function useTimer(targetSeconds) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);
  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    const t0 = Date.now() - elapsed * 1000;
    ref.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
  }, [running, elapsed]);
  const reset = useCallback(() => { clearInterval(ref.current); setRunning(false); setElapsed(0); }, []);
  useEffect(() => () => clearInterval(ref.current), []);
  const remaining = Math.max(0, targetSeconds - elapsed);
  const done = elapsed >= targetSeconds;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, running, done,
           warn: remaining < targetSeconds * 0.3 && remaining > 0,
           crit: remaining < 30 && remaining > 0, start, reset };
}

// ── Sub-components ────────────────────────────────────────────────

function QtyRow({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="qty-row">
      {items.map((q, i) => (
        <div key={i} className={`qty-chip${q.crit ? ' qty-chip--crit' : q.warn ? ' qty-chip--warn' : ''}`}>
          {q.sku && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--bone-4)',
                           letterSpacing: '0.10em', marginRight: 2 }}>{q.sku}</span>
          )}
          <span className="qty-chip__label">{q.label}</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 15, fontWeight: 700,
                         color: q.crit ? 'var(--fuse-hot)' : 'var(--bone-1)' }}>
            {q.value}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--bone-3)', paddingLeft: 3 }}>{q.unit}</span>
          </span>
          {q.tol && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--bone-4)',
                           letterSpacing: '0.06em' }}>{q.tol}</span>
          )}
          {q.note && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--bone-4)',
                           letterSpacing: '0.04em', fontStyle: 'italic' }}>{q.note}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function TimerBlock({ seconds, label }) {
  const t = useTimer(seconds);
  return (
    <div className="step__timer">
      <div>
        <div className="timer__label">{label}</div>
        <div className="timer__display" data-warn={t.warn ? '1' : '0'} data-crit={t.crit ? '1' : '0'}>
          {t.done ? 'DONE' : t.display}
        </div>
      </div>
      <button className={`timer__btn${t.running ? ' timer__btn--running' : ''}`}
              onClick={t.done ? t.reset : t.start}>
        {t.done ? 'RESET' : t.running ? '⏸ RUNNING' : '▶ START'}
      </button>
    </div>
  );
}

function VoiceCallout({ text }) {
  if (!text) return null;
  return (
    <div className="voice-callout">
      <div className="voice-callout__icon">🔊</div>
      <div className="voice-callout__body">
        <div className="voice-callout__label">Lab Prompt</div>
        <div className="voice-callout__text">"{text}"</div>
      </div>
    </div>
  );
}

function Checklist({ items }) {
  const [checked, setChecked] = useState(() => items.map(() => false));
  const toggle = (i) => setChecked((c) => { const n = [...c]; n[i] = !n[i]; return n; });
  return (
    <div className="checklist">
      {items.map((item, i) => (
        <div key={i} className="checklist__item" data-checked={checked[i] ? '1' : '0'} onClick={() => toggle(i)}>
          <div className="checklist__box">{checked[i] ? '✓' : ''}</div>
          <span className="checklist__label">{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── Weigh Sheet ───────────────────────────────────────────────────
function WeighSheet({ layer, weights, batchSizeG, batchId, onCopy }) {
  const items = weights ? weights.all : [];
  const siwarexText = weights
    ? buildSiwarexText(layer.name, batchSizeG, batchId, items)
    : '';

  return (
    <div style={{
      background: 'var(--basalt-deep)', border: '1px solid var(--rule-dark-2)',
      borderTop: `3px solid ${layer.accentColor}`, padding: 0, width: '100%',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--rule-dark-2)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.18em',
                        color: 'var(--bone-4)' }}>WEIGH SHEET · {layer.fullName.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-3)',
                        marginTop: 2 }}>{batchId} · {batchSizeG} g binder</div>
        </div>
        <button onClick={onCopy} style={{
          appearance: 'none', background: 'var(--aggregate)', border: '1px solid var(--rule-dark-2)',
          color: 'var(--bone-3)', fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer',
        }}>COPY SIWAREX</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--rule-dark-2)' }}>
            {['SKU', 'Material', 'Target', '± Tol', 'Sequence note'].map((h) => (
              <th key={h} style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.14em',
                                   textTransform: 'uppercase', color: 'var(--bone-4)', padding: '7px 12px',
                                   textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(232,225,208,0.05)' : 'none' }}>
              <td style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-4)',
                           padding: '8px 12px', letterSpacing: '0.08em' }}>{item.sku}</td>
              <td style={{ fontSize: 12, color: 'var(--bone-2)', padding: '8px 12px' }}>{item.label}</td>
              <td style={{ fontFamily: 'var(--f-mono)', fontSize: 14, fontWeight: 700,
                           color: 'var(--bone-1)', padding: '8px 12px', whiteSpace: 'nowrap' }}>
                {item.grams != null ? `${item.grams.toFixed(item.grams < 10 ? 2 : 1)} g` : `${item.mL.toFixed(0)} mL`}
              </td>
              <td style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-4)',
                           padding: '8px 12px', whiteSpace: 'nowrap' }}>
                ± {item.tol.toFixed(item.tol < 1 ? 2 : 1)} {item.grams != null ? 'g' : 'mL'}
              </td>
              <td style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-4)',
                           padding: '8px 12px', fontStyle: 'italic' }}>{item.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Batch size selection ──────────────────────────────────────────
function BatchSizeScreen({ layer, onConfirm }) {
  const batch  = CSL.getActive();
  const phases = batch.phases;
  const [sizeG, setSizeG] = useState(500);
  const [custom, setCustom] = useState('');
  const [copied, setCopied] = useState(false);

  const activeG = custom ? (parseFloat(custom) || 500) : sizeG;
  const weights = useMemo(() => computeWeights(layer.id, activeG, phases), [layer.id, activeG]);

  const copySiwarex = () => {
    const text = buildSiwarexText(layer.name, activeG, batch.id, weights.all || []);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className="wiz__progress"><div className="wiz__progress-fill" style={{ width: '12%' }} /></div>
      <div className="wiz__body">
        <div style={{ width: '100%', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.22em',
                        color: 'var(--bone-4)', marginBottom: 4 }}>
            {layer.fullName.toUpperCase()} · BATCH SIZE
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bone-1)',
                        letterSpacing: '-0.01em', marginBottom: 6 }}>
            How much are you making?
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--bone-4)',
                        letterSpacing: '0.06em' }}>
            All ingredient weights are computed from total binder mass (MgO + KH₂PO₄).
          </div>
        </div>

        {/* Size buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                      width: '100%', marginBottom: 12 }}>
          {BATCH_SIZES.map((bs) => (
            <button key={bs.value} onClick={() => { setSizeG(bs.value); setCustom(''); }}
                    style={{
                      appearance: 'none',
                      background: (!custom && sizeG === bs.value) ? 'var(--fuse)' : 'var(--aggregate)',
                      border: `1px solid ${(!custom && sizeG === bs.value) ? 'var(--fuse-deep)' : 'var(--rule-dark-2)'}`,
                      color: (!custom && sizeG === bs.value) ? '#fff' : 'var(--bone-2)',
                      padding: '14px 10px', cursor: 'pointer', textAlign: 'left',
                    }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 16, fontWeight: 700 }}>{bs.label}</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: (!custom && sizeG === bs.value) ? 'rgba(255,255,255,0.7)' : 'var(--bone-4)', marginTop: 4 }}>{bs.note}</div>
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-4)',
                        letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>CUSTOM (g binder):</div>
          <input type="number" value={custom} onChange={(e) => setCustom(e.target.value)}
                 placeholder="e.g. 750"
                 style={{
                   background: 'var(--aggregate)', border: '1px solid var(--rule-dark-2)',
                   color: 'var(--bone-1)', fontFamily: 'var(--f-mono)', fontSize: 14, fontWeight: 600,
                   padding: '8px 12px', width: 120, outline: 'none',
                 }} />
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-4)' }}>g binder</div>
        </div>

        {/* Weigh sheet preview */}
        <WeighSheet layer={layer} weights={weights} batchSizeG={activeG}
                    batchId={batch.id} onCopy={copySiwarex} />

        {copied && (
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--good)',
                        letterSpacing: '0.14em', marginTop: 8, textAlign: 'right' }}>
            ✓ SIWAREX FORMAT COPIED TO CLIPBOARD
          </div>
        )}

        <div className="step__nav" style={{ width: '100%', marginTop: 14 }}>
          <button className="nav-btn nav-btn--next"
                  onClick={() => onConfirm(activeG, weights)}>
            Begin Protocol →
          </button>
        </div>
      </div>
    </>
  );
}

// ── Step view ─────────────────────────────────────────────────────
function StepView({ layer, step, stepIndex, totalSteps, onPrev, onNext, isLast }) {
  const pct = Math.round(((stepIndex + 1) / (totalSteps + 1)) * 100);
  return (
    <>
      <div className="wiz__progress"><div className="wiz__progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="wiz__body">
        <div className="step__meta">
          <span className="step__archetype-badge"
                style={{ color: layer.tagColor, borderColor: layer.accentColor }}>
            {layer.fullName}
          </span>
          <span className="step__counter">Step {stepIndex + 1} of {totalSteps}</span>
        </div>
        <div className="step__card">
          <div className="step__card-hd" style={{ borderLeft: `4px solid ${layer.accentColor}` }}>
            <div className="step__number">STEP {String(stepIndex + 1).padStart(2, '0')}</div>
            <div className="step__instruction">{step.title}</div>
            {step.detail && <div className="step__detail">{step.detail}</div>}
          </div>
          <div className="step__card-body">
            {step.warn && (
              <div className="step__warn"><span>⚠</span><span>{step.warn}</span></div>
            )}
            {step.quantities && step.quantities.length > 0 && (
              <QtyRow items={step.quantities} />
            )}
            {step.timer && <TimerBlock seconds={step.timer.seconds} label={step.timer.label} />}
            {step.checklist && <Checklist items={step.checklist} />}
            {step.voice && <VoiceCallout text={step.voice} />}
          </div>
        </div>
        <div className="step__nav">
          {stepIndex > 0 && (
            <button className="nav-btn nav-btn--prev" onClick={onPrev}>← Back</button>
          )}
          <button className={`nav-btn ${isLast ? 'nav-btn--finish' : 'nav-btn--next'}`}
                  onClick={onNext}>
            {isLast ? 'Record Results →' : 'Next Step →'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Result capture ────────────────────────────────────────────────
function ResultCapture({ layer, batchSizeG, onDone }) {
  const [fields, setFields] = useState({
    peakTempC: '', peakTimeMin: '', breakMpa: '', failMode: 'none',
    expansion: '', colour: '', notes: '',
  });
  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));
  const isFuse   = layer.id === 'fuse';
  const isMarrow = layer.id === 'marrow';
  const isFlint  = !isFuse && !isMarrow;

  const save = () => {
    const parts = [
      `Layer: ${layer.fullName}`,
      `Batch size: ${batchSizeG} g binder`,
      fields.peakTempC   && `Exotherm peak: ${fields.peakTempC} °C @ ${fields.peakTimeMin || '?'} min`,
      fields.breakMpa    && `Break: ${fields.breakMpa} MPa — ${fields.failMode}`,
      fields.expansion   && `Expansion ratio: ${fields.expansion}×`,
      fields.colour      && `Fuse colour: ${fields.colour}`,
      fields.notes       && `Notes: ${fields.notes}`,
    ].filter(Boolean);
    const entry = { kind: fields.breakMpa ? 'break' : 'cast', note: parts.join(' | ') };
    if (fields.breakMpa) { entry.mpa = parseFloat(fields.breakMpa) || 0; entry.mode = fields.failMode; }
    CSL.addBenchLog(entry);
    onDone({ fields, layer, batchId: CSL.getActive().id, batchSizeG });
  };

  const inputStyle = {
    background: 'var(--aggregate)', border: '1px solid var(--rule-dark-2)',
    color: 'var(--bone-1)', fontFamily: 'var(--f-mono)', fontSize: 16, fontWeight: 600,
    padding: '10px 12px', width: '100%', outline: 'none',
  };
  const labelStyle = {
    fontFamily: 'var(--f-mono)', fontSize: 9.5, fontWeight: 600,
    letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bone-4)',
  };

  return (
    <>
      <div className="wiz__progress"><div className="wiz__progress-fill" style={{ width: '95%' }} /></div>
      <div className="wiz__body">
        <div style={{ marginBottom: 8 }}>
          <span className="step__archetype-badge"
               style={{ color: layer.tagColor, borderColor: layer.accentColor, display: 'inline-flex' }}>
            {layer.fullName} · Record Results
          </span>
        </div>
        <div className="result__heading">What did you observe?</div>
        <div className="result__sub">{CSL.getActive().id} · {batchSizeG} g binder · log it now</div>

        <div className="result__grid">
          <div className="result__field">
            <label style={labelStyle}>Peak exotherm (°C)</label>
            <input style={inputStyle} type="number" value={fields.peakTempC}
                   onChange={(e) => set('peakTempC', e.target.value)} placeholder="e.g. 72" />
          </div>
          <div className="result__field">
            <label style={labelStyle}>Time to peak (min)</label>
            <input style={inputStyle} type="number" value={fields.peakTimeMin}
                   onChange={(e) => set('peakTimeMin', e.target.value)} placeholder="e.g. 28" />
          </div>
          {isFlint && (
            <div className="result__field">
              <label style={labelStyle}>Compressive break (MPa)</label>
              <input style={inputStyle} type="number" step="0.1" value={fields.breakMpa}
                     onChange={(e) => set('breakMpa', e.target.value)} placeholder="e.g. 68.4" />
            </div>
          )}
          {isFuse && (
            <>
              <div className="result__field">
                <label style={labelStyle}>Pull-off strength (MPa)</label>
                <input style={inputStyle} type="number" step="0.1" value={fields.breakMpa}
                       onChange={(e) => set('breakMpa', e.target.value)} placeholder="e.g. 2.1" />
              </div>
              <div className="result__field">
                <label style={labelStyle}>Fuse colour at application</label>
                <input style={inputStyle} value={fields.colour}
                       onChange={(e) => set('colour', e.target.value)}
                       placeholder="pink/salmon · pale · white · other" />
              </div>
            </>
          )}
          {isMarrow && (
            <div className="result__field">
              <label style={labelStyle}>Expansion ratio (×)</label>
              <input style={inputStyle} type="number" step="0.05" value={fields.expansion}
                     onChange={(e) => set('expansion', e.target.value)} placeholder="e.g. 1.8" />
            </div>
          )}
          <div className="result__field">
            <label style={labelStyle}>Failure mode</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={fields.failMode}
                    onChange={(e) => set('failMode', e.target.value)}>
              <option value="none">No failure / not yet tested</option>
              <option value="brittle">Brittle fracture</option>
              <option value="ductile">Ductile — fiber bridging</option>
              <option value="delaminated">Delaminated at interface</option>
              <option value="flash-set">Flash set (premature)</option>
              <option value="foam-collapse">Foam collapse (Marrow)</option>
              <option value="crumbled">Crumbled / low cohesion</option>
            </select>
          </div>
        </div>
        <div className="result__field" style={{ width: '100%', marginBottom: 20 }}>
          <label style={labelStyle}>Observations / deviations from protocol</label>
          <textarea style={{ ...inputStyle, fontSize: 13, fontFamily: 'var(--f-sans)',
                             fontWeight: 400, minHeight: 80, resize: 'vertical' }}
                    value={fields.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Deviations from target weights, pour conditions, visual anomalies..." />
        </div>
        <div className="step__nav" style={{ width: '100%' }}>
          <button className="nav-btn nav-btn--finish" onClick={save}>Save to Batch Log →</button>
        </div>
      </div>
    </>
  );
}

// ── Done screen ───────────────────────────────────────────────────
function DoneScreen({ result }) {
  const { fields, layer, batchId, batchSizeG } = result;
  return (
    <>
      <div className="wiz__progress"><div className="wiz__progress-fill" style={{ width: '100%' }} /></div>
      <div className="wiz__body">
        <div className="done__icon">⬡</div>
        <div className="done__title">Batch logged.</div>
        <div className="done__id">{batchId} · {layer.fullName} · {batchSizeG} g · {new Date().toISOString().slice(0, 10)}</div>
        <div className="done__summary">
          {[
            ['Layer',        layer.fullName],
            ['Batch size',   `${batchSizeG} g binder`],
            fields.peakTempC  && ['Exotherm peak', `${fields.peakTempC} °C @ ${fields.peakTimeMin || '?'} min`],
            fields.breakMpa   && ['Break load',    `${fields.breakMpa} MPa — ${fields.failMode}`],
            fields.expansion  && ['Expansion',     `${fields.expansion}×`],
            fields.colour     && ['Fuse colour',   fields.colour],
            fields.notes      && ['Notes',         fields.notes],
          ].filter(Boolean).map(([k, v], i) => (
            <div key={i} className="done__row">
              <span className="done__k">{k}</span>
              <span className="done__v" style={{ textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="done__actions">
          <button className="done__btn" onClick={() => window.location.reload()}>New Batch</button>
          <button className="done__btn" onClick={() => window.open('index.html', '_blank')}>CSL Dashboard</button>
          <button className="done__btn done__btn--primary" onClick={() => window.print()}>Print Record</button>
        </div>
      </div>
    </>
  );
}

// ── Pick screen ───────────────────────────────────────────────────
function PickScreen({ onPick }) {
  const batch  = CSL.getActive();
  const p      = batch.phases;
  const days   = Math.floor((Date.now() - batch.createdAt) / 86400000);

  return (
    <>
      <div className="wiz__progress"><div className="wiz__progress-fill" style={{ width: '4%' }} /></div>
      <div className="wiz__body">
        <div className="pick__prompt">Cairn Synthesis Lab · Batch Protocol Wizard</div>
        <div className="pick__question">Which layer are you casting?</div>

        {/* Active formulation banner — shows exactly which batch the wizard will use */}
        <div style={{
          width: '100%',
          background: 'var(--basalt-deep)',
          border: '1px solid var(--rule-dark-2)',
          borderLeft: '3px solid var(--fuse)',
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.18em',
                          color: 'var(--fuse)', marginBottom: 3 }}>
              ACTIVE FORMULATION — quantities computed from this batch
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bone-1)',
                          letterSpacing: '-0.005em' }}>
              {batch.name}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--bone-4)',
                          marginTop: 3, letterSpacing: '0.06em' }}>
              {batch.id} · {batch.status.toUpperCase()} · {days === 0 ? 'today' : `${days}d ago`}
            </div>
          </div>
          {/* Key parameters at a glance */}
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            {[
              { k: 'Flint (S) Mg/PO₄', v: p.flint_s.MgPO4.toFixed(2) },
              { k: 'Fuse Borax',        v: `${p.fuse.Borax.toFixed(1)} wt% MgO` },
              { k: 'Marrow H₂O₂',      v: `${p.marrow.H2O2.toFixed(2)} wt%` },
              { k: 'Marrow Perlite',    v: `${p.marrow.Perlite.toFixed(0)} vol%` },
            ].map(({ k, v }) => (
              <div key={k} style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--bone-4)',
                              letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 700,
                              color: 'var(--bone-2)', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pick__hint" style={{ marginBottom: 20, marginTop: 0 }}>
          To use a different formulation, go to the{' '}
          <a href="index.html" style={{ color: 'var(--fuse-hot)', textDecoration: 'none',
                                        fontFamily: 'var(--f-mono)', fontSize: 10,
                                        letterSpacing: '0.10em' }}>
            CSL Dashboard
          </a>
          {' '}and select a different batch before returning here.
          All gram quantities are computed from the formulation above.
        </div>
        <div className="pick__grid">
          {LAYERS.map((l) => (
            <button key={l.id} className="archetype-card" data-color={l.dataColor} onClick={() => onPick(l)}>
              <div className="archetype-card__accent" style={{ background: l.accentColor }} />
              <div className="archetype-card__georock" style={{ color: 'var(--bone-3)' }}>{l.fullName}</div>
              <div className="archetype-card__name">{l.name}</div>
              <div className="archetype-card__tag" style={{ color: l.tagColor, borderColor: l.tagColor }}>{l.tag}</div>
              <div className="archetype-card__driver">{l.driver}</div>
              <div className="archetype-card__sauce">{l.sauce}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────
function Wizard() {
  const [layer,     setLayer]     = useState(null);
  const [batchSizeG,setBatchSizeG]= useState(500);
  const [weights,   setWeights]   = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase,     setPhase]     = useState('pick'); // pick | size | steps | result | done
  const [result,    setResult]    = useState(null);

  const steps   = layer && weights ? layer.buildSteps(weights) : [];
  const isLast  = layer && stepIndex === steps.length - 1;

  const pickLayer = (l) => { setLayer(l); setPhase('size'); };
  const confirmSize = (g, w) => { setBatchSizeG(g); setWeights(w); setStepIndex(0); setPhase('steps'); };
  const backToSize  = () => setPhase('size');
  const backToLayers= () => { setLayer(null); setPhase('pick'); };

  return (
    <div className="wiz">
      <header className="wiz__header">
        <div className="wiz__logo">
          <div className="wiz__mark" />
          <div>
            <div className="wiz__title">Cairn Synthesis Lab · Batch Wizard</div>
            <div className="wiz__sub">
              {layer ? `${layer.fullName} · ${batchSizeG} g binder` : 'Single-Test Protocol'}
            </div>
          </div>
        </div>
        {phase === 'size'   && <button className="wiz__back" onClick={backToLayers}>← Change Layer</button>}
        {phase === 'steps'  && <button className="wiz__back" onClick={backToSize}>← Change Batch Size</button>}
        {phase === 'result' && <button className="wiz__back" onClick={() => setPhase('steps')}>← Back to Steps</button>}
        {phase === 'pick'   && (
          <a href="index.html" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
                                        letterSpacing: '0.14em', color: 'var(--bone-4)',
                                        textDecoration: 'none', textTransform: 'uppercase' }}>
            ← CSL Dashboard
          </a>
        )}
      </header>

      {phase === 'pick'   && <PickScreen onPick={pickLayer} />}
      {phase === 'size'   && layer && <BatchSizeScreen layer={layer} onConfirm={confirmSize} />}
      {phase === 'steps'  && layer && (
        <StepView layer={layer} step={steps[stepIndex]} stepIndex={stepIndex}
                  totalSteps={steps.length}
                  onPrev={() => stepIndex > 0 ? setStepIndex(i => i - 1) : backToSize()}
                  onNext={() => isLast ? setPhase('result') : setStepIndex(i => i + 1)}
                  isLast={isLast} />
      )}
      {phase === 'result' && layer && (
        <ResultCapture layer={layer} batchSizeG={batchSizeG}
                       onDone={(r) => { setResult(r); setPhase('done'); }} />
      )}
      {phase === 'done'   && result && <DoneScreen result={result} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Wizard />);
