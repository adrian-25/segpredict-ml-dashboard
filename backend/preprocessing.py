import pandas as pd
import numpy as np

def load_and_clean_data(filepath: str) -> pd.DataFrame:
    """Loads dataset and performs essential cleaning and outlier removal."""
    print(f"Loading raw dataset from {filepath}...")
    df = pd.read_csv(filepath, encoding='unicode_escape')
    return clean_data(df)

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Performs essential cleaning and outlier removal."""
    print(f"Initial shape: {df.shape}")
    
    # Standardize column name
    if 'Customer ID' in df.columns:
        df.rename(columns={'Customer ID': 'CustomerID'}, inplace=True)
        
    df = df.dropna(subset=['CustomerID', 'InvoiceDate', 'Invoice', 'Quantity', 'Price']).copy()
    
    # Drop exact duplicates
    df.drop_duplicates(inplace=True)
    
    # Filter out cancelled orders
    df['Invoice'] = df['Invoice'].astype(str)
    df = df[~df['Invoice'].str.startswith('C')].copy()
    
    # Filter valid quantity and price
    df = df[(df['Quantity'] > 0) & (df['Price'] > 0)].copy()
    
    # Create TotalPrice
    df['TotalPrice'] = df['Quantity'] * df['Price']
    
    # Remove extreme outliers (99.9th percentile) to improve model robustness
    q_qty = df['Quantity'].quantile(0.999)
    q_price = df['Price'].quantile(0.999)
    df = df[(df['Quantity'] <= q_qty) & (df['Price'] <= q_price)].copy()
    
    # Convert dates — try both M/D/Y and D/M/Y format, then fall back to pandas inference
    df['InvoiceDate'] = df['InvoiceDate'].astype(str).str.replace('-', '/')
    # Try M/D/Y H:M:S first (as seen in the actual CSV), then D/M/Y H:M
    parsed = pd.to_datetime(df['InvoiceDate'], format='%m/%d/%Y %H:%M:%S', errors='coerce')
    # Fill any remaining NaT with D/M/Y H:M fallback
    mask = parsed.isna()
    if mask.any():
        parsed[mask] = pd.to_datetime(df.loc[mask, 'InvoiceDate'], format='%d/%m/%Y %H:%M', errors='coerce')
    df['InvoiceDate'] = parsed
    df = df.dropna(subset=['InvoiceDate'])
    
    print(f"Cleaned shape: {df.shape}")
    return df
