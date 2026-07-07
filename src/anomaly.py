"""
FPIS — Langkah 4: Anomaly Detection
Statistik (z-score, IQR) + Rule-based domain finansial.
"""

import logging
import numpy as np
import pandas as pd
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"

# ---------- Thresholds ----------
ZSCORE_THRESHOLD = 2.0
IQR_MULTIPLIER = 1.5

# Rule-based thresholds (sesuai spec)
MARGIN_DROP_THRESHOLD = 3.0  # poin persen QoQ
COST_SPIKE_THRESHOLD = 10.0  # % QoQ increase
REVENUE_DROP_THRESHOLD = 5.0  # % QoQ drop
CR_WARNING_THRESHOLD = 100.0  # Current Ratio < 100%
QR_WARNING_THRESHOLD = 1.0   # Quick Ratio < 1.0
DER_SPIKE_THRESHOLD = 10.0   # poin persen QoQ increase


def detect_zscore_anomalies(series: pd.Series, threshold: float = ZSCORE_THRESHOLD) -> pd.Series:
    """Deteksi anomali menggunakan z-score."""
    if len(series.dropna()) < 3:
        return pd.Series(False, index=series.index)

    mean = series.mean()
    std = series.std()
    if std == 0:
        return pd.Series(False, index=series.index)

    z_scores = (series - mean) / std
    return z_scores.abs() > threshold


def detect_iqr_anomalies(series: pd.Series, multiplier: float = IQR_MULTIPLIER) -> pd.Series:
    """Deteksi anomali menggunakan IQR."""
    if len(series.dropna()) < 4:
        return pd.Series(False, index=series.index)

    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1

    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr

    return (series < lower) | (series > upper)


def rule_based_anomalies(df: pd.DataFrame) -> list:
    """
    Deteksi anomali berdasarkan aturan domain finansial.
    Sesuai spec Section 4 (Langkah 4).
    """
    anomalies = []

    # Pivot untuk akses kolom metrik
    pivot = df.pivot_table(
        index=["year", "quarter"],
        columns="metric_id",
        values="value",
        aggfunc="first"
    ).sort_index()

    if pivot.empty:
        return anomalies

    # Helper: hitung QoQ change
    def qoq_change(col_name):
        if col_name in pivot.columns:
            return pivot[col_name].diff()
        return pd.Series(dtype=float)

    def qoq_pct_change(col_name):
        if col_name in pivot.columns:
            return pivot[col_name].pct_change() * 100
        return pd.Series(dtype=float)

    # --- Rule 1: EBITDA/Operating margin turun > X pp QoQ ---
    for margin_id, margin_name in [("ebitdaMargin", "EBITDA Margin"),
                                    ("operatingMargin", "Operating Margin")]:
        change = qoq_change(margin_id)
        for idx, val in change.items():
            if pd.notna(val) and val < -MARGIN_DROP_THRESHOLD / 100:
                year, quarter = idx
                anomalies.append({
                    "year": year, "quarter": quarter,
                    "metric_id": margin_id,
                    "metric_name": margin_name,
                    "type": "Rule-based",
                    "severity": "WARNING" if abs(val * 100) < 5 else "CRITICAL",
                    "description": (
                        f"{margin_name} turun {abs(val * 100):.1f} poin persen QoQ "
                        f"pada Q{quarter} {year}. Perlu evaluasi efisiensi operasional."
                    ),
                    "value": val * 100,
                })

    # --- Rule 2: Cost of Revenue naik abnormal vs tren ---
    cor_change = qoq_pct_change("cor")
    for idx, val in cor_change.items():
        if pd.notna(val) and val > COST_SPIKE_THRESHOLD:
            year, quarter = idx
            anomalies.append({
                "year": year, "quarter": quarter,
                "metric_id": "cor",
                "metric_name": "Cost of Revenue",
                "type": "Rule-based",
                "severity": "WARNING" if val < 15 else "CRITICAL",
                "description": (
                    f"Cost of Revenue meningkat {val:.1f}% QoQ pada Q{quarter} {year}. "
                    f"Perlu investigasi komponen biaya jaringan dan operasional."
                ),
                "value": val,
            })

    # --- Rule 3: Revenue turun QoQ di luar pola musiman ---
    rev_change = qoq_pct_change("revenue")
    for idx, val in rev_change.items():
        if pd.notna(val) and val < -REVENUE_DROP_THRESHOLD:
            year, quarter = idx
            anomalies.append({
                "year": year, "quarter": quarter,
                "metric_id": "revenue",
                "metric_name": "Revenue",
                "type": "Rule-based",
                "severity": "WARNING" if abs(val) < 10 else "CRITICAL",
                "description": (
                    f"Revenue turun {abs(val):.1f}% QoQ pada Q{quarter} {year}. "
                    f"Penurunan ini di luar pola musiman normal."
                ),
                "value": val,
            })

    # --- Rule 4: Current Ratio < 100% ---
    if "Current_Ratio" in pivot.columns:
        for idx, val in pivot["Current_Ratio"].items():
            if pd.notna(val) and val < CR_WARNING_THRESHOLD:
                year, quarter = idx
                anomalies.append({
                    "year": year, "quarter": quarter,
                    "metric_id": "Current_Ratio",
                    "metric_name": "Current Ratio",
                    "type": "Rule-based",
                    "severity": "WARNING",
                    "description": (
                        f"Current Ratio berada di {val:.1f}% pada Q{quarter} {year} "
                        f"(di bawah threshold 100%). Risiko likuiditas jangka pendek."
                    ),
                    "value": val,
                })

    # --- Rule 5: Quick Ratio < 1.0 ---
    if "Quick_Ratio" in pivot.columns:
        for idx, val in pivot["Quick_Ratio"].items():
            if pd.notna(val) and val < QR_WARNING_THRESHOLD:
                year, quarter = idx
                anomalies.append({
                    "year": year, "quarter": quarter,
                    "metric_id": "Quick_Ratio",
                    "metric_name": "Quick Ratio",
                    "type": "Rule-based",
                    "severity": "WARNING",
                    "description": (
                        f"Quick Ratio berada di {val:.2f} pada Q{quarter} {year} "
                        f"(di bawah threshold 1.0). Likuiditas tanpa inventori kurang memadai."
                    ),
                    "value": val,
                })

    # --- Rule 6: DER naik tajam ---
    der_change = qoq_change("DER")
    for idx, val in der_change.items():
        if pd.notna(val) and val > DER_SPIKE_THRESHOLD:
            year, quarter = idx
            anomalies.append({
                "year": year, "quarter": quarter,
                "metric_id": "DER",
                "metric_name": "Debt to Equity Ratio",
                "type": "Rule-based",
                "severity": "WARNING" if val < 15 else "CRITICAL",
                "description": (
                    f"DER meningkat {val:.1f} poin persen QoQ pada Q{quarter} {year}. "
                    f"Risiko leverage meningkat."
                ),
                "value": val,
            })

    return anomalies


def statistical_anomalies(df: pd.DataFrame, metric_ids: list = None) -> list:
    """
    Deteksi anomali statistik (z-score + IQR) pada growth rates.
    """
    anomalies = []

    if metric_ids is None:
        metric_ids = df["metric_id"].unique()

    for metric_id in metric_ids:
        mdf = df[df["metric_id"] == metric_id].sort_values(["year", "quarter"])

        if len(mdf) < 5:
            continue

        # Z-score pada YoY growth
        if "yoy_growth" in mdf.columns:
            yoy = mdf["yoy_growth"].dropna()
            if len(yoy) >= 3:
                z_anomalies = detect_zscore_anomalies(yoy)
                for idx in z_anomalies[z_anomalies].index:
                    row = mdf.loc[idx]
                    anomalies.append({
                        "year": int(row["year"]),
                        "quarter": int(row["quarter"]),
                        "metric_id": metric_id,
                        "metric_name": row.get("metric_name", metric_id),
                        "type": "Statistical (Z-score YoY)",
                        "severity": "INFO",
                        "description": (
                            f"YoY growth {metric_id} sebesar {row['yoy_growth']:.1f}% "
                            f"merupakan outlier statistik (z-score > {ZSCORE_THRESHOLD})."
                        ),
                        "value": row["yoy_growth"],
                    })

        # IQR pada QoQ growth
        if "qoq_growth" in mdf.columns:
            qoq = mdf["qoq_growth"].dropna()
            if len(qoq) >= 4:
                iqr_anomalies = detect_iqr_anomalies(qoq)
                for idx in iqr_anomalies[iqr_anomalies].index:
                    row = mdf.loc[idx]
                    anomalies.append({
                        "year": int(row["year"]),
                        "quarter": int(row["quarter"]),
                        "metric_id": metric_id,
                        "metric_name": row.get("metric_name", metric_id),
                        "type": "Statistical (IQR QoQ)",
                        "severity": "INFO",
                        "description": (
                            f"QoQ growth {metric_id} sebesar {row['qoq_growth']:.1f}% "
                            f"berada di luar rentang IQR normal."
                        ),
                        "value": row["qoq_growth"],
                    })

    return anomalies


def run_anomaly_detection(data: dict) -> dict:
    """
    Menjalankan pipeline anomaly detection (Langkah 4 — bagian anomali).
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 4: Anomaly Detection")
    logger.info("=" * 60)

    df_q = data["quarterly"]

    # Rule-based anomalies
    logger.info("Menjalankan rule-based anomaly detection...")
    rule_anomalies = rule_based_anomalies(df_q)
    logger.info(f"  Rule-based anomalies: {len(rule_anomalies)}")

    # Statistical anomalies pada metrik prioritas
    priority = [
        "revenue", "ebitda", "netinc", "opinc", "fcf", "gp", "ncfo",
        "cor", "opex", "grossMargin", "operatingMargin", "ebitdaMargin",
    ]
    logger.info("Menjalankan statistical anomaly detection...")
    stat_anomalies = statistical_anomalies(df_q, priority)
    logger.info(f"  Statistical anomalies: {len(stat_anomalies)}")

    # Gabungkan
    all_anomalies = rule_anomalies + stat_anomalies
    anomaly_df = pd.DataFrame(all_anomalies)

    if not anomaly_df.empty:
        anomaly_df = anomaly_df.sort_values(["year", "quarter", "severity"],
                                             ascending=[True, True, False])

        # Simpan ke CSV
        anomaly_path = OUTPUTS_DIR / "anomaly_report.csv"
        anomaly_df.to_csv(anomaly_path, index=False)
        logger.info(f"Anomaly report disimpan ke {anomaly_path} ({len(anomaly_df)} anomalies)")

        # Summary per severity
        severity_counts = anomaly_df["severity"].value_counts()
        for sev, count in severity_counts.items():
            logger.info(f"  {sev}: {count}")
    else:
        anomaly_df = pd.DataFrame(columns=[
            "year", "quarter", "metric_id", "metric_name",
            "type", "severity", "description", "value"
        ])
        logger.info("  Tidak ada anomali terdeteksi")

    logger.info("Langkah 4 (Anomaly Detection) selesai")

    return {
        **data,
        "anomalies": anomaly_df,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    from src.data_loader import run_data_loader
    from src.preprocessing import run_preprocessing
    from src.segmentation import run_segmentation
    data = run_data_loader()
    data = run_preprocessing(data)
    data = run_segmentation(data)
    run_anomaly_detection(data)
