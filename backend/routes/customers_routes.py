from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import customers_collection
from schemas import CustomerCreate, CustomerInDB, CustomerUpdate
from bson import ObjectId
from datetime import datetime
import os
import pickle
import pandas as pd
from recommendation import generate_recommendations

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("")
async def create_customer(customer: CustomerCreate, user_id: str = Depends(get_current_user)):
    # Upsert: if a customer with this email already belongs to this user, update their RFM data
    existing = await customers_collection.find_one({"email": customer.email, "user_id": user_id})
    
    if existing:
        update_fields = {
            "name": customer.name,
            "recency": customer.recency,
            "frequency": customer.frequency,
            "monetary": customer.monetary,
            "avg_order_value": customer.avg_order_value,
            "purchases_per_month": customer.purchases_per_month,
        }
        await customers_collection.update_one({"_id": existing["_id"]}, {"$set": update_fields})
        existing.update(update_fields)
        existing["id"] = str(existing.pop("_id"))
        return existing

    # New customer
    new_id = str(ObjectId())
    customer_dict = {
        "_id": new_id,
        "user_id": user_id,
        "prediction_label": None,
        "email_status": "Not Sent",
        "created_at": datetime.utcnow(),
        **customer.dict()
    }
    await customers_collection.insert_one(customer_dict)
    customer_dict["id"] = customer_dict.pop("_id")
    return customer_dict

@router.get("")
async def list_customers(user_id: str = Depends(get_current_user)):
    cursor = customers_collection.find({"user_id": user_id})
    customers = []
    async for c in cursor:
        c["id"] = str(c.pop("_id"))
        customers.append(c)
    return customers

@router.post("/{customer_id}/predict")
async def predict_customer(customer_id: str, user_id: str = Depends(get_current_user)):
    # Fetch from Mongo
    customer_data = await customers_collection.find_one({"_id": customer_id, "user_id": user_id})
    if not customer_data:
        raise HTTPException(status_code=404, detail="Customer not found in DB.")
    # Load global model artifacts directly
    try:
        with open('artifacts/best_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
            model = model_data.get('model', model_data)
        with open('artifacts/ml_scaler.pkl', 'rb') as f:
            scaler = pickle.load(f)
        try:
            with open("artifacts/ml_features.json", 'r') as f:
                import json
                features_list = json.load(f)
        except:
            features_list = None
    except Exception as e:
        raise HTTPException(status_code=500, detail="Global models not found or failed to load.")
        
    # Prepare features
    # Since we are given base Recency, Frequency, Monetary, AvgOrderValue, PurchasesPerMonth
    # We must synthesize the derived features expected by the pipeline.
    
    purchase_freq_per_day = customer_data["purchases_per_month"] / 30.0
    total_items = customer_data["frequency"] * (customer_data["monetary"] / customer_data["avg_order_value"] if customer_data["avg_order_value"] > 0 else 1)
    avg_items = total_items / customer_data["frequency"] if customer_data["frequency"] > 0 else 1
    
    # ML safeguard: Bounding synthesized tenure to prevent extreme Out-Of-Distribution prediction explosions
    raw_tenure = customer_data["recency"] + (customer_data["frequency"] / purchase_freq_per_day if purchase_freq_per_day > 1e-4 else 365)
    tenure = min(max(raw_tenure, customer_data["recency"]), 7300) # strict cap at 20 years
    
    X_input = pd.DataFrame([{
        "Recency": customer_data["recency"],
        "Frequency": customer_data["frequency"],
        "Monetary": customer_data["monetary"],
        "AvgOrderValue": customer_data["avg_order_value"],
        "TotalItems": total_items,
        "AvgItemsPerOrder": avg_items,
        "OrderValueStd": customer_data["avg_order_value"] * 0.1,
        "MaxOrderValue": customer_data["avg_order_value"] * 1.2,
        "MinOrderValue": customer_data["avg_order_value"] * 0.8,
        "Tenure": tenure,
        "PurchaseFreqPerDay": purchase_freq_per_day
    }])
    
    if features_list:
        for col in features_list:
             if col not in X_input.columns:
                 X_input[col] = 0.0
        X_input = X_input[features_list]
        
    X_scaled = scaler.transform(X_input)
    
    try:
         prob = float(model.predict_proba(X_scaled)[0][1])
         pred_class = int(model.predict(X_scaled)[0])
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
         
    # Logic for risk categorizations: High, Medium, Low Risk (Churn Risk)
    prediction_label = "Low Risk"
    if pred_class == 0: # Won't purchase again => High Churn Risk
         prediction_label = "High Churn Risk"
    elif prob < 0.65: 
         prediction_label = "Medium Risk"
         
    # Update DB
    await customers_collection.update_one(
        {"_id": customer_id},
        {"$set": {"prediction_label": prediction_label}}
    )
    
    return {
        "customer_id": customer_id,
        "prediction_label": prediction_label,
        "probability": prob
    }
