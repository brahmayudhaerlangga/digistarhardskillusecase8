import pandas as pd
import json
import os
import numpy as np

def generate_mock_data():
    print("Membaca data historis...")
    # 1. Historical Data
    df_hist = pd.read_csv('data/tlkm_quarterly_tidy.csv')
    
    # Filter only important metrics
    metrics = ['revenue', 'netinc', 'assets', 'liabilities', 'equity', 'ebitda', 'opex']
    df_filtered = df_hist[df_hist['metric_id'].isin(metrics)].copy()
    
    # Pivot to get periods as rows and metrics as columns
    df_pivot = df_filtered.pivot_table(index=['year', 'quarter', 'period_date'], columns='metric_id', values='value').reset_index()
    df_pivot['period'] = df_pivot['year'].astype(str) + ' Q' + df_pivot['quarter'].astype(str)
    
    # Sort by date
    df_pivot = df_pivot.sort_values('period_date')
    
    historical_data = []
    for _, row in df_pivot.iterrows():
        # Values are already in Billions (Miliar Rupiah)
        item = {
            "period": row['period'],
            "revenue": row.get('revenue', 0) if pd.notna(row.get('revenue')) else 0,
            "netIncome": row.get('netinc', 0) if pd.notna(row.get('netinc')) else 0,
            "operatingIncome": row.get('ebitda', 0) if pd.notna(row.get('ebitda')) else 0,
            "operatingExpenses": row.get('opex', 0) if pd.notna(row.get('opex')) else 0,
        }
        # Add mock Subscribers (in Millions)
        # Starting around 160M, growing slightly
        base_subs = 160 + (row['year'] - 2021) * 3 + (row['quarter']) * 0.5
        noise = np.random.normal(0, 1)
        item["subscribers"] = round(base_subs + noise, 2)
        
        historical_data.append(item)
        
    last_hist_revenue = historical_data[-1]['revenue'] if historical_data else 35000
    
    print("Membaca data forecast...")
    # 2. Forecast Data
    try:
        df_fc = pd.read_csv('outputs/forecast_results.csv')
        # Only take the best model (assume Holt-Winters or just the first model's results)
        best_model = df_fc['model'].iloc[0]
        df_fc = df_fc[df_fc['model'] == best_model].copy()
        
        df_fc['period'] = df_fc['year'].astype(str) + ' Q' + df_fc['quarter'].astype(str)
        
        forecast_data = []
        target_growth = 1.05 # 5% QoQ target
        current_target = last_hist_revenue * target_growth
        
        for _, row in df_fc[df_fc['metric_id'] == 'revenue'].iterrows():
            forecast_data.append({
                "period": row['period'],
                "forecast": row['forecast'],
                "lower_80": row['lower_80'],
                "upper_80": row['upper_80'],
                "target": current_target
            })
            current_target *= target_growth
            
    except Exception as e:
        print(f"Error reading forecast: {e}")
        forecast_data = []

    print("Membaca data anomali...")
    # 3. Anomalies
    try:
        df_anom = pd.read_csv('outputs/anomaly_report.csv')
        df_anom['period'] = df_anom['year'].astype(str) + ' Q' + df_anom['quarter'].astype(str)
        anomalies = df_anom[['period', 'metric_id', 'value', 'status', 'deskripsi']].to_dict('records')
    except:
        anomalies = []

    # 4. Generate Regional & Product Mock Data
    print("Generate Mock Data Regional & Produk...")
    # Base on last historical revenue
    regional_data = [
        {"name": "Jawa", "value": round(last_hist_revenue * 0.55), "growth": 3.2},
        {"name": "Sumatera", "value": round(last_hist_revenue * 0.22), "growth": -1.5},
        {"name": "KTI (Timur)", "value": round(last_hist_revenue * 0.13), "growth": 5.8},
        {"name": "Kalimantan", "value": round(last_hist_revenue * 0.10), "growth": 2.1},
    ]
    
    product_data = [
        {"name": "Telkomsel", "value": round(last_hist_revenue * 0.60), "growth": 1.5},
        {"name": "IndiHome", "value": round(last_hist_revenue * 0.25), "growth": 7.2},
        {"name": "Enterprise", "value": round(last_hist_revenue * 0.10), "growth": -4.0},
        {"name": "WIFI.ID / Lainnya", "value": round(last_hist_revenue * 0.05), "growth": 2.0},
    ]

    # Combine everything
    dashboard_json = {
        "historical": historical_data,
        "forecast": forecast_data,
        "anomalies": anomalies,
        "regional": regional_data,
        "product": product_data,
        "insights": [
            "Revenue Enterprise diprediksi turun 8% pada kuartal berikutnya (Mock Insight).",
            "Cost Network meningkat abnormal 15% dibanding historical trend di Regional Sumatera.",
            "Produk IndiHome memiliki growth tertinggi selama 12 bulan terakhir.",
            "Regional Sumatera memiliki risiko tidak mencapai target EBITDA sebesar 5%."
        ]
    }
    
    # Save to frontend public folder
    os.makedirs('frontend/public/data', exist_ok=True)
    with open('frontend/public/data/dashboard.json', 'w') as f:
        json.dump(dashboard_json, f, indent=4)
        
    print("Berhasil! File JSON tersimpan di frontend/public/data/dashboard.json")

if __name__ == '__main__':
    generate_mock_data()
