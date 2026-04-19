from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io
import os
from datetime import datetime
from auth import get_current_user
from database import metrics_collection
from models import train_and_evaluate_models
from preprocessing import clean_data
from feature_engineering import create_training_dataset

router = APIRouter(tags=["models"])

@router.post("/upload-csv")
async def upload_csv_and_train(
    file: UploadFile = File(...), 
    user_id: str = Depends(get_current_user)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    contents = await file.read()
    try:
        # Since pandas read_csv handles encodings poorly sometimes, try a default or user might supply raw
        try:
             df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        except UnicodeDecodeError:
             df = pd.read_csv(io.BytesIO(contents), encoding='unicode_escape')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")
        
    # Standardize 'Customer' to 'Customer ID' based on the user's image where column is 'Customer'
    if 'Customer' in df.columns and 'Customer ID' not in df.columns:
         df.rename(columns={'Customer': 'Customer ID'}, inplace=True)
         
    # Quick sanity check for required raw columns
    required_cols = ['Invoice', 'Quantity', 'Price', 'InvoiceDate', 'Customer ID']
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
         raise HTTPException(status_code=400, detail=f"Missing expected raw columns: {missing_cols}")
         
    try:
        # 1. Clean the raw transactional data
        cleaned_df = clean_data(df)
        
        # 2. Extract metrics from cleaned transactional data
        total_customers = int(cleaned_df['CustomerID'].nunique())
        total_revenue = float(cleaned_df['TotalPrice'].sum()) if 'TotalPrice' in cleaned_df.columns else 0.0
        total_transactions = int(cleaned_df['Invoice'].nunique())
        
        date_range = None
        min_date = cleaned_df['InvoiceDate'].min()
        max_date = cleaned_df['InvoiceDate'].max()
        if pd.notnull(min_date) and pd.notnull(max_date):
             date_range = f"{min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}"
             
        # 3. Engineer features to generate 'Will_Purchase_Again' target and RFM metrics
        engineered_df = create_training_dataset(cleaned_df)
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Data preprocessing failed: {str(e)}")

    # Save metrics to MongoDB
    metrics = {
        "user_id": user_id,
        "total_customers": total_customers,
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "date_range": date_range,
        "updated_at": datetime.utcnow()
    }
    
    await metrics_collection.update_one(
        {"user_id": user_id},
        {"$set": metrics},
        upsert=True
    )
    
    # Train custom model using the engineered RFM data
    try:
        best_model, best_model_name, results = train_and_evaluate_models(engineered_df, user_id=user_id)
        accuracy = results[best_model_name].get("accuracy", 0)
        f1 = results[best_model_name].get("f1_score", 0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(e)}")
        
    return {
        "message": "Model trained successfully.",
        "metrics": metrics,
        "training_results": {
            "best_model": best_model_name,
            "accuracy": accuracy,
            "f1_score": f1
        }
    }

@router.get("/user-metrics")
async def get_user_metrics(user_id: str = Depends(get_current_user)):
    metrics = await metrics_collection.find_one({"user_id": user_id}, {"_id": 0})
    if not metrics:
        return {
            "user_id": user_id,
            "total_customers": 0,
            "total_revenue": 0.0,
            "total_transactions": 0,
            "date_range": None
        }
    return metrics
