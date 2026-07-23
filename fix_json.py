import sqlite3
import pandas as pd
import json

db_path = 'data/fpis.db'
json_path = 'frontend/public/data/dashboard.json'

conn = sqlite3.connect(db_path)
df_q = pd.read_sql('SELECT * FROM preprocessed_quarterly', conn)
conn.close()

with open(json_path, 'r') as f:
    data = json.load(f)

# Rebuild historical
hist_list = []
for _, r in df_q.iterrows():
    # formatting quarter year
    year = int(r["year"])
    q = int(r["quarter"])
    period_str = f"Q{q} {year}"
    hist_list.append({
        "period": period_str,
        "metric_id": r["metric_id"],
        "value_scaled": float(r["value"])
    })

data["historical"] = hist_list

with open(json_path, 'w') as f:
    json.dump(data, f)
print("Updated dashboard.json with all metrics from preprocessed_quarterly.")
