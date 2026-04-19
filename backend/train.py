import os
import pickle
import json
import logging
import pandas as pd
from datetime import timedelta
from pathlib import Path
from typing import Dict, Any, Optional

from preprocessing import load_and_clean_data
from feature_engineering import create_training_dataset
from clustering import perform_clustering
from models import train_and_evaluate_models

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_training_pipeline(
    data_path: str = 'data/online_retail_II_June-2025_Dec-2025.csv', 
    artifacts_dir: str = 'artifacts'
) -> Optional[Dict[str, Any]]:
    """
    Runs the complete machine learning training pipeline.
    
    Args:
        data_path: Path to the input dataset.
        artifacts_dir: Directory where models and metrics will be saved.
        
    Returns:
        Dictionary containing tracking metrics or None if failed.
    """
    try:
        data_file = Path(data_path)
        artifacts_path = Path(artifacts_dir)
        
        if not data_file.exists():
            logger.error(f"Data file not found: {data_file.absolute()}")
            return None
            
        logger.info(f"Starting pipeline with data from {data_file}")
        
        # Data loading and cleaning
        logger.info("Loading and cleaning data...")
        df = load_and_clean_data(str(data_file))
        
        # We now use the ENTIRE dataset without a temporal cutoff!
        max_date = df['InvoiceDate'].max()
        logger.info(f"Dataset timeframe spanned: {df['InvoiceDate'].min().date()} to {max_date.date()}")
        
        # Feature Engineering
        logger.info("Creating training features across the entire dataset...")
        features = create_training_dataset(df)
        
        # Clustering
        logger.info("Performing customer segment clustering...")
        features, scaler, kmeans, inertias = perform_clustering(features)
        
        # Model Training
        logger.info("Training predictive models...")
        best_model, best_model_name, metrics = train_and_evaluate_models(features)
        
        # Save Artifacts
        logger.info(f"Saving artifacts to {artifacts_path}...")
        artifacts_path.mkdir(parents=True, exist_ok=True)
        
        # Save feature dataset
        features.to_csv(artifacts_path / 'features.csv', index=False) # Important: index=False to prevent saving Unnamed: 0 or similar index columns if not needed
        
        # Save models and scalers
        with open(artifacts_path / 'scaler.pkl', 'wb') as f:
            pickle.dump(scaler, f)
            
        with open(artifacts_path / 'kmeans.pkl', 'wb') as f:
            pickle.dump(kmeans, f)
            
        with open(artifacts_path / 'best_model.pkl', 'wb') as f:
            pickle.dump({'name': best_model_name, 'model': best_model}, f)
            
        # Save evaluation metrics
        with open(artifacts_path / 'metrics.json', 'w') as f:
            json.dump(metrics, f, indent=4)
            
        # Extract and save dataset summary for frontend overview
        summary = {
            'total_customers': int(df['CustomerID'].nunique()),
            'total_revenue': float(df['TotalPrice'].sum()),
            'total_transactions': int(df['Invoice'].nunique()),
            'date_range': f"{df['InvoiceDate'].min().date()} to {max_date.date()}"
        }
        
        with open(artifacts_path / 'summary.json', 'w') as f:
            json.dump(summary, f, indent=4)
            
        logger.info(f"Pipeline finished successfully. Best model: {best_model_name}")
        return metrics
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}", exc_info=True)
        return None

if __name__ == '__main__':
    run_training_pipeline()
