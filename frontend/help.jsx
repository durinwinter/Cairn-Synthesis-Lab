// help.jsx — CSL Help overlay. Explains each module and the full workflow.
// Exposed as window.HelpOverlay; opened via the ? button in the topbar.

const { useState: helpUseState, useEffect: helpUseEffect } = React;

// ── Content ───────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { n: '01', label: 'Hypothesise',  color: 'var(--flint)',      desc: 'Start in Formulation. Move sliders. Watch the radar shift.' },
  { n: '02', label: 'Simulate',     color: 'var(--retarder)',   desc: 'Kinetic & Interface modules test your formulation against physics.' },
  { n: '03', label: 'Suggest',      color: 'var(--fuse)',       desc: 'Digital Lab proposes DOE variants. Pick the highest-score candidate.' },
  { n: '04', label: 'Make',         color: 'var(--marrow-warm)',desc: 'Batch Wizard guides the physical pour, step by step, layer by layer.' },
  { n: '05', label: 'Measure',      color: 'var(--good)',       desc: 'Bench Entry logs break loads, cure peaks, and failure modes.' },
  { n: '06', label: 'Improve',      color: 'var(--fuse-hot)',   desc: 'Score updates. Clone & Mutate the best batch. Repeat.' },
];

const SECTIONS = [
  {
    id: 'overview',
    title: 'The Cairn Loop',
    icon: '⬡',
    tag: 'START HERE',
    tagColor: 'var(--fuse)',
    body: `CSL is a closed-loop formulation engine. Every action feeds the next. The loop runs:

Hypothesise → Simulate → Suggest → Make → Measure → Improve

A "batch" is the atomic unit — one set of Flint (S), Flint (E), Fuse, and Marrow recipes tied together with seam geometry and environmental conditions. Every slider move, bench entry, and clone lives inside a batch record. Nothing is lost.`,
    tips: [
      'Always start with a batch selected in the sidebar — everything you see is relative to it.',
      'The sidebar stripe colour tells you batch state at a glance: blue = research, amber = bench, green = locked, red = failed.',
      'Clone & Mutate before exploring — never overwrite a batch you might need to compare against.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '00',
    tag: 'OVERVIEW',
    tagColor: 'var(--flint)',
    nav: 'dashboard',
    body: `The dashboard is your mission control. It shows the active batch at a glance: the Pour Pipeline header reads left-to-right through the MKPC reaction stages (Charge → Mix → Pour → Cure → Set), the Master Matrix shows all four layers side-by-side, and the right rail holds the Phase Compass and Performance Radar.

**Pour Pipeline:** the five steps are not navigation — they are a live status strip. The amber "WORKING" step shows where you currently are in the working window. The "% WINDOW" number tells you how much open time remains as a fraction of the predicted working window.

**Master Matrix:** the three-column layout (Flint / Fuse / Marrow) is a read-only snapshot. Click "OPEN SANDBOX →" on any phase column to jump into Formulation with that phase pre-selected.

**Phase Compass:** the triangular balance indicator in the right rail. The amber pin shows where your current batch sits across the Structure / Insulation / Bond triangle. Steer it toward your target zone using the Formulation sliders.

**Performance Radar:** 7-axis normalised score. Each axis is 0–100 against a theoretical maximum. The area enclosed is the overall fitness of the formulation.

**Ternary Plot:** all batches plotted in the MgO–KH₂PO₄–H₂O phase space. The green dashed circle marks the stable struvite-K zone. Points drifting toward the top-left (high MgO) risk flash-set.`,
    tips: [
      'The dashboard is passive — change nothing here. Use it to read state, then navigate to the right module to act.',
      'The cost waterfall tells you which phase is eating your budget. Usually NanoHAp or Basalt Fiber in Flint (S).',
      'The Bench Log feed at the bottom shows the last 6 entries. If it is empty, you have not tested anything yet.',
    ],
  },
  {
    id: 'formulation',
    title: 'Formulation',
    icon: '01',
    tag: 'CHEMISTRY SANDBOX',
    tagColor: 'var(--flint)',
    nav: 'formulation',
    body: `Formulation is where you tune the chemistry. Three phase tabs at the top switch between Flint (S), Flint (E), and Marrow. The Fuse is currently configured through the seam module.

**Flint (S) — Structural Shell:** the Mg/PO₄ slider is the most critical. The green zone (4.5–7.5) is the safe working range. Outside it, flash-set risk appears as a red warning. Borax is your working-window lever — more Borax = longer window but lower peak strength. Basalt Fiber increases toughness (area under the stress-strain curve) but slows pour.

**Flint (E) — Exterior Skin:** higher NanoHAp than Flint (S) for surface hardness. Lower W/B for a denser face layer. The UV-stable pigment is not modelled here — it is handled in the Batch Wizard.

**Marrow — Thermal Core:** H₂O₂ drives porosity and R-value. Perlite adds insulation mass and stabilises the foam. The porosity heatmap updates in real time — watch it as you move the sliders. Borax in Marrow must stay high (7–8 wt%) or the foam will collapse before set.

**Environment card:** ambient temperature and relative humidity shift all three phase predictions simultaneously. A 10 °C temperature rise costs you roughly 4 minutes of working window in Flint and triggers a more violent Marrow exotherm.

**Predicted panel (right):** the dark panel with live values is the model output. Each bar shows the predicted value as a fraction of a reference maximum. Red = outside safe range.`,
    tips: [
      'Move one slider at a time and watch the radar update. Coupling effects (e.g. raising Borax lowers cure peak AND extends working window simultaneously) only make sense when you watch them live.',
      'The stress-strain chart (Flint S) shows the toughening effect of basalt fiber. Toughness = area under curve, not just peak strength.',
      'The cost waterfall at the bottom of each phase shows exactly which ingredient is driving cost. NanoHAp at 40 $/kg dominates fast.',
    ],
  },
  {
    id: 'lab',
    title: 'Digital Lab',
    icon: '02',
    tag: 'DOE + SEARCH',
    tagColor: 'var(--retarder)',
    nav: 'lab',
    body: `Digital Lab is the experiment-design engine. Use it when you have a working baseline batch and want to know what to try next.

**Fit Score:** the large number top-right. 0–100 against your structural objectives. A score above 85 is a strong candidate for physical production. Below 60, keep simulating.

**Structural Objective Checks:** lists every performance target (strength, bond, R-value, cure ceiling, cost) with pass/fail against the current prediction. Red = failing. Sliders at the bottom let you raise or lower targets — useful when you are trading off insulation against structural load.

**Next Experiments (DOE panel):** six automatically generated candidates. Each is a local mutation of the active batch — small perturbations to fiber content, seeds, H₂O₂, seam geometry, etc. Sorted by fit score. "CREATE BATCH" on any card creates it as a real batch in the sidebar and makes it active. Then go to Formulation to examine it.

**Formulation Library:** search and filter all batches. The table shows score, predicted strength, bond, R-value, and cost in a single row. Sort by score to find your best historical formulation instantly.

**Provenance:** every batch records its parent ID and how it was created (seed, clone, active-learning, DOE). This is your genealogy — you can trace any formulation back to its origin.`,
    tips: [
      'Use the Digital Lab after every 3–4 Formulation sessions. It prevents you from hill-climbing manually when a DOE jump could find a better region faster.',
      'Score above 1.0 is possible — it means the formulation exceeds objectives. This is the target before committing to a physical batch.',
      '"High-fit only" checkbox filters to score ≥ 0.75. Use this when searching for a production candidate from historical data.',
    ],
  },
  {
    id: 'kinetic',
    title: 'Kinetic',
    icon: '03',
    tag: 'CURE TIMELINE',
    tagColor: 'var(--retarder)',
    nav: 'kinetic',
    body: `The Kinetic module models the life of a pour from mix to full cure. Use it before any physical batch to check your working window is safe.

**Exotherm curve:** the main chart shows temperature vs. time from mix. The amber line is your current formulation. The green shaded zone left of the peak is the working window — the time you have to pour, place, and consolidate before the matrix starts to set.

**Overlays:** toggle comparison curves on top of the main line.
- "+1.5% Borax bump" shows how much window you gain by adding retarder.
- "Hot pour @ 35 °C" shows the accelerated curve on a hot day — critical for outdoor or summer pours.
- "+1% secondary retarder" is Fuse-specific — models citric/boric acid addition.

**Working Window card:** the adjusted window accounts for your ambient temperature. The rule of thumb is −0.4 min per °C above 22 °C. Below 8 minutes, the warning fires — you need more Borax or a cooler pour environment.

**Kinetic Phases table:** maps the five reaction stages (Induction → Acceleration → Set → Harden → Maturation) to durations and observable signs. Use this as a field reference during an actual pour.`,
    tips: [
      'Always run the "Hot pour @ 35 °C" overlay if you are pouring outdoors. A formulation that works in the lab at 22 °C can flash-set in summer.',
      'The Marrow kinetic model is the most sensitive. Its working window is narrow because H₂O₂ decomposition accelerates with temperature at the same time Borax retardation is being overwhelmed.',
      'Set time (initial) ≈ working window × 1.4. This is when the mold becomes load-bearing for demold.',
    ],
  },
  {
    id: 'interface',
    title: 'Interface',
    icon: '04',
    tag: 'BOND ANALYTICS',
    tagColor: 'var(--fuse)',
    nav: 'interface',
    body: `The Interface module simulates what happens at the Fuse seam — the most failure-prone zone in the assembly.

**Bond Stress Cross-Section:** the wide SVG at the top shows a 60 mm section of the Flint/Fuse/Marrow stack. The stress field overlay uses colour to show load concentration: green-grey = low stress, amber = moderate, red = high. Hover any cell to read the local stress estimate at that point.

**Porosity Heatmap:** shows the Marrow microstructure driven by your H₂O₂ and Perlite values. Dark patches = dense matrix, light patches with circles = open porosity. High porosity near the seam face is the root cause of wicking.

**Wicking Risk panel:** a 0–100 score for how aggressively the Marrow will pull water from wet Fuse grout. Above 65 = high risk — the Fuse will flash-set before crystal penetration can establish a bond. The mitigations are listed inline: +0.5% Borax in Fuse, silane primer on the Marrow face.

**Capillary Path diagram:** shows the physical mechanism — phosphate solution wicking upward from the Fuse layer into the Marrow capillary network. The blue arrows show water movement. More red arrows = higher risk.

**Failure Mode Reference table:** the four most common interfacial failures with cause, visual signature, and the module to go to for mitigation.`,
    tips: [
      'If wicking score > 65, fix the Fuse formulation before making any physical batch. Check Module 01 (Formulation) for Borax increase guidance.',
      'The bond stress heatmap concentrates at the edges of the seam. This is edge-effect stress concentration — fillets in the Seam module reduce it.',
      'Closed-cell fraction in the Marrow affects wicking as much as total porosity. The surfactant dose in Formulation drives this.',
    ],
  },
  {
    id: 'seam',
    title: 'Seam',
    icon: '05',
    tag: 'JOINT GEOMETRY',
    tagColor: 'var(--marrow-warm)',
    nav: 'seam',
    body: `The Seam module is the "joint CAD" layer. It translates your material formulation into a physical joint design with quantified structural and thermal performance.

**Joint Picker:** four profiles — Butt (baseline), Dovetail (mechanical interlock), Ship-lap (tortuous thermal path), Shark Tooth (maximum bite surface). The pull-out factor, surface area multiplier, and thermal path multiplier are shown under each card.

**Section Designer:** a detailed cross-section of the selected joint at your current clearance and bond length settings. Stress risers are shown as translucent red circles — larger = more dangerous. The fillet radius slider smooths corners and dramatically reduces stress concentration at dovetail re-entrant angles.

**Seam Vitals (live analysis):**
- Thermal Path: the ratio of crack-path length to wall thickness. >1.6 = excellent thermal break. <1.15 = the seam is a thermal bridge and will cause condensation ghosting on the interior face.
- Shear Capacity: calculated kN/m at the joint. Compare against your structural load requirement.
- Stress Riser Peak: concentration factor at the worst corner. >2.5 triggers the fillet warning.
- Wicking Risk: same score as in Interface module but now accounts for the joint's contact surface area.

**Export panel:** three format buttons for lab handoff — STL (mold insert for SLA/FDM printing), DXF (CNC routing profile), PDF (printable spec sheet with vitals and Fuse recipe).`,
    tips: [
      'Always add ≥ 2 mm fillet to dovetail and shark-tooth joints. The stress riser at a sharp re-entrant corner can be 2–4× the nominal stress, initiating cracking under thermal cycling.',
      'Ship-lap is the best balance of thermal resistance and simplicity. Use it when the structural load is moderate and the thermal bridge is your main concern.',
      'The "Cost / linear m vs. Butt baseline" shows the real cost of adding joint complexity. A 3× surface area joint uses 3× as much Fuse material.',
    ],
  },
  {
    id: 'wizard',
    title: 'Batch Wizard',
    icon: '⬡',
    tag: 'PHYSICAL POUR',
    tagColor: 'var(--fuse-hot)',
    body: `The Batch Wizard (wizard.html) is the physical-world side of the loop. Open it on a tablet or second screen in the lab. It guides you through one complete pour, step by step, for whichever Cairn layer you are making.

**Layer selection:** choose one of four layers at the start of each session — Flint (S), Flint (E), Marrow, or Fuse. The wizard reconfigures all quantities, timers, and safety checks for that specific layer.

**Step cards:** each step has:
- A plain-language instruction and context
- Quantity chips showing every ingredient with its target amount
- A countdown timer you can start with a tap (colour-warns at 30% remaining, goes red under 30 s)
- A tap-to-check checklist for pre-flight gates
- A Lab Prompt (the voice callout text) explaining the chemistry behind the step

**Fuse — the critical path:** the Fuse protocol is the most safety-critical. Step 1 verifies substrate cure age and surface preparation. Step 2 runs the primer dwell timer (8–10 min minimum). Step 3 checks the Cairn Biocompatible Solution colour — pink/salmon = correct concentration; pale = under-dosed, do not proceed. Step 6 loads the caulking gun cartridge and runs an extrusion test before the seam is committed.

**Result capture:** at the end of the protocol, log what you observed: peak exotherm temperature and time, break load if tested, failure mode, and any deviations. This saves directly to the active batch's bench log — it appears in the Dashboard feed immediately.`,
    tips: [
      'Run the wizard on the batch that is currently active in the dashboard. The batch ID displayed at the done screen confirms the log destination.',
      'For the Fuse, always prime both surfaces before mixing the Fuse itself. The 8–10 minute primer dwell is non-negotiable — start the mix timer only after the dwell timer completes.',
      'If any step has a red warning and you cannot resolve it, stop and return to Formulation or Interface to address the root cause before pouring.',
    ],
  },
  {
    id: 'bench',
    title: 'Bench Entry',
    icon: '+',
    tag: 'LOG RESULTS',
    tagColor: 'var(--alert)',
    body: `The Bench Entry modal (the "+ BENCH" button in the topbar) is where physical reality enters the model. Every time you test a sample, record it here.

**Entry types:**
- CAST — record a pour event (mold filled, date, any observations at cast time)
- CURE — record a cure observation (peak temperature logged, any cracking at demold, cure time)
- BREAK — record a mechanical test result: actual break load in MPa, failure mode (brittle / ductile / delaminated / crumbled)
- NOTE — free-text observation, photo log placeholder

**Delta readout (BREAK entries):** when you enter a break load, the modal immediately computes the gap between your actual result and the model's prediction. A positive delta (actual > predicted) means the model is conservative and the formulation is performing better than expected. A negative delta is an alert — the model is over-predicting and needs recalibration (adjust Borax, W/B, or fiber assumptions in Formulation).

**Measurements:** BREAK entries also create a structured measurement record in the batch's provenance, separate from the bench log feed. This feeds the measured performance panel in Digital Lab.

**Photo log:** drag-and-drop SEM or macro fracture photos. These are stored as data-URLs in localStorage — for large datasets, export to the IP Vault before the browser storage limit is reached.`,
    tips: [
      'Log a CAST entry immediately at pour time, even if you have no data yet. The timestamp matters for calculating cure age when you return for demold or break testing.',
      'Always record the failure mode on BREAK entries. Brittle = low toughness (add fiber). Delaminated = interface failure (check wicking score). Crumbled = over-porous Marrow (reduce H₂O₂).',
      'The Bench Log feed on the dashboard shows the last 6 entries. If you need to review older entries, they are all in the batch\'s JSON record in localStorage.',
    ],
  },
  {
    id: 'batches',
    title: 'Batches & Cloning',
    icon: '≡',
    tag: 'PROVENANCE',
    tagColor: 'var(--concrete-300)',
    body: `The sidebar batch list is your project history. Every batch is a complete formulation snapshot — phases, seam geometry, environment, bench logs, and lineage — stored in your browser's localStorage.

**Batch states:**
- RESEARCH (blue) — formulation in progress, no physical validation yet
- BENCH (amber) — at least one physical pour has been logged
- LOCKED (green) — formulation frozen, validated against objectives. Do not edit.
- FAILED (red) — physical failure logged. Preserved for post-mortem and to prevent repeating the mistake.

**Clone & Mutate:** the amber "+ CLONE" button in the topbar creates an exact copy of the active batch, names it "/ Mutant", resets bench logs, and makes it the active batch. This is the correct way to explore a variation — never edit a batch you might need to compare against. The lineage record tracks which batch it was cloned from.

**Batch state presets (Tweaks panel):** the four preset buttons (Fresh / Mid-Pour / Cured / Failed) in the right rail overwrite the active batch's phases, logs, and status with representative data for that lifecycle stage. Use this to test the UI, not for real data.

**Storage:** all data lives in browser localStorage under the key "csl.v1.state". Use "EXPORT IP VAULT → LOG" to create a permanent record before clearing the browser. There is no cloud sync — if you clear browser data, you lose batch history.`,
    tips: [
      'Keep a naming convention: "B-001 · Coastal Panel · 28d" tells you the batch ID, application, and cure age at a glance.',
      'When a batch fails, set it to FAILED and write a detailed NOTE entry explaining the failure mode. This is your institutional memory.',
      'The Digital Lab search treats batch names, notes, and tags as a searchable index. Tag your batches (e.g. "exterior", "structural", "prototype") for fast retrieval.',
    ],
  },
  {
    id: 'ipvault',
    title: 'IP Vault',
    icon: '↑',
    tag: 'EXPORT',
    tagColor: 'var(--concrete-300)',
    body: `The IP Vault (the "PRINT LAB SHEET" / "EXPORT IP VAULT" buttons in the right rail) generates a print-ready formulation reference sheet for the active batch.

**Contents:** the exported sheet includes all four phase recipes (with non-zero ingredients only), predicted performance (compressive, flexural, bond shear, R-value, work window, density, cost), the seam profile, and a unique signature code for version tracking.

**Use cases:**
- Patent / IP filing: the timestamp and signature code establish a dated record of the formulation.
- Lab handoff: print and clip to the mold — the technician has every quantity without needing the app.
- Production specification: lock a batch (set status to LOCKED), export the vault, file it. If anyone asks what went into a panel three years from now, the answer is here.

**EXPORT + LOG button:** clicking this exports and simultaneously creates a NOTE bench entry recording the export timestamp. This means your batch history shows exactly when each version of the spec sheet was issued.`,
    tips: [
      'Only export from a LOCKED batch for official use. A RESEARCH batch formulation may still change.',
      'The print stylesheet uses the Newsreader serif font for the document body — it looks like a proper lab record when printed.',
      'The SIG code at the bottom is batch-ID + a 6-character base-36 timestamp hash. It is not cryptographically secure, but it is unique enough to identify a specific export event.',
    ],
  },
];

// ── Components ────────────────────────────────────────────────────

function WorkflowDiagram() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 0,
      background: 'var(--basalt-deep)',
      border: '1px solid var(--ink)',
      borderRadius: 'var(--r-sm)',
      overflow: 'hidden',
      marginBottom: 28,
    }}>
      {WORKFLOW_STEPS.map((s, i) => (
        <div key={i} style={{
          padding: '14px 14px 12px',
          borderRight: i < WORKFLOW_STEPS.length - 1 ? '1px solid var(--rule-dark-2)' : 'none',
          borderLeft: `3px solid ${s.color}`,
          position: 'relative',
        }}>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            color: s.color,
            marginBottom: 4,
            fontWeight: 700,
          }}>{s.n}</div>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--bone-1)',
            letterSpacing: '-0.01em',
            marginBottom: 6,
          }}>{s.label}</div>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--bone-3)',
            lineHeight: 1.5,
            letterSpacing: '0.02em',
          }}>{s.desc}</div>
          {i < WORKFLOW_STEPS.length - 1 && (
            <div style={{
              position: 'absolute',
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              color: 'var(--bone-4)',
            }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionNav({ active, onSelect }) {
  return (
    <nav style={{
      width: 200,
      flexShrink: 0,
      borderRight: '1px solid var(--rule-dark-2)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      padding: '8px 0',
    }}>
      {SECTIONS.map((s) => (
        <button key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            appearance: 'none',
            background: active === s.id ? 'rgba(196,117,58,0.12)' : 'transparent',
            border: 'none',
            borderLeft: `3px solid ${active === s.id ? 'var(--fuse)' : 'transparent'}`,
            padding: '9px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
          <span style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: active === s.id ? 'var(--fuse-hot)' : 'var(--bone-4)',
            width: 20,
            flexShrink: 0,
          }}>{s.icon}</span>
          <span style={{
            fontSize: 12,
            fontWeight: active === s.id ? 700 : 500,
            color: active === s.id ? 'var(--bone-1)' : 'var(--bone-3)',
            letterSpacing: '0.02em',
          }}>{s.title}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionBody({ section }) {
  if (!section) return null;

  const lines = section.body.split('\n\n');

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: section.tagColor,
          marginBottom: 6,
        }}>{section.tag}</div>
        <div style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--bone-1)',
          lineHeight: 1.1,
          marginBottom: 4,
        }}>
          {section.icon !== section.title[0] && (
            <span style={{ color: section.tagColor, marginRight: 10 }}>{section.icon}</span>
          )}
          {section.title}
        </div>
        {section.nav && (
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--bone-4)',
            letterSpacing: '0.10em',
          }}>Navigate: top nav → {section.nav.toUpperCase()}</div>
        )}
      </div>

      {/* Workflow diagram only on overview */}
      {section.id === 'overview' && <WorkflowDiagram />}

      {/* Body text */}
      <div style={{ marginBottom: 20 }}>
        {lines.map((para, i) => {
          if (para.startsWith('**') && para.includes(':**')) {
            const colonIdx = para.indexOf(':**');
            const heading = para.slice(2, colonIdx);
            const rest = para.slice(colonIdx + 3).trim();
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--bone-2)',
                  marginBottom: 4,
                }}>{heading}</div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--bone-2)',
                  lineHeight: 1.65,
                }}>{rest}</div>
              </div>
            );
          }
          return (
            <p key={i} style={{
              fontSize: 13,
              color: 'var(--bone-2)',
              lineHeight: 1.65,
              margin: '0 0 12px',
            }}>{para}</p>
          );
        })}
      </div>

      {/* Tips */}
      {section.tips && section.tips.length > 0 && (
        <div style={{
          background: 'rgba(196,117,58,0.08)',
          border: '1px solid rgba(196,117,58,0.25)',
          borderLeft: '3px solid var(--fuse)',
          padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.20em',
            color: 'var(--fuse-hot)',
            marginBottom: 10,
          }}>FIELD NOTES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {section.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  color: 'var(--fuse)',
                  flexShrink: 0,
                  marginTop: 2,
                }}>▸</span>
                <span style={{
                  fontSize: 12,
                  color: 'var(--bone-3)',
                  lineHeight: 1.6,
                }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overlay ───────────────────────────────────────────────────────

function HelpOverlay({ onClose }) {
  const [active, setActive] = helpUseState('overview');
  const section = SECTIONS.find((s) => s.id === active);

  helpUseEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(12,13,16,0.72)',
      backdropFilter: 'blur(6px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 'min(1100px, 96vw)',
        height: 'min(780px, 92vh)',
        background: 'var(--basalt)',
        backgroundImage: 'var(--noise)',
        border: '1px solid var(--ink)',
        borderRadius: 'var(--r-sm)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'var(--basalt-deep)',
          borderBottom: '1px solid var(--rule-dark-2)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--bone-4)',
              marginBottom: 2,
            }}>CAIRN SYNTHESIS LAB</div>
            <div style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'var(--bone-1)',
            }}>How to Use CSL</div>
          </div>
          <button onClick={onClose} style={{
            appearance: 'none',
            background: 'transparent',
            border: '1px solid var(--rule-dark-2)',
            color: 'var(--bone-3)',
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            padding: '7px 14px',
            cursor: 'pointer',
          }}>✕ CLOSE</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <SectionNav active={active} onSelect={setActive} />
          <SectionBody section={section} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--rule-dark-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9.5,
            color: 'var(--bone-4)',
            letterSpacing: '0.10em',
          }}>
            {SECTIONS.findIndex((s) => s.id === active) + 1} of {SECTIONS.length} · Press ESC to close
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {SECTIONS.findIndex((s) => s.id === active) > 0 && (
              <button onClick={() => {
                const i = SECTIONS.findIndex((s) => s.id === active);
                setActive(SECTIONS[i - 1].id);
              }} style={{
                appearance: 'none', background: 'transparent',
                border: '1px solid var(--rule-dark-2)',
                color: 'var(--bone-3)', fontFamily: 'var(--f-mono)',
                fontSize: 10, letterSpacing: '0.10em', padding: '6px 12px', cursor: 'pointer',
              }}>← PREV</button>
            )}
            {SECTIONS.findIndex((s) => s.id === active) < SECTIONS.length - 1 && (
              <button onClick={() => {
                const i = SECTIONS.findIndex((s) => s.id === active);
                setActive(SECTIONS[i + 1].id);
              }} style={{
                appearance: 'none',
                background: 'var(--fuse)', color: '#fff',
                border: '1px solid var(--fuse-deep)',
                fontFamily: 'var(--f-mono)',
                fontSize: 10, letterSpacing: '0.10em', padding: '6px 12px', cursor: 'pointer',
              }}>NEXT →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HelpOverlay });
