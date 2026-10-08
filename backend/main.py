import os
import json
import pickle
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from recommendation import generate_recommendations
from pydantic import BaseModel
from auth import get_current_user

from routes import auth_routes, models_routes, customers_routes, email_routes

class MLFeatures(BaseModel):
    Recency: float
    Frequency: float
    Monetary: float
    AvgOrderValue: float
    PurchaseFreqPerMonth: float

app = FastAPI(title="Customer Segmentation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(models_routes.router)
app.include_router(customers_routes.router)
app.include_router(email_routes.router)

FRONTEND_DIST = Path("/app/frontend-dist")

# Load artifacts sequentially at startup
features_df = None
scaler = None
kmeans = None
best_model = None
metrics = None
summary = None
ml_scaler = None
ml_features = None

@app.on_event("startup")
def load_artifacts():
    global features_df, scaler, kmeans, best_model, metrics, summary
    try:
        if os.path.exists('artifacts/features.csv'):
            features_df = pd.read_csv('artifacts/features.csv', index_col='CustomerID')
            print("Loaded features")
        if os.path.exists('artifacts/scaler.pkl'):
            with open('artifacts/scaler.pkl', 'rb') as f:
                scaler = pickle.load(f)
        if os.path.exists('artifacts/kmeans.pkl'):
            with open('artifacts/kmeans.pkl', 'rb') as f:
                kmeans = pickle.load(f)
        if os.path.exists('artifacts/best_model.pkl'):
            with open('artifacts/best_model.pkl', 'rb') as f:
                best_model_data = pickle.load(f)
                best_model = best_model_data['model']
        if os.path.exists('artifacts/metrics.json'):
            with open('artifacts/metrics.json', 'r') as f:
                metrics = json.load(f)
        if os.path.exists('artifacts/summary.json'):
            with open('artifacts/summary.json', 'r') as f:
                summary = json.load(f)
        if os.path.exists('artifacts/ml_scaler.pkl'):
            with open('artifacts/ml_scaler.pkl', 'rb') as f:
                global ml_scaler
                ml_scaler = pickle.load(f)
        if os.path.exists('artifacts/ml_features.json'):
            with open('artifacts/ml_features.json', 'r') as f:
                global ml_features
                ml_features = json.load(f)
    except Exception as e:
        print(f"Error loading artifacts: {e}")

@app.get("/data/summary")
def get_summary():
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found. Run pipeline first.")
    return summary

@app.get("/clusters")
def get_clusters():
    if features_df is None:
        raise HTTPException(status_code=404, detail="Data not found.")
    
    # Return aggregated data for charts
    dist = features_df['Segment'].value_counts().to_dict()
    
    # Average RFM per segment
    rfm = features_df.groupby('Segment')[['Recency', 'Frequency', 'Monetary']].mean().reset_index()
    
    return {
        "distribution": dist,
        "rfm_averages": rfm.to_dict(orient='records')
    }

@app.get("/model-metrics")
def get_model_metrics():
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not found.")
    return metrics

@app.get("/scatter-data")
def get_scatter_data(limit: int = 1000):
    if features_df is None:
        raise HTTPException(status_code=404, detail="Data not found.")
    
    # Sample data for performance
    df_sample = features_df.sample(n=min(limit, len(features_df)), random_state=42)
    
    # Send colors mapped by segment for easy frontend integration
    color_map = {
        "High Value": "#10b981", # emerald-500
        "Loyal Customers": "#3b82f6", # blue-500
        "At Risk": "#f59e0b", # amber-500
        "Lost Customers": "#ef4444", # rose-500
        "Average Value": "#a855f7" # purple-500
    }
    
    return {
        "Recency": df_sample["Recency"].tolist(),
        "Frequency": df_sample["Frequency"].tolist(),
        "Monetary": df_sample["Monetary"].tolist(),
        "Segment": df_sample["Segment"].tolist(),
        "Colors": [color_map.get(s, "#94a3b8") for s in df_sample["Segment"]]
    }

@app.get("/predict/{customer_id}")
def predict_customer(customer_id: float):
    # Customer IDs are float in dataset initially due to NaNs, then int.
    # In CSV they might be kept as float.
    if features_df is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    if customer_id not in features_df.index:
        # Try matching string or float
        matches = features_df[features_df.index == customer_id]
        if matches.empty:
            raise HTTPException(status_code=404, detail="Customer not found")
        cust_data = matches.iloc[0]
    else:
        cust_data = features_df.loc[customer_id]
        
    drop_cols = ['PurchasedNext30Days', 'Cluster', 'Segment', 'Will_Purchase_Again']
    X = cust_data.drop(labels=[col for col in drop_cols if col in cust_data.index]).to_frame().T
    
    if ml_features is not None:
        X = X[[col for col in ml_features if col in X.columns]]
        
    if ml_scaler is not None:
        X_scaled = ml_scaler.transform(X)
    else:
        X_scaled = X
    
    predicted = int(best_model.predict(X_scaled)[0])
    segment = cust_data['Segment']
    actual = int(cust_data.get('PurchasedNext30Days', -1))
    
    return {
        "customer_id": customer_id,
        "predicted_purchase_next_30_days": bool(predicted),
        "actual_purchase_next_30_days": bool(actual) if actual != -1 else None,
        "segment": segment,
        "rfm": {
            "Recency": cust_data.get("Recency", 0),
            "Frequency": cust_data.get("Frequency", 0),
            "Monetary": cust_data.get("Monetary", 0),
        }
    }

@app.get("/recommend/{customer_id}")
def recommend_for_customer(customer_id: float):
    # Reuse predict logic to get segment and prediction
    pred_res = predict_customer(customer_id)
    
    segment = pred_res["segment"]
    will_purchase = pred_res["predicted_purchase_next_30_days"]
    
    recs = generate_recommendations(segment, will_purchase)
    
    return {
        "customer_id": customer_id,
        "prediction_context": pred_res,
        "recommendations": recs
    }


@app.post("/predict/manual")
def predict_manual(features: MLFeatures, user_id: str = Depends(get_current_user)):
    # Read artifacts directly to avoid global state staleness
    try:
        with open('artifacts/scaler.pkl', 'rb') as f:
            local_scaler = pickle.load(f)
        with open('artifacts/kmeans.pkl', 'rb') as f:
            local_kmeans = pickle.load(f)
        with open('artifacts/best_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
            local_model = model_data.get('model', model_data)
        with open('artifacts/ml_scaler.pkl', 'rb') as f:
            local_ml_scaler = pickle.load(f)
        try:
             with open("artifacts/ml_features.json", 'r') as f:
                 import json
                 local_ml_features = json.load(f)
        except:
             local_ml_features = None
             
        # Also try to load features_df to figure out segment mapping
        try:
            local_features_df = pd.read_csv('artifacts/features.csv')
        except:
            local_features_df = None
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Models not loaded properly: {str(e)}")

    # 1. Cluster mapping
    try:
        # Construct DataFrame to maintain feature names as strictly required by sklearn
        rfm_df = pd.DataFrame([{
            "Recency": max(features.Recency, 1e-5),
            "Frequency": max(features.Frequency, 1e-5),
            "Monetary": max(features.Monetary, 1e-5)
        }])
        
        # Apply the log transformation matching training data exactly
        import numpy as np
        scaled_rfm = local_scaler.transform(np.log1p(rfm_df))
        cluster_id = int(local_kmeans.predict(scaled_rfm)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")
        
    # We must deduce Segment from Cluster using existing logic.
    segment = "Unknown"
    if local_features_df is not None and 'Cluster' in local_features_df.columns and 'Segment' in local_features_df.columns:
        try:
            sample_segment = local_features_df[local_features_df['Cluster'] == cluster_id]['Segment'].iloc[0]
            segment = sample_segment
        except:
            pass

    # 2. Predict Probability and Class
    try:
        # Convert month frequency back to day frequency for the trained model
        purchase_freq_per_day = features.PurchaseFreqPerMonth / 30.0

        # Synthesize the advanced ML features utilizing the 5 base inputs from the UI
        total_items = features.Frequency * (features.Monetary / features.AvgOrderValue if features.AvgOrderValue > 0 else 1)
        avg_items = total_items / features.Frequency if features.Frequency > 0 else 1
        
        # ML safeguard: Boundary cap to prevent Out-Of-Distribution prediction explosions
        raw_tenure = features.Recency + (features.Frequency / purchase_freq_per_day if purchase_freq_per_day > 1e-4 else 365)
        tenure = min(max(raw_tenure, features.Recency), 7300) # strict cap at 20 years

        X_input = pd.DataFrame([{
            "Recency": features.Recency,
            "Frequency": features.Frequency,
            "Monetary": features.Monetary,
            "AvgOrderValue": features.AvgOrderValue,
            "TotalItems": total_items,
            "AvgItemsPerOrder": avg_items,
            "OrderValueStd": features.AvgOrderValue * 0.1,
            "MaxOrderValue": features.AvgOrderValue * 1.2,
            "MinOrderValue": features.AvgOrderValue * 0.8,
            "Tenure": tenure,
            "PurchaseFreqPerDay": purchase_freq_per_day
        }])
        
        if local_ml_features is not None:
            # Handle potentially missing columns just in case
            for col in local_ml_features:
                if col not in X_input.columns:
                    X_input[col] = 0.0
            X_input = X_input[local_ml_features]
            
        if local_ml_scaler is not None:
            X_input_scaled = local_ml_scaler.transform(X_input)
        else:
            X_input_scaled = X_input
            
        prob = local_model.predict_proba(X_input_scaled)[0][1]
        pred_class = int(local_model.predict(X_input_scaled)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
        
    recs = generate_recommendations(segment, pred_class)
    
    return {
        "cluster": cluster_id,
        "segment": segment,
        "probability": float(prob),
        "predicted_purchase": bool(pred_class),
        "recommendations": recs
    }


@app.get("/runtime-config.js", include_in_schema=False)
def runtime_config():
    """Expose only browser-safe runtime settings to the bundled frontend."""
    config = {
        "DEMO_MODE": os.getenv("DEMO_MODE", "true").lower() == "true",
        "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID", ""),
        "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
        "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY", ""),
    }
    return Response(
        content=f"window.__APP_CONFIG__ = {json.dumps(config)};\n",
        media_type="application/javascript",
    )


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    """Serve Vite assets and fall back to the SPA entry point for client routes."""
    requested_path = (FRONTEND_DIST / full_path).resolve()
    if FRONTEND_DIST.exists() and requested_path.is_relative_to(FRONTEND_DIST.resolve()) and requested_path.is_file():
        return FileResponse(requested_path)

    index_path = FRONTEND_DIST / "index.html"
    if index_path.is_file():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Frontend build is not available")
