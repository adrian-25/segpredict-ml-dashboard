import pandas as pd
import numpy as np
from datetime import timedelta

def create_training_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Creates a robust set of features using temporal splitting to prevent data leakage."""
    print("Engineering advanced features and separating target timeframe...")

    # `clean_data` standardizes the incoming CSV field to `CustomerID`.
    # Accept the raw CSV spelling too so this function remains reusable on
    # uncleaned data.
    customer_column = 'CustomerID' if 'CustomerID' in df.columns else 'Customer ID'
    
    # TEMPORAL TIME SPLIT (Data Leakage Fix)
    max_date = df['InvoiceDate'].max()
    cutoff_date = max_date - timedelta(days=30)
    
    # Split records into History (X) and Target (y)
    history_df = df[df['InvoiceDate'] < cutoff_date].copy()
    future_df = df[df['InvoiceDate'] >= cutoff_date].copy()
    
    # Future target creation
    future_buyers = future_df[customer_column].unique()
    
    customer_group = history_df.groupby(customer_column)
    
    # Initialize features DataFrame
    features = pd.DataFrame(index=history_df[customer_column].unique())
    features.index.name = 'CustomerID'
    
    # Core RFM Features using Cutoff as baseline
    features['Recency'] = customer_group['InvoiceDate'].max().apply(lambda x: (cutoff_date - x).days)
    features['Frequency'] = customer_group['Invoice'].nunique()
    features['Monetary'] = customer_group['TotalPrice'].sum()
    
    # Advanced / Derived Features
    features['AvgOrderValue'] = features['Monetary'] / features['Frequency']
    features['TotalItems'] = customer_group['Quantity'].sum()
    features['AvgItemsPerOrder'] = features['TotalItems'] / features['Frequency']
    
    # Order Value Variance
    order_values = history_df.groupby(['CustomerID', 'Invoice'])['TotalPrice'].sum().groupby('CustomerID')
    features['OrderValueStd'] = order_values.std().fillna(0)
    features['MaxOrderValue'] = order_values.max()
    features['MinOrderValue'] = order_values.min()
    
    # Lifecycle / Engagement Features — convert timedelta to integer days explicitly
    life_span_td = customer_group['InvoiceDate'].agg(lambda x: x.max() - x.min())
    life_span = life_span_td.dt.days.replace(0, 1)  # numeric days, avoid divide-by-zero
    features['Tenure'] = customer_group['InvoiceDate'].min().apply(lambda x: (cutoff_date - x).days)
    features['PurchaseFreqPerDay'] = features['Frequency'] / life_span
    
    # The actual Target Label: Did they purchase in the future 30 days? True=1, False=0
    features['Will_Purchase_Again'] = features.index.isin(future_buyers).astype(int)
    
    features.fillna(0, inplace=True)
    features.reset_index(inplace=True)
    return features
