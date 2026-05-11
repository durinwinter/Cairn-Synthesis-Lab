/// Matscipy-inspired composite mechanics.
/// Calculates the Voigt (upper), Reuss (lower), and Hill (average) bounds
/// for the elastic modulus of a two-phase composite (e.g., fiber + matrix).

pub struct ElasticBounds {
    pub voigt: f64,
    pub reuss: f64,
    pub hill: f64,
}

/// Calculate bounds for Elastic Modulus (E) in GPa
/// v_f: volume fraction of the reinforcement (0.0 to 1.0)
/// e_f: Elastic modulus of the reinforcement fiber (GPa)
/// e_m: Elastic modulus of the matrix (GPa)
pub fn voigt_reuss_hill(v_f: f64, e_f: f64, e_m: f64) -> ElasticBounds {
    let v_m = 1.0 - v_f;
    
    // Voigt upper bound (iso-strain)
    let voigt = v_f * e_f + v_m * e_m;
    
    // Reuss lower bound (iso-stress)
    let reuss = if e_f > 0.0 && e_m > 0.0 {
        1.0 / ((v_f / e_f) + (v_m / e_m))
    } else {
        0.0
    };
    
    // Hill average
    let hill = (voigt + reuss) / 2.0;

    ElasticBounds { voigt, reuss, hill }
}
