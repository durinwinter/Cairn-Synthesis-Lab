# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

Cairn Synthesis Lab is the research and data pipeline workspace for the **MKPC Bioceramic** project — a three-layer structural/thermal composite using Magnesium Potassium Phosphate Cement (MKPC). The three layers are:

- **Flint** — dense basalt-fiber-reinforced load-bearing shell (target: ≥132 MPa flex strength)
- **Fuse** — structural grout managing cold joints between precast Flint and Marrow bodies
- **Marrow** — open-cell perlite/H₂O₂ foam thermal core (target: λ < 0.15 W/m·K)

The full material specification, formulation parameters, experimental protocols (Flint-01, Fuse-01, Marrow-01), and failure mode reference are in the `/mkpc` custom command — run `/mkpc` in Claude Code to load it into context.

## Planned Data Stack

Pipeline components are implemented in **Rust**. The intended architecture:

| Component | Role |
|-----------|------|
| **TypeDB** | Phase ontology, protocol lineage, compositional entity graph |
| **TimescaleDB** | Time-series: cure profiles, dilatometry, thermal conductivity logs |
| **Materialize** | Streaming views over batch matrix run results |
| **Zenoh** | Instrument transport layer (thermocouple, rheometer, thermal camera) |

### TypeDB schema entities (planned)
```
MKPCFormulation     — layer, mg_p_ratio, borax_wt_pct, w_b_ratio, batch_id
CureProfile         — time_h, temp_C, rh_pct, strength_gain_pct
MechanicalTestResult — flexural_strength_MPa, K_IC, Weibull_modulus
FoamCharacterization — D50_um, polydispersity, open_cell_pct, conductivity_W_mK
ColdJointTest       — relates Fuse↔Flint and Fuse↔Marrow; pulloff_MPa, failure_mode, primer_type
SeamGeometry        — type, thickness_mm, path_geometry, CTE_delta_um_mK
```

Data logged per protocol run is specified in the `/mkpc` command under each `Data to log:` field — use those field names as canonical column/attribute names throughout the pipeline.

## Key Domain Constraints

- **Precast assembly, not monolithic pour.** Flint and Marrow cure independently before Fuse is applied. Every interface decision assumes fully hydrated, dimensionally stable substrates on both sides of the Fuse seam.
- **Water theft is the primary co-assembly failure mode.** Both Flint and Marrow actively pull water from wet Fuse grout. Interface priming (0.05–0.1 M H₃PO₄ brush coat) is non-optional, not a tuning parameter.
- **Borax dose is the primary open-time lever** for each layer (Flint 5–6 wt%, Fuse 6–7 wt%, Marrow 7–8 wt% of MgO mass). Changes to borax dose affect everything downstream — rheology, foam expansion window, crystal growth rate at cold joints.
- **CMC of surfactants must be determined in KH₂PO₄ solution**, not plain water — phosphate ions suppress effective surfactant concentration. Plain-water CMC values are not transferable.
- **TypeQL** is the query language for TypeDB. Use the `/typeql` skill when writing or debugging TypeDB schema or queries.
