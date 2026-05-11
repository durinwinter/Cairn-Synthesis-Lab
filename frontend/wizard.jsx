// wizard.jsx — CSL Batch Wizard · Cairn Synthesis Lab
// Step-by-step lab protocol for a single test batch.
// Open wizard.html in a browser — no build step required.
// Completed batches log to the shared CSL localStorage store.

const { useState, useEffect, useRef, useCallback } = React;

// ── Cairn Fuse: Biocompatible Solution config ────────────────────
// Per the Cairn Material System Mapping:
//   Primary Kinetic Driver: Organic Crosslinker
//   Special Sauce: Biocompatible solution replacing water
//
// The biocompatible solution replaces 20% of mix water. It forms a
// protein-mineral composite as struvite-K crystals grow through it,
// penetrating the pore networks of both adjacent Flint and Marrow panels.
// Visual QC at working concentration: pink/salmon colour.
const BIO_SOLUTION = {
  name:          'Cairn Biocompatible Solution',
  shortName:     'Bio-Sol',
  replaceRatio:  0.20,
  workMin:       15,
  compatNote:    null,  // pH 6–8 working range — compatible with MKPC chemistry
  warning:       null,
  colourNote:    'Expected colour: pink/salmon at correct concentration. Pale or colourless = under-dosed. Do not proceed.',
  voice:         'Biocompatible solution loaded. Struvite-K crystals will grow through the organic matrix and penetrate both adjacent panels — that crystal ingress is the bond. You are growing a seam, not applying an adhesive.',
};

// ── Layer definitions ─────────────────────────────────────────────
// Four Cairn layers, each with its own protocol fork.
const LAYERS = [
  {
    id:          'flintS',
    name:        'Flint (S)',
    fullName:    'Cairn Flint · Structural',
    tag:         'Structural Shell',
    tagColor:    'var(--flint-hot)',
    accentColor: 'var(--flint)',
    dataColor:   'flint-s',
    driver:      'High Mg/PO₄ = 7.0 · Vibration-compacted · High density',
    sauce:       'Metal-ceramic toughness. Basalt fiber reinforcement. Target compressive strength ≥ 80 MPa.',
    steps: [
      {
        id:    'setup',
        title: 'Pre-flight: Verify vibration table',
        detail: 'Flint (S) demands compaction to close micro-voids. The vibration table must reach 50–60 Hz. Confirm the mold is bolted down before mixing — you will not be able to move it once pour begins.',
        checklist: [
          'Vibration table power ON — 50–60 Hz confirmed',
          'Mold cleaned + release agent applied',
          'Basalt fiber pre-weighed (3.0–5.0 vol%)',
          'Safety glasses + nitrile gloves on',
        ],
        voice: 'Flint (S) prep underway. Structural integrity depends on compaction. Confirm your vibration table before mixing — there is no fixing it after the pour.',
      },
      {
        id:    'weigh',
        title: 'Weigh dry components',
        detail: 'Mg/PO₄ mass ratio 7.0. Dead-burned MgO (1400–1800 °C calcined) gives controlled reactivity for a dense shell. Borax is the working-window lever — do not skip it.',
        quantities: [
          { label: 'Dead-burned MgO (92%)', value: 'Batch × 0.64',  unit: 'kg' },
          { label: 'KH₂PO₄ (technical)',    value: 'Batch × 0.36',  unit: 'kg' },
          { label: 'Borax',                 value: '5.5 wt% of MgO', unit: 'CRITICAL' },
          { label: 'Basalt fiber 12mm',     value: '3.0–5.0 vol%',   unit: '' },
        ],
        voice: 'Weigh precisely. At Mg/PO₄ = 7.0, excess MgO is your filler — any short-pour on phosphate leaves free acid and will etch the basalt fiber sizing.',
      },
      {
        id:    'drymix',
        title: 'Dry blend — 90 seconds',
        detail: 'Add Borax to dry solids before water contact. This coats MgO particles with Borax, extending the working window. Uncoated MgO reacts in seconds when it meets water.',
        timer:  { seconds: 90, label: 'Dry mix' },
        voice:  'Dry mixing. Borax chelates Mg²⁺ on water contact — if it is not evenly distributed now, you will get hot-spots that set early and ruin the compressive grade.',
      },
      {
        id:    'water',
        title: 'Add water — W/B 0.18–0.22',
        detail: 'Add all water in one pour. Do not add in stages — the first water triggers hydration and any staged addition creates a stratified set front. Lower W/B = higher density = higher strength.',
        quantities: [
          { label: 'W/B ratio',          value: '0.18–0.22', unit: '' },
          { label: 'Wet mix time',        value: '90 s',      unit: '' },
        ],
        timer: { seconds: 90, label: 'Wet mix' },
        warn:  'Working window starts NOW. You have approximately ' + Math.round(8 + 6.5 * 5.5) + ' minutes to pour and compact.',
        voice: 'Water added. Clock is running. Flint (S) should flow but not slump flat — it needs enough body to accept compaction without running out of the mold.',
      },
      {
        id:    'fiber',
        title: 'Fold in basalt fiber — low-speed only',
        detail: 'Add pre-weighed chopped basalt fiber (12 mm). Fold — do NOT continue high-speed mixing. Over-mixing breaks fiber bundles and creates tangles that act as stress concentrators rather than reinforcement.',
        timer: { seconds: 30, label: 'Low-speed fold' },
        warn:  'Fold only — 3 passes maximum. Over-mixing = fiber balling = brittle fracture mode instead of pull-out toughening.',
        voice: 'Fiber folded in. From here, the trowel is your tool — not the mixer. You want distribution, not destruction.',
      },
      {
        id:    'pour',
        title: 'Pour + vibrate — 60 seconds',
        detail: 'Pour into mold. Immediately engage vibration at 50–60 Hz. 60 seconds of vibration closes entrapped air and achieves target density > 2.1 g/cm³. Watch the surface — it develops a sheen as air escapes.',
        timer: { seconds: 60, label: 'Vibration compaction' },
        voice: 'Pouring and vibrating. Flint (S) is setting. The surface sheen is air leaving — keep vibrating until it goes still.',
      },
      {
        id:    'cure',
        title: 'Cure monitoring — 2h watch',
        detail: 'Record exotherm peak temperature and time-to-peak. Expected: 60–85 °C at T+22–35 min from mix. Do not disturb the mold during the peak — struvite-K crystals are forming.',
        checklist: [
          'Thermocouple inserted — tip 20 mm from mold wall',
          'Mold covered with damp cloth',
          'Ambient temperature and humidity logged',
          'Peak temp + time recorded in results',
        ],
        voice: 'Cure watch active. The exotherm profile tells you how well the Borax distributed. A flat or early peak means non-uniform Borax coating.',
      },
    ],
  },

  {
    id:          'flintE',
    name:        'Flint (E)',
    fullName:    'Cairn Flint · Exterior',
    tag:         'Exterior Skin',
    tagColor:    'var(--retarder-hot)',
    accentColor: 'var(--retarder)',
    dataColor:   'flint-e',
    driver:      'UV-stable inorganic pigment · Basalt scrim mesh · 500-year colour lock',
    sauce:       'Vapour-permeable density. The colour is structural data — locked at casting, never repainted.',
    steps: [
      {
        id:    'pigment',
        title: 'Inorganic pigment into dry solids — 120 seconds',
        detail: 'Flint (E) colour stability requires full pigment dispersal BEFORE water contact. Organic pigments are incompatible — use only inorganic iron-oxide or chromium-oxide grades. Streaking in the dry mix becomes a permanent vein.',
        quantities: [
          { label: 'Inorganic pigment (iron/chromium oxide)', value: '12 g',      unit: 'per kg binder' },
          { label: 'Dry mix (solids + pigment)',              value: '120 s',     unit: '' },
          { label: 'Max pigment loading',                     value: '< 5 wt%',   unit: 'of dry binder' },
        ],
        timer: { seconds: 120, label: 'Pigment dry-blend' },
        warn:  'Organic pigments are incompatible. The phosphate environment causes colour shift within 5 years. Inorganic iron/chromium oxides only.',
        voice: 'Dry-blending pigment now. This surface will be the exterior of the structure for 500 years. Any streaking you allow now becomes a permanent geological record of a bad mix.',
      },
      {
        id:    'scrim',
        title: 'Prepare basalt scrim mesh',
        detail: 'The scrim provides inter-layer tensile bridging. Pre-tension it across the mold before pouring. The mesh must be centred in the panel depth — not at the face or back.',
        checklist: [
          'Basalt scrim cut to mold dimensions',
          'Mesh tensioned flat — no sag, no wrinkles',
          'Spacers set: mesh at 40–50% of panel depth',
          'Scrim pre-wetted with dilute phosphate solution (prevents suction)',
        ],
        voice: 'Scrim preparation is a structural decision. The mesh intercepts crack propagation after surface impact, thermal cycling, and decades of UV loading.',
      },
      {
        id:    'mix',
        title: 'Add water + mix — W/B 0.22–0.24',
        detail: 'Slightly higher W/B than Flint (S) to ensure full penetration of the scrim. The mix must flow through the mesh without segregation.',
        quantities: [
          { label: 'W/B ratio',       value: '0.22–0.24',   unit: '' },
          { label: 'Wet mix time',    value: '90 s',         unit: '' },
          { label: 'Borax',           value: '5.0–6.0 wt%', unit: 'of MgO' },
        ],
        timer: { seconds: 90, label: 'Wet mix' },
        warn:  'Working window starts NOW. Do not allow surface skinning before scrim embedding.',
        voice: 'Mix active. Flint (E) should be self-levelling but not runny. It needs to flow through the scrim without the aggregate settling away from the face.',
      },
      {
        id:    'facelayer',
        title: 'First pour — face layer (15 mm)',
        detail: 'This is the exterior face — the colour layer. Pour 15 mm, trowel smooth. Wait 2 minutes before placing scrim — the face needs slight set resistance to hold the mesh.',
        timer: { seconds: 120, label: 'Wait before scrim placement' },
        voice: 'Face layer poured. This surface faces the sun. Take time to trowel correctly — no second chances on the exterior face.',
      },
      {
        id:    'embedscrim',
        title: 'Embed scrim + back fill',
        detail: 'Press the scrim into the still-plastic face layer. Ensure full contact — no air pockets under the mesh. Pour remaining mix over the scrim to complete the panel.',
        checklist: [
          'Scrim pressed flat — no lifting at edges',
          'Back fill poured — scrim fully buried',
          'No air bubbles visible at scrim depth',
        ],
        voice: 'Scrim embedded. Now complete the pour. Any void at the mesh is a future crack initiation site. The scrim must be encapsulated, not just covered.',
      },
      {
        id:    'cure',
        title: 'Cure + visual check at demold',
        detail: 'Cure under damp cloth at ambient temperature. After 24h demold, photograph the face surface immediately. Pigment streaking at this stage = insufficient dry-blend time.',
        checklist: [
          'Damp cloth cover applied immediately',
          'Cure temp logged every 30 min (first 2 h)',
          'Demold at 24 h — face surface photographed',
          'Any colour non-uniformity logged in results',
        ],
        voice: 'Flint (E) curing. In 24 hours you see the true exterior. Photograph it immediately after demold — colour issues are easiest to diagnose within the first hour.',
      },
    ],
  },

  {
    id:          'marrow',
    name:        'Marrow',
    fullName:    'Cairn Marrow · Thermal Core',
    tag:         'Thermal + Acoustic',
    tagColor:    'var(--marrow-warm)',
    accentColor: 'var(--marrow-warm)',
    dataColor:   'marrow',
    driver:      'H₂O₂ / Perlite ratio · Foam window control · Borax 7–8 wt%',
    sauce:       'Sound-damping porosity. Protein surfactant for stable bubble walls. λ < 0.15 W/m·K target.',
    steps: [
      {
        id:    'setup',
        title: 'Pre-flight: Temperature check',
        detail: 'Marrow foam chemistry is temperature-sensitive. H₂O₂ decomposition rate roughly doubles every 10 °C. Work at 15–20 °C. Above 25 °C the foam rises faster than the Borax retardation can manage.',
        checklist: [
          'Room temperature measured and logged',
          'Perlite pre-weighed (40 vol% of mix)',
          'Protein surfactant pre-dissolved in small water fraction',
          'H₂O₂ diluted to 10% (from 35% stock)',
          'Mold ready — 50 mm dia × 100 mm cylinder',
        ],
        warn:  'If ambient temperature > 25 °C — add 1 wt% extra Borax and pre-chill the mix water to 10 °C.',
        voice: 'Marrow is the most time-sensitive mix. The foam window is narrow. Everything must be staged before you add H₂O₂ — that step starts the clock.',
      },
      {
        id:    'cmc',
        title: 'Verify surfactant CMC in phosphate medium',
        detail: 'Commercial surfactant CMC values are for plain water. In KH₂PO₄ solution, effective CMC is 1.5–2× higher. Do a jar test with this lot before committing to a full pour.',
        quantities: [
          { label: 'Protein surfactant (casein/keratin)', value: '0.3–1.5 wt%', unit: '' },
          { label: 'Target D50 bubble size',              value: '300–700 µm',   unit: '' },
          { label: 'Polydispersity index (PDI)',           value: '< 0.4',        unit: '' },
        ],
        warn:  'Synthetic anionic surfactants adsorb onto KH₂PO₄ crystals — use protein-based (hydrolysed casein or keratin) for reliable CMC behaviour in the phosphate matrix.',
        voice: 'Surfactant check complete. If your jar test shows coarse bubbles or collapse, your surfactant is below effective CMC in phosphate medium. Add 0.3% more before proceeding.',
      },
      {
        id:    'basemix',
        title: 'Mix base slurry — 90 seconds',
        detail: 'Combine MgO (lightly calcined) + KH₂PO₄ + Borax (7.5 wt%) + water + surfactant. The high Borax loading is critical — it must delay set until foam expansion is complete.',
        quantities: [
          { label: 'MgO (lightly calcined)', value: 'Batch × 0.58', unit: 'kg' },
          { label: 'KH₂PO₄',                value: 'Batch × 0.42', unit: 'kg' },
          { label: 'Borax',                  value: '7.5 wt% MgO',  unit: 'CRITICAL' },
          { label: 'W/B ratio',              value: '0.28–0.35',    unit: '' },
        ],
        timer: { seconds: 90, label: 'Base slurry mix' },
        voice: 'Base slurry mixing. The Borax dose is higher than Flint or Fuse — it holds the matrix open while the foam does its structural work.',
      },
      {
        id:    'perlite',
        title: 'Fold in perlite — 30 seconds, low-speed',
        detail: 'Fold perlite in gently. It provides thermal insulation AND increases slurry viscosity to stabilise bubbles. High-speed mixing crushes the expanded perlite particles and destroys the insulation value.',
        quantities: [
          { label: 'Expanded perlite (fine grade)', value: '40 vol%', unit: 'of total mix' },
        ],
        timer: { seconds: 30, label: 'Perlite fold' },
        warn:  'Low-speed fold only. High-speed mixing collapses perlite → lower R-value → failed thermal grade.',
        voice: 'Perlite folded in. Slurry should be visibly thicker. This viscosity is what holds the bubbles in place during the foam rise.',
      },
      {
        id:    'h2o2',
        title: 'Add H₂O₂ — POUR IMMEDIATELY after 20 s',
        detail: 'Add the pre-diluted 10% H₂O₂. Mix at LOW speed for exactly 20 seconds, then pour — do not wait. Foam rise begins within 2–5 minutes. The mold must be in final position before you add H₂O₂.',
        quantities: [
          { label: 'H₂O₂ (10% dilution)',    value: '1.0–2.5 wt%',        unit: 'of slurry mass' },
          { label: 'Mix time after addition', value: '20 s low-speed',      unit: '' },
          { label: 'Then',                    value: 'POUR IMMEDIATELY',    unit: '' },
        ],
        timer: { seconds: 20, label: 'Mix after H₂O₂ — then POUR' },
        warn:  'Do not exceed 4 wt% H₂O₂. Above this, expansion is faster than stabilisation — the foam collapses before set.',
        voice: 'H₂O₂ added. Twenty seconds, then pour. Marrow is alive right now. Gas is forming. Do not hesitate.',
      },
      {
        id:    'rise',
        title: 'Watch the rise — log peak time',
        detail: 'Time to peak rise = when expansion stops. Target: foam completes expansion before 10 minutes, before struvite-K crystallisation locks the structure. Collapse before 10 min = too little Borax or too high temperature.',
        checklist: [
          'Time of pour recorded',
          'Time to peak rise recorded',
          'Expansion ratio estimated (final height ÷ initial height)',
          'No collapse observed before 10 min',
        ],
        voice: 'Rise watch active. If the foam collapses before the surface freezes still, your Borax was insufficient for this temperature. Add 0.5 wt% more to the next batch.',
      },
    ],
  },

  {
    id:          'fuse',
    name:        'Fuse',
    fullName:    'Cairn Fuse · Structural Joint',
    tag:         'System Integrity',
    tagColor:    'var(--fuse-hot)',
    accentColor: 'var(--fuse)',
    dataColor:   'fuse',
    driver:      `Protein biopolymer (${BIO_SOLUTION.shortName}) · Crystal penetration bonding`,
    sauce:       'Struvite-K crystals grow through the protein matrix and INTO both adjacent panels. The seam becomes the strongest part of the assembly.',
    steps: [
      {
        id:    'substrates',
        title: 'Verify substrate readiness',
        detail: 'Fuse bonds only to fully cured, dimensionally stable panels. Both Flint and Marrow must be minimum 24 h old. Marrow face must be scarified (wire brush or coarse grit) to expose the perlite aggregate. Flint face must have its dovetail or keyway machined.',
        checklist: [
          'Flint panel: cured ≥ 24 h — dovetail/keyway face prepared',
          'Marrow panel: cured ≥ 24 h — bond face scarified (wire brush)',
          'Both faces visually inspected — no surface dust or release agent residue',
          'Cartridge gun and 300 mL cartridge available',
          'Safety glasses + nitrile gloves on',
        ],
        voice: 'Substrate check. Fuse cannot compensate for a contaminated or un-cured surface. Crystal penetration requires an open, clean pore structure. If there is doubt about cure age — wait.',
      },
      {
        id:    'primer',
        title: 'Prime both bond surfaces',
        detail: 'Brush-apply 0.05–0.1 M H₃PO₄ solution to both the Flint dovetail face and the scarified Marrow face. Wait 8–10 minutes. This saturates the pores with phosphate-compatible fluid, eliminating the suction gradient that causes water theft.',
        quantities: [
          { label: 'H₃PO₄ primer concentration', value: '0.05–0.1 M',  unit: '' },
          { label: 'Application',                 value: 'Brush coat',   unit: '' },
          { label: 'Dwell time',                  value: '8–10 min',    unit: 'CRITICAL' },
        ],
        timer: { seconds: 600, label: 'Primer dwell (minimum 8 min)' },
        warn:  'Do NOT use plain water as primer. Plain water dilutes KH₂PO₄ at the interface and degrades struvite-K nucleation exactly where bond formation is needed most.',
        voice: 'Primer applied. Eight minutes on the clock. The phosphate solution is saturating the pores — making the interface chemically continuous with the incoming Fuse.',
      },
      {
        id:    'protein',
        title: 'Prepare protein biopolymer solution',
        detail: `Replace ${Math.round(BIO_SOLUTION.replaceRatio * 100)}% of mix water with ${BIO_SOLUTION.name}. Dissolve fully in the water fraction before combining with phosphate. The expected colour is pink/salmon at correct concentration — pale or colourless means under-dosed. This is your visual QC check.`,
        quantities: [
          { label: BIO_SOLUTION.name,        value: `${Math.round(BIO_SOLUTION.replaceRatio * 100)}% of mix water`, unit: '' },
          { label: 'Remaining plain water', value: `${Math.round((1 - BIO_SOLUTION.replaceRatio) * 100)}% of mix water`, unit: '' },
          { label: 'Target colour',         value: 'Pink / salmon',  unit: '← visual QC' },
        ],
        voice: BIO_SOLUTION.voice,
      },
      {
        id:    'mix',
        title: 'Mix Cairn Fuse — full protocol',
        detail: 'Add protein solution to KH₂PO₄ liquid first. Then add MgO + Borax + nano-HAp seeds + fumed silica. Mix 90 seconds. The protein thickens the mix — this is correct. Target consistency: holds shape when extruded from the cartridge gun without sagging.',
        quantities: [
          { label: 'Mg/PO₄ ratio',    value: '3:1 (phosphate-rich)', unit: '' },
          { label: 'Borax',           value: '6.5–7.0 wt% MgO',       unit: '' },
          { label: 'Nano-HAp seeds',  value: '0.5–1.5 wt%',           unit: 'nucleation trigger' },
          { label: 'Fumed silica',    value: '0.5–1.0 wt%',           unit: 'thixotropy' },
          { label: 'Working window',  value: `${BIO_SOLUTION.workMin} min`, unit: '' },
        ],
        timer: { seconds: 90, label: 'Fuse mix' },
        warn:  `Working window: ${BIO_SOLUTION.workMin} min from mix. Load the cartridge gun immediately after mixing.`,
        voice: `Fuse mixed. Load the cartridge. Working time is ${BIO_SOLUTION.workMin} minutes. The seam is either the strongest or weakest part of the structure — this pour decides which.`,
      },
      {
        id:    'loadcartridge',
        title: 'Load cartridge gun + extrusion test',
        detail: 'Transfer Fuse mix into the 300 mL caulking gun cartridge. Cut the nozzle at 45° for a 6–8 mm bead width. Test-extrude a 50 mm bead on scrap — it should hold its shape on a vertical surface without slumping. If it slumps flat, add 0.25 wt% fumed silica and re-test.',
        checklist: [
          'Cartridge filled — no air pockets',
          'Nozzle cut 45° for 6–8 mm bead',
          'Test bead: holds shape vertically ✓',
          'Colour check: pink/salmon ✓',
        ],
        voice: 'Cartridge loaded. The caulking gun gives you precision placement in the seam — no trowel smearing, no voids from under-packing. The nozzle should reach the back of the joint.',
      },
      {
        id:    'apply',
        title: 'Apply Fuse to seam — continuous bead',
        detail: 'Apply a continuous bead from the back of the seam forward. The nozzle should contact the seam base on entry. Fill the joint in one pass — stopping creates cold joints within the Fuse itself. The crystal penetration mechanism requires the Fuse to be in direct contact with both substrate surfaces simultaneously.',
        checklist: [
          'Bead started from deepest point of seam',
          'Continuous application — no stops mid-seam',
          'Both substrate faces contacted (no voids)',
          'Proud bead trowelled flush with panel face',
          'Damp cloth cover applied immediately',
        ],
        timer: { seconds: BIO_SOLUTION.workMin * 60, label: 'Working window remaining' },
        voice: 'Seam filling in progress. Push the nozzle forward steadily — the bead fills behind it. Crystal penetration cannot happen across a gap. Full contact with both Flint and Marrow is mandatory.',
      },
      {
        id:    'cure',
        title: 'Seam cure — 24 h, no loading',
        detail: 'Cover seam with damp cloth. Do not load the joint for minimum 24 h. The protein biopolymer completes molecular bridging in the first 4–6 h — thermal disturbance during this period degrades final bond strength. Pull-off test at 48 h (50 mm dolly, ASTM C1583). Target: > 1.5 MPa cohesive failure.',
        checklist: [
          'Damp cloth cover applied across full seam length',
          'No direct sunlight or heat source on seam',
          'Assembly not moved for 24 h',
          'Pull-off test scheduled at 48 h',
        ],
        voice: `Fuse curing. Come back in 48 hours with a pull-off tester. If the seam fails cohesively above 1.5 MPa, the ${BIO_SOLUTION.shortName} path is confirmed for this joint geometry. Adhesive failure at the Marrow face means the primer dwell was too short.`,
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
    const startAt = Date.now() - elapsed * 1000;
    ref.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startAt) / 1000));
    }, 250);
  }, [running, elapsed]);

  const reset = useCallback(() => {
    clearInterval(ref.current);
    setRunning(false);
    setElapsed(0);
  }, []);

  useEffect(() => () => clearInterval(ref.current), []);

  const remaining = Math.max(0, targetSeconds - elapsed);
  const done      = elapsed >= targetSeconds;
  const warn      = remaining < targetSeconds * 0.3 && remaining > 0;
  const crit      = remaining < 30 && remaining > 0;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return { display: `${mm}:${ss}`, running, done, warn, crit, start, reset };
}

// ── Sub-components ────────────────────────────────────────────────

function Qty({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="qty-row">
      {items.map((q, i) => (
        <div key={i} className={`qty-chip${q.unit === 'CRITICAL' ? ' qty-chip--crit' : ''}`}>
          <span className="qty-chip__label">{q.label}</span>
          <span>{q.value}</span>
          {q.unit && q.unit !== 'CRITICAL' && (
            <span style={{ color: 'var(--bone-4)', fontSize: 11 }}>{q.unit}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Timer({ seconds, label }) {
  const t = useTimer(seconds);
  return (
    <div className="step__timer">
      <div>
        <div className="timer__label">{label}</div>
        <div className="timer__display"
             data-warn={t.warn ? '1' : '0'}
             data-crit={t.crit ? '1' : '0'}>
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
  const [checked, setChecked] = useState(() => new Array(items.length).fill(false));
  const toggle = (i) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };
  return (
    <div className="checklist">
      {items.map((item, i) => (
        <div key={i} className="checklist__item" data-checked={checked[i] ? '1' : '0'}
             onClick={() => toggle(i)}>
          <div className="checklist__box">{checked[i] ? '✓' : ''}</div>
          <span className="checklist__label">{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── Step view ─────────────────────────────────────────────────────
function StepView({ layer, step, stepIndex, totalSteps, onPrev, onNext, isLast }) {
  const pct = Math.round(((stepIndex + 1) / (totalSteps + 1)) * 100);

  return (
    <>
      <div className="wiz__progress">
        <div className="wiz__progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="wiz__body">
        <div className="step__meta">
          <span className="step__archetype-badge"
                style={{ color: layer.tagColor, borderColor: layer.accentColor }}>
            {layer.fullName}
          </span>
          <span className="step__counter">Step {stepIndex + 1} of {totalSteps}</span>
        </div>

        <div className="step__card">
          <div className="step__card-hd"
               style={{ borderLeft: `4px solid ${layer.accentColor}` }}>
            <div className="step__number">STEP {String(stepIndex + 1).padStart(2, '0')}</div>
            <div className="step__instruction">{step.title}</div>
            {step.detail && <div className="step__detail">{step.detail}</div>}
          </div>

          <div className="step__card-body">
            {step.warn && (
              <div className="step__warn">
                <span>⚠</span>
                <span>{step.warn}</span>
              </div>
            )}
            {step.quantities && <Qty items={step.quantities} />}
            {step.timer && <Timer seconds={step.timer.seconds} label={step.timer.label} />}
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
function ResultCapture({ layer, onDone }) {
  const [fields, setFields] = useState({
    batchName: '',
    peakTemp:  '',
    peakTime:  '',
    breakMpa:  '',
    failMode:  'none',
    expansion: '',
    colour:    '',
    notes:     '',
  });

  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const isFlint  = layer.id === 'flintS' || layer.id === 'flintE';
  const isMarrow = layer.id === 'marrow';
  const isFuse   = layer.id === 'fuse';

  const save = () => {
    const entry = {
      kind: 'cast',
      note: [
        `Layer: ${layer.fullName}`,
        fields.batchName && `Batch: ${fields.batchName}`,
        fields.peakTemp  && `Exotherm peak: ${fields.peakTemp} °C @ ${fields.peakTime || '?'} min`,
        fields.breakMpa  && `Break: ${fields.breakMpa} MPa — ${fields.failMode}`,
        fields.expansion && `Expansion ratio: ${fields.expansion}×`,
        fields.colour    && `Fuse colour: ${fields.colour}`,
        fields.notes     && `Notes: ${fields.notes}`,
      ].filter(Boolean).join(' | '),
    };
    if (fields.breakMpa) {
      entry.kind = 'break';
      entry.mpa  = parseFloat(fields.breakMpa) || 0;
      entry.mode = fields.failMode;
    }
    CSL.addBenchLog(entry);
    onDone({ fields, layer, batchId: CSL.getActive().id });
  };

  return (
    <>
      <div className="wiz__progress">
        <div className="wiz__progress-fill" style={{ width: '95%' }} />
      </div>
      <div className="wiz__body">
        <div style={{ width: '100%', marginBottom: 8 }}>
          <span className="step__archetype-badge"
               style={{ color: layer.tagColor, borderColor: layer.accentColor,
                        display: 'inline-flex' }}>
            {layer.fullName} · Record Results
          </span>
        </div>

        <div className="result__heading">What did you observe?</div>
        <div className="result__sub">Log the real-world data. It calibrates the model.</div>

        <div className="result__grid">
          <div className="result__field">
            <label className="result__label">Batch name / code</label>
            <input className="result__input" value={fields.batchName}
                   onChange={(e) => set('batchName', e.target.value)}
                   placeholder={`e.g. ${layer.name}-001`} />
          </div>

          <div className="result__field">
            <label className="result__label">Peak exotherm (°C)</label>
            <input className="result__input" type="number" value={fields.peakTemp}
                   onChange={(e) => set('peakTemp', e.target.value)}
                   placeholder="e.g. 72" />
          </div>

          <div className="result__field">
            <label className="result__label">Time to peak (min)</label>
            <input className="result__input" type="number" value={fields.peakTime}
                   onChange={(e) => set('peakTime', e.target.value)}
                   placeholder="e.g. 28" />
          </div>

          {isFlint && (
            <div className="result__field">
              <label className="result__label">Compressive break (MPa)</label>
              <input className="result__input" type="number" step="0.1" value={fields.breakMpa}
                     onChange={(e) => set('breakMpa', e.target.value)}
                     placeholder="e.g. 68.4" />
            </div>
          )}

          {isFuse && (
            <div className="result__field">
              <label className="result__label">Pull-off strength (MPa)</label>
              <input className="result__input" type="number" step="0.1" value={fields.breakMpa}
                     onChange={(e) => set('breakMpa', e.target.value)}
                     placeholder="e.g. 2.1" />
            </div>
          )}

          {isFuse && (
            <div className="result__field">
              <label className="result__label">Fuse colour at application</label>
              <input className="result__input" value={fields.colour}
                     onChange={(e) => set('colour', e.target.value)}
                     placeholder="Pink/salmon · pale · white · other" />
            </div>
          )}

          {isMarrow && (
            <div className="result__field">
              <label className="result__label">Expansion ratio (×)</label>
              <input className="result__input" type="number" step="0.05" value={fields.expansion}
                     onChange={(e) => set('expansion', e.target.value)}
                     placeholder="e.g. 1.8" />
            </div>
          )}

          <div className="result__field">
            <label className="result__label">Failure mode</label>
            <select className="result__input" value={fields.failMode}
                    onChange={(e) => set('failMode', e.target.value)}
                    style={{ cursor: 'pointer' }}>
              <option value="none">No failure / not yet tested</option>
              <option value="brittle">Brittle fracture</option>
              <option value="ductile">Ductile (fiber bridging)</option>
              <option value="delaminated">Delaminated at interface</option>
              <option value="flash-set">Flash set (premature)</option>
              <option value="foam-collapse">Foam collapse (Marrow)</option>
              <option value="crumbled">Crumbled / low cohesion</option>
            </select>
          </div>
        </div>

        <div className="result__field" style={{ width: '100%', marginBottom: 20 }}>
          <label className="result__label">Observations / deviations from protocol</label>
          <textarea className="result__input result__input--wide"
                    value={fields.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Any deviations from protocol, visual observations, anomalies during pour or cure..." />
        </div>

        <div className="step__nav" style={{ width: '100%' }}>
          <button className="nav-btn nav-btn--finish" onClick={save}>
            Save to Batch Log →
          </button>
        </div>
      </div>
    </>
  );
}

// ── Done screen ───────────────────────────────────────────────────
function DoneScreen({ result }) {
  const { fields, layer, batchId } = result;
  return (
    <>
      <div className="wiz__progress">
        <div className="wiz__progress-fill" style={{ width: '100%' }} />
      </div>
      <div className="wiz__body">
        <div className="done__icon">⬡</div>
        <div className="done__title">Batch logged.</div>
        <div className="done__id">{batchId} · {layer.fullName} · {new Date().toISOString().slice(0, 10)}</div>

        <div className="done__summary">
          {[
            ['Layer',        layer.fullName],
            fields.batchName && ['Batch name',    fields.batchName],
            fields.peakTemp  && ['Exotherm peak', `${fields.peakTemp} °C @ ${fields.peakTime || '?'} min`],
            fields.breakMpa  && ['Break load',    `${fields.breakMpa} MPa — ${fields.failMode}`],
            fields.expansion && ['Expansion',     `${fields.expansion}×`],
            fields.colour    && ['Fuse colour',   fields.colour],
            fields.notes     && ['Notes',         fields.notes],
          ].filter(Boolean).map(([k, v], i) => (
            <div key={i} className="done__row">
              <span className="done__k">{k}</span>
              <span className="done__v" style={{ textAlign: 'right', maxWidth: '60%' }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="done__actions">
          <button className="done__btn" onClick={() => window.location.reload()}>
            New Batch
          </button>
          <button className="done__btn" onClick={() => window.open('index.html', '_blank')}>
            Open CSL Dashboard
          </button>
          <button className="done__btn done__btn--primary" onClick={() => window.print()}>
            Print Record
          </button>
        </div>
      </div>
    </>
  );
}

// ── Pick screen ───────────────────────────────────────────────────
function PickScreen({ onPick }) {
  return (
    <>
      <div className="wiz__progress">
        <div className="wiz__progress-fill" style={{ width: '8%' }} />
      </div>
      <div className="wiz__body">
        <div className="pick__prompt">Cairn Synthesis Lab · Batch Protocol Wizard</div>
        <div className="pick__question">Which layer are you casting?</div>
        <div className="pick__hint">
          Select a Cairn layer. The wizard configures quantities, timers,<br />
          and chemistry checks for that specific mix protocol.
        </div>

        <div className="pick__grid">
          {LAYERS.map((l) => (
            <button key={l.id} className="archetype-card"
                    data-color={l.dataColor}
                    onClick={() => onPick(l)}>
              <div className="archetype-card__accent" style={{ background: l.accentColor }} />
              <div className="archetype-card__georock"
                   style={{ color: 'var(--bone-3)' }}>
                {l.fullName}
              </div>
              <div className="archetype-card__name">{l.name}</div>
              <div className="archetype-card__tag"
                   style={{ color: l.tagColor, borderColor: l.tagColor }}>
                {l.tag}
              </div>
              <div className="archetype-card__driver">{l.driver}</div>
              <div className="archetype-card__sauce">{l.sauce}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Root app ──────────────────────────────────────────────────────
function Wizard() {
  const [layer,     setLayer]     = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase,     setPhase]     = useState('pick'); // pick | steps | result | done
  const [result,    setResult]    = useState(null);

  const pick = (l) => { setLayer(l); setStepIndex(0); setPhase('steps'); };
  const back = () => { setLayer(null); setPhase('pick'); setStepIndex(0); };

  const steps  = layer ? layer.steps : [];
  const isLast = layer && stepIndex === steps.length - 1;

  const prev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else back();
  };
  const next = () => {
    if (isLast) setPhase('result');
    else setStepIndex((i) => i + 1);
  };

  const doneCapture = (r) => { setResult(r); setPhase('done'); };

  return (
    <div className="wiz">
      <header className="wiz__header">
        <div className="wiz__logo">
          <div className="wiz__mark" />
          <div>
            <div className="wiz__title">Cairn Synthesis Lab · Batch Wizard</div>
            <div className="wiz__sub">Single-Test Protocol · Fuse: {BIO_SOLUTION.name}</div>
          </div>
        </div>
        {phase !== 'pick' && phase !== 'done' && (
          <button className="wiz__back" onClick={back}>← Change Layer</button>
        )}
        {phase === 'pick' && (
          <a href="index.html"
             style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                      letterSpacing: '0.14em', color: 'var(--bone-4)',
                      textDecoration: 'none', textTransform: 'uppercase' }}>
            ← CSL Dashboard
          </a>
        )}
      </header>

      {phase === 'pick'   && <PickScreen onPick={pick} />}
      {phase === 'steps'  && layer && (
        <StepView
          layer={layer}
          step={steps[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onPrev={prev}
          onNext={next}
          isLast={isLast}
        />
      )}
      {phase === 'result' && layer && (
        <ResultCapture layer={layer} onDone={doneCapture} />
      )}
      {phase === 'done'   && result && <DoneScreen result={result} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Wizard />);
