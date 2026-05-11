use axum::{
    routing::{get, post},
    Router, Json,
};
use tower_http::cors::{Any, CorsLayer};
use serde::{Deserialize};
use cairn_models::{
    Environment, 
    FlintParams, FlintPrediction, predict_flint,
    FuseParams, FusePrediction, predict_fuse,
    MarrowParams, MarrowPrediction, predict_marrow
};
use std::net::SocketAddr;

#[derive(Deserialize)]
pub struct PredictFlintRequest {
    pub params: FlintParams,
    pub env: Environment,
}

#[derive(Deserialize)]
pub struct PredictFuseRequest {
    pub params: FuseParams,
    pub env: Environment,
}

#[derive(Deserialize)]
pub struct PredictMarrowRequest {
    pub params: MarrowParams,
    pub env: Environment,
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/predict/flint", post(handle_predict_flint))
        .route("/api/predict/fuse", post(handle_predict_fuse))
        .route("/api/predict/marrow", post(handle_predict_marrow))
        .route("/api/health", get(|| async { "OK" }))
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));
    println!("Cairn API running on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handle_predict_flint(Json(payload): Json<PredictFlintRequest>) -> Json<FlintPrediction> {
    Json(predict_flint(&payload.params, &payload.env))
}

async fn handle_predict_fuse(Json(payload): Json<PredictFuseRequest>) -> Json<FusePrediction> {
    Json(predict_fuse(&payload.params, &payload.env))
}

async fn handle_predict_marrow(Json(payload): Json<PredictMarrowRequest>) -> Json<MarrowPrediction> {
    Json(predict_marrow(&payload.params, &payload.env))
}
