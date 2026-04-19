import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import pickle
import json

def train_and_evaluate_models(features: pd.DataFrame, user_id: str = None):
    print("Training Predictive Models with automated checks...")
    
    # Models will learn to classify future purchase viability dropping explicit identifiers.
    drop_cols = ['Cluster', 'Segment', 'Will_Purchase_Again', 'CustomerID']
    X = features.drop(columns=[col for col in drop_cols if col in features.columns])
    y = features['Will_Purchase_Again']
    
    # MULTICOLLINEARITY CHECK (> 0.85 absolute correlation)
    corr_matrix = X.corr().abs()
    upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
    to_drop = [column for column in upper_tri.columns if any(upper_tri[column] > 0.85)]
    
    if to_drop:
        print(f"Dropping highly correlated features to prevent redundancy: {to_drop}")
        X = X.drop(columns=to_drop)
        
    # Stratified Train-Test Split to maintain label proportions
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # FEATURE SCALING (StandardScaler)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Initialize models
    models = {
        'Logistic Regression': LogisticRegression(
            max_iter=2000, 
            random_state=42, 
            class_weight='balanced'
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=200, 
            max_depth=10,
            min_samples_split=5,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        ),
        'Gradient Boosting': GradientBoostingClassifier(
            n_estimators=150, 
            learning_rate=0.05,
            max_depth=4,
            random_state=42
        )
    }
    
    results = {}
    best_score = -1
    best_model_name = ""
    best_model = None
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_scaled, y_train)
        preds = model.predict(X_test_scaled)
        
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        f1 = f1_score(y_test, preds, zero_division=0)
        cm = confusion_matrix(y_test, preds).tolist()
        
        # Track feature importance and FORCE sum to 1.0 (100%)
        feat_importance = {}
        raw_vals = None
        
        if hasattr(model, 'feature_importances_'):
            raw_vals = model.feature_importances_
        elif hasattr(model, 'coef_'):
            raw_vals = abs(model.coef_[0])
            
        if raw_vals is not None:
             total_import = np.sum(raw_vals)
             if total_import > 0:
                 normalized_vals = raw_vals / total_import
                 imp_tuples = zip(X.columns, normalized_vals)
                 feat_importance = {k: float(v) for k, v in sorted(imp_tuples, key=lambda item: item[1], reverse=True)}
                 
        results[name] = {
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1_score': f1,
            'confusion_matrix': cm,
            'feature_importance': feat_importance
        }
        
        # Custom score prioritizing both Recall and F1 as per business requirement
        custom_score = f1 + rec
        
        if custom_score > best_score:
            best_score = custom_score
            best_model_name = name
            best_model = model
            
    print(f"Best Model Selected: {best_model_name}")
    
    if user_id:
        os.makedirs('models', exist_ok=True)
        # We save models in models/user_{user_id}...
        with open(f'models/user_{user_id}_model.pkl', 'wb') as f:
            pickle.dump(best_model, f)
        with open(f'models/user_{user_id}_scaler.pkl', 'wb') as f:
            pickle.dump(scaler, f)
        with open(f'models/user_{user_id}_features.json', 'w') as f:
            json.dump(list(X.columns), f)
    else:
        # Save the StandardScaler trained squarely on the prediction features!
        with open('artifacts/ml_scaler.pkl', 'wb') as f:
            pickle.dump(scaler, f)
            
        # Save the surviving columns order to dynamically apply scaling in the endpoint
        with open('artifacts/ml_features.json', 'w') as f:
            json.dump(list(X.columns), f)
    
    return best_model, best_model_name, results
