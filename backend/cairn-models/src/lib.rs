pub mod mechanics;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Environment {
    #[serde(alias = "tempC")]
    pub temp_c: f64,
    pub humidity: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FlintParams {
    #[serde(alias = "MgPO4")]
    pub mg_po4: f64,
    #[serde(alias = "Borax")]
    pub borax: f64,
    #[serde(alias = "BasaltFiber")]
    pub basalt_fiber: f64,
    #[serde(alias = "NanoHAp")]
    pub nano_hap: f64,
    #[serde(alias = "WB")]
    pub wb: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FlintPrediction {
    pub comp: f64,
    pub flex: f64,
    pub e_modulus: f64,
    pub density: f64,
    pub therm: f64,
    pub cure_peak: f64,
    pub flash: bool,
    pub work_min: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FuseParams {
    #[serde(alias = "MgPO4")]
    pub mg_po4: f64,
    #[serde(alias = "Borax")]
    pub borax: f64,
    #[serde(alias = "Retarder")]
    pub retarder: f64,
    #[serde(alias = "Seeds")]
    pub seeds: f64,
    #[serde(alias = "Thixo")]
    pub thixo: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FusePrediction {
    pub bond: f64,
    pub tensile: f64,
    pub work_min: f64,
    pub cure_peak: f64,
    pub viscosity: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MarrowParams {
    #[serde(alias = "MgPO4")]
    pub mg_po4: f64,
    #[serde(alias = "Borax")]
    pub borax: f64,
    #[serde(alias = "H2O2")]
    pub h2o2: f64,
    #[serde(alias = "Perlite")]
    pub perlite: f64,
    #[serde(alias = "Surfactant")]
    pub surfactant: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MarrowPrediction {
    pub porosity: f64,
    pub density: f64,
    pub r_value: f64,
    pub therm: f64,
    pub comp: f64,
}

pub fn clamp(val: f64, min: f64, max: f64) -> f64 {
    if val < min {
        min
    } else if val > max {
        max
    } else {
        val
    }
}

pub fn round_to(val: f64, decimal_places: i32) -> f64 {
    let factor = 10.0_f64.powi(decimal_places);
    (val * factor).round() / factor
}

pub fn predict_flint(p: &FlintParams, env: &Environment) -> FlintPrediction {
    let fiber = p.basalt_fiber;
    let ratio_off = (p.mg_po4 - 6.0).abs();
    let flash = ratio_off > 1.8;

    // Utilize basic composite bounds from mechanics module to influence E-modulus
    // Assume Matrix E is ~10 GPa, Basalt fiber is ~89 GPa
    let v_f = fiber / 100.0;
    let bounds = mechanics::voigt_reuss_hill(v_f, 89.0, 10.0);
    // Let's use a weighted approach incorporating nano_hap and the theoretical Hill average
    let e_modulus = 13.5 + 0.15 * bounds.hill + 0.45 * p.nano_hap;

    let comp = 52.0 + 7.2 * fiber + 4.0 * p.nano_hap - 6.5 * ratio_off - 18.0 * (p.wb - 0.22);
    let flex = 7.5 + 1.4 * fiber + 1.8 * p.nano_hap - 1.2 * ratio_off;
    let density = 2.10 + 0.04 * fiber + 0.025 * p.nano_hap - 0.6 * (p.wb - 0.22);
    let therm = 1.10 + 0.06 * fiber;

    let cure_peak = 68.0 + 8.0 * ratio_off - 5.2 * p.borax + 0.4 * (env.temp_c - 22.0);
    let work_min = 8.0 + 6.5 * p.borax - 0.4 * (env.temp_c - 22.0);

    FlintPrediction {
        comp: clamp(round_to(comp, 1), 10.0, 140.0),
        flex: clamp(round_to(flex, 1), 1.0, 30.0),
        e_modulus: clamp(round_to(e_modulus, 1), 4.0, 35.0),
        density: clamp(round_to(density, 2), 1.3, 2.6),
        therm: round_to(therm, 2),
        cure_peak: clamp(round_to(cure_peak, 1), 25.0, 130.0),
        flash,
        work_min: clamp(work_min.round(), 1.0, 90.0),
    }
}

pub fn predict_fuse(p: &FuseParams, env: &Environment) -> FusePrediction {
    let ratio_off = (p.mg_po4 - 6.4).abs();
    let bond = 4.2 + 2.8 * p.seeds - 0.35 * p.retarder - 0.6 * ratio_off + 0.012 * (p.thixo - 50.0);
    let tensile = 1.4 + 1.1 * p.seeds - 0.18 * p.retarder;
    let work = 14.0 + 7.5 * p.borax + 5.0 * p.retarder - 0.6 * (env.temp_c - 22.0);
    let cure = 62.0 + 6.0 * ratio_off - 5.0 * p.borax - 3.4 * p.retarder + 0.4 * (env.temp_c - 22.0);
    let visc = 1.2 + 0.05 * p.thixo;

    FusePrediction {
        bond: clamp(round_to(bond, 2), 0.2, 14.0),
        tensile: clamp(round_to(tensile, 2), 0.1, 6.0),
        work_min: clamp(round_to(work, 0), 2.0, 180.0),
        cure_peak: clamp(round_to(cure, 1), 25.0, 110.0),
        viscosity: round_to(visc, 1),
    }
}

pub fn predict_marrow(p: &MarrowParams, _env: &Environment) -> MarrowPrediction {
    let porosity = clamp(0.18 + 0.10 * p.h2o2 + 0.0035 * p.perlite, 0.05, 0.85);
    let density = clamp(1900.0 - 320.0 * p.h2o2 - 14.0 * p.perlite, 200.0, 2200.0);
    let r_value = clamp(0.55 + 0.42 * p.h2o2 + 0.012 * p.perlite, 0.5, 6.0);
    let therm = round_to(0.10 / r_value * 1.05 + 0.02, 3);
    let comp = clamp(8.0 - 1.9 * p.h2o2 - 0.05 * p.perlite, 0.2, 14.0);

    MarrowPrediction {
        porosity: round_to(porosity, 3),
        density: round_to(density, 0),
        r_value: round_to(r_value, 2),
        therm,
        comp: round_to(comp, 1),
    }
}
