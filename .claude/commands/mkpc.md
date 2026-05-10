# MKPC Bioceramic: Flint / Fuse / Marrow

## System Overview

**Base chemistry:** Magnesium Potassium Phosphate Cement (MKPC)

- **Reaction:** MgO + KH₂PO₄ + H₂O → MgKPO₄·6H₂O (struvite-K) + heat
- **Retarder:** borax (Na₂B₄O₇), typically 4–8 wt% of MgO mass
- **Binder phase:** struvite-K — crystalline, low-shrinkage, rapid-setting, biocompatible
- **Cure:** ambient temperature; majority of strength in 1–3 h; full at 24 h

**Workflow:** Precast assembly — Flint and Marrow are cast and cured independently, then joined with wet Fuse grout. Not a monolithic pour. The Fuse manages cold joints between fully hydrated, dimensionally stable precast bodies. This changes almost every design assumption.

| Layer | Role | Key Metric | Active Edge |
|-------|------|------------|-------------|
| Flint | Dense load-bearing shell | 132 MPa flex strength | Basalt fiber sizing compatibility & crack-tip blunting |
| Fuse | Structural grout / cold joint | Bond strength + workability | Water theft prevention + thixotropy + shrinkage control |
| Marrow | Open-cell thermal core | λ < 0.15 W/m·K | Bubble size distribution (surfactant + H₂O₂ in MKPC) |

**Primary co-assembly risk:** Both precast Flint and Marrow will aggressively pull water from wet Fuse grout via capillary suction — Flint by dense matrix capillaries, Marrow by open perlite/void network. The Fuse must be formulated and the interfaces must be primed to prevent flash-set before chemical adhesion develops.

---

## MKPC Chemistry Fundamentals

### Reaction kinetics and control levers

- **MgO reactivity:** dead-burned MgO (1400–1800 °C) = slow; lightly calcined (900–1100 °C) = fast. Select grade to match layer processing window.
- **Borax dose (wt% of MgO):** primary open-time control. Borax chelates Mg²⁺, coating MgO particles, delaying struvite-K nucleation.
  - Flint: 5–6 wt% (dense cast, moderate open time)
  - Fuse: 6–7 wt% (seam work, longer open time needed)
  - Marrow: 7–8 wt% (foam must expand fully before gel locks structure)
- **Mg:P molar ratio:** stoichiometric = 1:1; in practice 3:1–5:1 by mass (excess MgO ensures complete phosphate consumption, avoids free acid). High excess MgO acts as mild filler and potential delayed expansion agent.
- **w/b ratio:** 0.16–0.22 for Flint (dense); 0.25–0.35 for Fuse (workable); 0.28–0.38 for Marrow (foamable slurry)

### Nano-hydroxyapatite (nHA) as kinetic trigger in Fuse

- nHA (Ca₁₀(PO₄)₆(OH)₂) seeded into Fuse at 0.5–1.5 wt% provides phosphate nucleation sites at the cold joint interface
- Accelerates struvite-K crystal growth specifically at the bond face, compensating for the water-depleted interface environment
- Above ~2 wt%: competes with MgO for phosphate; net matrix strength drops

---

## Layer 1: Flint

### Composition

- MKPC binder: Mg:P ~4:1 by mass, borax 5–6 wt% of MgO
- Reinforcement: chopped basalt fiber, 6–12 mm, ~13 µm diameter, 3–6 vol%
- w/b: 0.16–0.20
- Target: flexural strength ≥ 132 MPa (ASTM C1161, 3-point bend); porosity < 5%

### Active Edge: Basalt Fiber Sizing in Phosphate Matrix

Commercial basalt sizing is optimized for polymer or Portland cement (pH > 12). MKPC operates at pH 6–8, phosphate-rich. Key risks:

- Silane coupling agents in sizing may hydrolyze differently at low pH
- Phosphate environment may react with sizing residues → over-bonded interface (fibers snap rather than pull out, eliminating toughening)
- Free H₃PO₄ (if Mg:P < 3:1) can etch basalt glass — keep Mg:P ≥ 3:1

**Crack-tip blunting target:** Γᵢ/Γₘ < 0.25 (fiber bridging over fiber fracture). MKPC matrix is relatively compliant (E ~15–30 GPa vs. basalt E ~89 GPa) — stiffness mismatch favors crack deflection, but struvite-K crystal intergrowth onto fiber surface during hydration can chemically lock the interface.

**Sizing compatibility checklist (MKPC):**

- [ ] TGA of as-received fiber: burnout peak temp, residue wt%
- [ ] Immerse fiber in 0.1 M KH₂PO₄ solution 24 h; SEM/EDS for surface attack
- [ ] Cast fiber witness bars in MKPC; cure 24 h; single-fiber push-out test
- [ ] 3-point bend: 0, 3, 6 vol% fiber, as-received vs. phosphoric-acid-washed
- [ ] Fracture surface SEM: target pull-out > 2× fiber diameter (~26 µm)

**Remediation if sizing incompatible:**

- Pre-wash in 0.1 M H₃PO₄ (10 min) — removes sizing, deposits phosphate passivation layer chemically compatible with MKPC matrix
- Sol-gel BN or carbon interphase — decouples fiber mechanically
- Size-free basalt rovings cut in-house

### PROTOCOL: Flint-01 — Fiber Interface Characterization

```
Layer:     Flint
Objective: Determine optimal fiber vol% and sizing treatment for K_IC
           maximization and pull-out-dominated fracture in MKPC.
Materials: MgO, KH₂PO₄, borax, basalt fiber (as-received + pre-washed),
           distilled water, 0.1 M H₃PO₄
Equipment: Molds (45×4×3 mm bars), 0.3 mm diamond blade, universal test
           frame, SEM/EDS
Steps:
  1. Paste: w/b=0.18, Mg:P=4:1, borax=5.5 wt%
  2. Fiber: 0, 2, 4, 6 vol% × (as-received / H₃PO₄-washed) = 8 conditions
  3. Cast bars; demold 2 h; cure 24 h at 23 °C, 95% RH
  4. Pre-notch 1.0 mm deep × 0.3 mm wide; 3-point bend at 0.5 mm/min
  5. Compute K_IC (SENB); SEM fracture surface for pull-out length
Acceptance: K_IC > 0.8 MPa·m⁰·⁵; pull-out > 26 µm; strength ≥ 132 MPa
Failure modes: flush-fracture fibers (over-bonded); strength < unreinforced
  (sizing contaminating matrix)
Data to log: batch_id, fiber_vol_pct, sizing_treatment, w_b_ratio,
  borax_wt_pct, cure_age_h, flexural_strength_MPa, K_IC_MPa_m05,
  pullout_length_um, failure_mode
```

---

## Layer 2: Fuse (Structural Grout)

### Composition

- MKPC: Mg:P ~3:1 (phosphate-richer than Flint for better surface wetting)
- Borax: 6–7 wt% (longer open time for seam work)
- nHA: 0.5–1.5 wt% (nucleation trigger at cold interfaces)
- Fumed silica (Aerosil 200): 0.5–1.0 wt% OR HPMC: 0.3–0.6 wt%
- Optional: chopped basalt fiber 3 mm, 1–2 vol% (CTE matching, crack arrest)
- Seam thickness: 3–6 mm

### Active Edge A: Water Theft Prevention

**Mechanisms:**
- Flint side: dense capillaries suck water → incomplete struvite-K intergrowth at bond face → "dry joint," low pull-off strength
- Marrow side: open perlite/H₂O₂ voids act as sponge → Fuse flash-sets before chemical adhesion can develop; weak porous zone left at interface

**Priming strategy** (apply 5–10 min before Fuse):

| Primer | Application | Mechanism | Notes |
|--------|-------------|-----------|-------|
| 0.05–0.1 M H₃PO₄ wash | Brush coat | Saturates pores with phosphate-compatible fluid; chemically continuous with incoming Fuse | Preferred |
| Thin retarded MKPC slurry (w/b ~0.35, high borax) | Brush coat; wait until tacky | Seeds nucleation sites; reduces suction gradient | Good for Flint face |
| SSD water pre-wet | Wet surface to saturated surface dry | Reduces capillary suction only | Fallback; dilutes interface chemistry |

**Do not use plain water as primary primer** — dilutes KH₂PO₄ at interface, weakens struvite-K nucleation precisely where bond is needed most.

**Diagnostic — water theft rate test:**
- 5 mm Fuse slab onto primed vs. unprimed Marrow substrate
- Weigh every 60 s for 20 min; target <12% water loss in first 10 min
- SEM cross-section at 24 h: look for porous or crystal-depleted zone within 0.5 mm of interface

### Active Edge B: Thixotropy for Seam Application

**Target:** yield stress ≥ 200 Pa at rest; viscosity at 50 s⁻¹ < 5 Pa·s

| Additive | Dose | Mechanism | Risk |
|----------|------|-----------|------|
| Fumed silica (Aerosil 200) | 0.5–1.0 wt% | H-bonded network, thixotropic recovery | Accelerates set if >1 wt% |
| HPMC | 0.3–0.6 wt% | Water retention + yield stress | Slight air entrainment |
| Attapulgite clay | 0.5–1.5 wt% | Particle network | Minor phase impurity risk |

Note: high borax (6–7 wt%) deflocculates MgO and lowers early viscosity — fumed silica compensates, giving the target high-borax / high-body window.

### Active Edge C: Differential Shrinkage in Confined Seam

MKPC shrinkage: 0.01–0.05% (low, but non-zero in a rigid 3–6 mm cavity). Precast Flint and Marrow walls are fixed; Fuse shrinkage pulls away from walls → micro-gaps → thermal and structural failure.

**Mitigation:**
- Slight excess MgO (Mg:P above stoichiometric) — residual MgO can slowly re-hydrate, providing mild compensating expansion
- Fine reactive MgO expansion agent: 1–2 wt% (controlled delayed expansion)
- HPMC water retention: reduces drying-amplified shrinkage

**CTE mismatch / spalling risk:**
- Basalt-fiber Flint CTE: ~8–10 µm/m·°C
- Neat MKPC Fuse CTE: ~12–15 µm/m·°C
- At ΔT = 40 °C (sunlight cycling): ~0.2 mm/m differential per linear meter
- Fix: 1–2 vol% chopped 3 mm basalt fiber in Fuse lowers Fuse CTE toward Flint

### Seam Geometry

| Feature | Recommendation | Why |
|---------|---------------|-----|
| Flint interface | Dovetail or keyway (5–10 mm) | Mechanical lock independent of chemical bond |
| Marrow interface | Scarify (wire brush / coarse grit) | Exposes perlite; Fuse roots into texture |
| Fuse thickness | 3–6 mm | <3: de-waters too fast; >6: exotherm risk + excess thermal bridge |
| Seam path | Z-joint or ship-lap | Breaks straight-through thermal bridge; increases path length 3–5× |

**Thermal bridge:** neat MKPC Fuse λ ~0.5–0.8 W/m·K. A straight-through seam short-circuits Marrow's λ < 0.15 W/m·K. Z-joint geometry multiplies effective path length and dramatically reduces linear thermal transmittance (Ψ, W/m·K).

### PROTOCOL: Fuse-01 — Cold Joint Bond Strength & Water Theft

```
Layer:     Fuse / Flint substrate / Marrow substrate
Objective: Optimize Fuse formulation for bond strength and water theft
           resistance at both interfaces.
Materials: MgO, KH₂PO₄, borax, fumed silica, HPMC, nHA, 0.1 M H₃PO₄,
           precast Flint slabs (150×75×20 mm), precast Marrow slabs
           (150×75×30 mm, scarified face)
Equipment: Rheometer, balance (±0.1 g), pull-off tester (ASTM C1583,
           50 mm dolly), SEM
Steps:
  1. 6-condition matrix: fumed silica (0, 0.5, 1.0 wt%) × primer
     (none, H₃PO₄ wash)
  2. Rheology: yield stress (stress ramp 0→500 Pa); viscosity at 50 s⁻¹
  3. Prime substrate (or not); wait 8 min; apply 5 mm Fuse
  4. Weigh assembly every 60 s for 20 min
  5. Cure 24 h; pull-off test at 48 h
  6. SEM cross-section: crystal density within 0.5 mm of each interface
Acceptance: pull-off > 1.5 MPa cohesive; de-water < 12% at 10 min;
  yield stress > 200 Pa; no depletion zone (SEM)
Failure modes: adhesive failure at Flint face (dry joint); cohesive near
  Marrow face (flash-set zone); sagging during application
Data to log: batch_id, fumed_silica_wt_pct, hpmc_wt_pct, nha_wt_pct,
  borax_wt_pct, primer_type, yield_stress_Pa, viscosity_50s_Pas,
  dewater_10min_pct, pulloff_strength_MPa, failure_mode, cure_age_h
```

---

## Layer 3: Marrow

### Composition

- MKPC binder: lightly calcined MgO (slower-reacting grade), Mg:P ~4:1, borax 7–8 wt% (critical: foam must fully expand before gel locks)
- Perlite: ~40 vol% of mix (thermal insulation, open surface texture)
- Foaming: protein surfactant (hydrolyzed keratin or casein preferred) + H₂O₂ (1–4 wt% of slurry mass)
- w/b: 0.28–0.38
- Target: λ < 0.15 W/m·K; porosity 60–80%; open-cell fraction > 70%

### Active Edge: Bubble Size Distribution in MKPC

MKPC-specific challenge: the setting exotherm accelerates H₂O₂ decomposition. Foam must expand and stabilize before struvite-K crystallization locks the matrix. Processing window is narrower than in Portland or geopolymer foam — borax dose in Marrow is the primary window control lever.

Synthetic anionic surfactants may interact adversely with phosphate ions (ion-exchange adsorption onto KH₂PO₄ crystals reduces effective surfactant concentration). Always determine CMC in actual KH₂PO₄ solution, not in plain water.

| Variable | Increase effect | Decrease effect | MKPC note |
|----------|----------------|----------------|-----------|
| H₂O₂ wt% (1–4%) | Higher porosity, larger D50 | Denser, smaller cells | >4%: collapse risk before gel |
| H₂O₂ addition timing | — | — | Add after mix but before gel onset; late = uneven |
| Surfactant wt% | Finer cells up to CMC; plateau above | Coalescence, coarse cells | Re-determine CMC in KH₂PO₄ solution |
| Borax dose (Marrow) | Longer expansion window | — | Must not over-retard; foam collapses if set too delayed |
| Perlite content | Higher slurry viscosity → stabilizes foam | Impedes H₂O₂ nucleation | 40 vol% is approximate optimum |
| Mix temperature | Faster H₂O₂ decomp | Finer cells, longer window | Prefer 15–20 °C |

**Target cell size:** D50 = 300–700 µm; polydispersity index < 0.4

**Surface prep for Fuse bonding:** do not apply release agent to bonding faces of Marrow molds. After cure, scarify with wire brush to expose perlite aggregate. Fuse must root into this open texture.

### PROTOCOL: Marrow-01 — Foam Optimization Matrix

```
Layer:     Marrow
Objective: Define H₂O₂ and surfactant levels giving D50 = 300–700 µm
           and λ < 0.15 W/m·K in MKPC-perlite foam.
Materials: MgO (lightly calcined), KH₂PO₄, borax (7.5 wt%),
           expanded perlite, protein surfactant, H₂O₂ (diluted to 10%),
           distilled water
Equipment: Planetary mixer, cylindrical molds (50 mm dia × 100 mm),
           thermal conductivity meter (hot-disk), optical microscope,
           image analysis software
Steps:
  1. Base: Mg:P=4:1, w/b=0.32, perlite=40 vol%, borax=7.5 wt%
  2. 3×3 matrix: H₂O₂ [1, 2.5, 4 wt%] × surfactant [0.3, 0.8, 1.5 wt%]
  3. Mix MgO + KH₂PO₄ + borax + water + surfactant: 90 s
  4. Add perlite; 30 s mix
  5. Add H₂O₂ (10% dilution); 20 s low-speed mix; pour immediately
  6. Record: time to peak rise, expansion ratio
  7. Demold at 2 h; cure 24 h; core-drill 3 specimens per condition
  8. Thermal conductivity measurement
  9. Polish face; image at 20×; watershed → D10, D50, D90, PDI
Acceptance: λ < 0.15 W/m·K; D50 = 300–700 µm; PDI < 0.4;
  expansion ratio > 1.5×; no collapse before 10 min
Failure modes: foam collapse (surfactant below CMC in phosphate medium;
  over-fast set); bimodal distribution (uneven H₂O₂ addition); D90 >> D50
  (coalescence)
Data to log: batch_id, h2o2_wt_pct, surfactant_wt_pct, surfactant_type,
  borax_wt_pct, perlite_vol_pct, mix_temp_C, rise_time_s,
  expansion_ratio, thermal_conductivity_W_mK, D10_um, D50_um, D90_um,
  polydispersity_index, open_cell_fraction_pct
```

---

## Assembly Integration

### Recommended sequence

1. Cast and cure Flint (24–48 h); machine dovetail/keyway in bond face if not cast-in
2. Cast and cure Marrow (24–48 h); scarify bond face after cure
3. Prime both surfaces: 0.05–0.1 M H₃PO₄ brush coat; wait 8–10 min
4. Mix Fuse; verify yield stress (slump or rheometer)
5. Pack seam; consolidate to eliminate voids; do not over-vibrate
6. Cure in place 24 h; protect from drying (damp cloth cover)

### Failure mode lookup

| Symptom | Cause | Layer | First action |
|---------|-------|-------|-------------|
| Strength << 132 MPa; no fiber pullout | Sizing over-bonded in phosphate | Flint | H₃PO₄ fiber pre-wash; push-out test |
| Friable bond at Flint/Fuse face | Water theft; no primer | Fuse | Implement H₃PO₄ primer; re-test pull-off |
| Fuse flash-sets before seam filled | Marrow de-watering; borax too low | Fuse | Raise borax to 7 wt%; prime Marrow surface |
| Fuse sags in vertical seam | Yield stress too low | Fuse | Fumed silica to 0.75–1.0 wt% |
| Gap / Fuse pulls from walls after cure | Net shrinkage in rigid cavity | Fuse | Add fine reactive MgO 1–2 wt% |
| Spalling at seam edge after thermal cycling | CTE mismatch Flint vs. Fuse | Fuse | Add 1–2 vol% 3 mm basalt fiber to Fuse |
| Marrow foam collapse before set | Surfactant below CMC in phosphate; set too fast | Marrow | Re-determine CMC; raise borax |
| Bimodal cell size in Marrow | H₂O₂ added fast or unevenly | Marrow | Dilute to 10%; slow final mix step |
| Thermal bridging / condensation ghosting | Straight-through seam | Assembly | Redesign as Z-joint or ship-lap |

---

## Data & Pipeline Integration

**Stack:** TypeDB · TimescaleDB · Materialize · Zenoh · Rust

- **TypeDB:** phase ontology, protocol lineage, compositional relationships
- **TimescaleDB:** cure profiles, dilatometry, thermal conductivity time-series
- **Materialize:** real-time views across batch matrix runs
- **Zenoh:** instrument transport (thermocouple, rheometer, thermal camera)
- **Rust:** pipeline component implementation

**TypeDB entity types:**

```
MKPCFormulation    (layer, mg_p_ratio, borax_wt_pct, w_b_ratio, batch_id)
CureProfile        (time_h, temp_C, rh_pct, strength_gain_pct)
MechanicalTestResult (flexural_strength_MPa, K_IC, Weibull_modulus)
FoamCharacterization (D50_um, polydispersity, open_cell_pct, conductivity_W_mK)
ColdJointTest      (relates Fuse↔Flint, Fuse↔Marrow; pulloff_MPa,
                    failure_mode, primer_type)
SeamGeometry       (type, thickness_mm, path_geometry, CTE_delta_um_mK)
```
