import pandas as pd
import json
import os
import numpy as np

def generate_mock_data():
    print("Membaca data historis dan pipeline...")
    
    output_data = {
        "historical": [],
        "forecast": [],
        "anomalies": [],
        "evaluations": [],
        "best_models": [],
        "insights": []
    }
    
    # 1. Historical Data
    try:
        df_hist = pd.read_csv('data/tlkm_quarterly_tidy.csv')
        df_hist['period'] = df_hist['year'].astype(str) + ' Q' + df_hist['quarter'].astype(str)
        
        # We need to scale numbers by 1e9 for consistency with forecast
        # Some metrics might be ratios/percentages, but standard financial metrics in this dataset are absolute.
        # We'll just scale everything except if it's already small or known ratio (e.g. margin).
        # We can pass raw values and let frontend handle it, OR scale them all.
        # It's safer to just pass values / 1e9 if they are large, but let's do it dynamically:
        def scale_val(val):
            if pd.isna(val): return 0
            if abs(val) > 1000000: # if it's millions/billions/trillions absolute
                return val / 1e9
            return val
            
        df_hist['value_scaled'] = df_hist['value'].apply(scale_val)
        
        # Convert to records
        output_data['historical'] = df_hist[['period', 'year', 'quarter', 'metric_id', 'value_scaled']].to_dict(orient='records')
        
    except Exception as e:
        print(f"Error reading historical: {e}")

    # 2. Forecast Data
    try:
        df_fc = pd.read_csv('outputs/forecast_results.csv')
        df_fc['period'] = df_fc['year'].astype(str) + ' Q' + df_fc['quarter'].astype(str)
        # forecast is already in billions from pipeline!
        output_data['forecast'] = df_fc.to_dict(orient='records')
    except Exception as e:
        print(f"Error reading forecast: {e}")

    # 3. Anomaly Data
    try:
        df_ano = pd.read_csv('outputs/anomaly_report.csv')
        # If quarter exists
        if 'quarter' in df_ano.columns:
            df_ano['period'] = df_ano['year'].astype(str) + ' Q' + df_ano['quarter'].astype(float).astype(int).astype(str)
        else:
            df_ano['period'] = df_ano['year'].astype(str)
            
        output_data['anomalies'] = df_ano.to_dict(orient='records')
    except Exception as e:
        print(f"Error reading anomalies: {e}")

    # 4. Evaluations
    try:
        df_eval = pd.read_csv('outputs/evaluation_report.csv')
        output_data['evaluations'] = df_eval.to_dict(orient='records')
    except Exception as e:
        print(f"Error reading evaluations: {e}")

    # 5. Best Models
    try:
        df_best = pd.read_csv('outputs/best_models.csv')
        output_data['best_models'] = df_best.to_dict(orient='records')
    except Exception as e:
        print(f"Error reading best models: {e}")

    # 6. Insights
    try:
        df_insights = pd.read_csv('outputs/insights_report.csv')
        output_data['insights'] = df_insights.to_dict(orient='records')
    except Exception as e:
        print(f"Error reading insights: {e}")
        
    # 7. Add Segments (Mock for Frontend visual)
    # Get last revenue for scaling
    try:
        last_revenue = df_hist[df_hist['metric_id'] == 'revenue']['value_scaled'].iloc[-1]
    except:
        last_revenue = 35000
        
    output_data['regional'] = [
        {"name": "Jawa", "value": round(last_revenue * 0.55), "growth": 3.2},
        {"name": "Sumatera", "value": round(last_revenue * 0.20), "growth": 4.1},
        {"name": "KTI", "value": round(last_revenue * 0.15), "growth": 5.5},
        {"name": "Kalimantan", "value": round(last_revenue * 0.10), "growth": 2.8}
    ]
    output_data['product'] = [
        {"name": "Telkomsel", "value": 65},
        {"name": "IndiHome", "value": 20},
        {"name": "Enterprise", "value": 10},
        {"name": "WIFI.ID", "value": 5}
    ]

    # Save to JSON
    os.makedirs('frontend/public/data', exist_ok=True)
    with open('frontend/public/data/dashboard.json', 'w') as f:
        json.dump(output_data, f, indent=4)
        
    print("Berhasil! File JSON ekstensif tersimpan di frontend/public/data/dashboard.json")

if __name__ == "__main__":
    generate_mock_data()
