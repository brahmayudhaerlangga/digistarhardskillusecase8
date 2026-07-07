"""
FPIS — Langkah 5: Analisis Hasil
Generate insight otomatis (template-based, Bahasa Indonesia formal).
"""

import logging
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"


def _format_miliar(value: float) -> str:
    """Format angka ke format Miliar Rupiah yang readable."""
    if abs(value) >= 1000:
        return f"Rp {value / 1000:.1f} triliun"
    elif abs(value) >= 1:
        return f"Rp {value:.1f} miliar"
    else:
        return f"Rp {value * 1000:.1f} juta"


def _format_persen(value: float, decimals: int = 1) -> str:
    """Format angka persen."""
    return f"{value:.{decimals}f}%"


def _trend_word(change: float) -> str:
    """Kata tren berdasarkan perubahan."""
    if change > 5:
        return "mengalami pertumbuhan signifikan"
    elif change > 0:
        return "mengalami pertumbuhan"
    elif change > -5:
        return "mengalami penurunan ringan"
    else:
        return "mengalami penurunan signifikan"


def _get_best_model(metric_id: str, metric_fc: pd.DataFrame, best_models_df: pd.DataFrame) -> tuple[str, bool]:
    """Mengambil model terbaik dari hasil evaluasi jika tersedia."""
    if not best_models_df.empty:
        match = best_models_df[best_models_df["metric_id"] == metric_id]
        if not match.empty:
            return match.iloc[0]["best_model"], True
    
    models_avail = metric_fc["model"].unique()
    return models_avail[0] if len(models_avail) > 0 else "Unknown", False

# ============================================================
# INSIGHT 1: Forecast Revenue dan EBITDA
# ============================================================
def insight_forecast(data: dict) -> list:
    """Generate insight forecast revenue & EBITDA."""
    insights = []
    forecast_df = data.get("forecast_df", pd.DataFrame())
    df_q = data.get("quarterly", pd.DataFrame())
    best_models_df = data.get("best_models", pd.DataFrame())

    if forecast_df.empty:
        return insights

    for metric_id, metric_label in [("revenue", "Revenue"),
                                      ("ebitda", "EBITDA"),
                                      ("netinc", "Laba Bersih"),
                                      ("opinc", "Operating Income")]:
        metric_fc = forecast_df[forecast_df["metric_id"] == metric_id]
        if metric_fc.empty:
            continue

        hist = df_q[df_q["metric_id"] == metric_id].sort_values(["year", "quarter"])
        if hist.empty:
            continue

        last_val = hist["value"].iloc[-1]
        last_year = int(hist["year"].iloc[-1])
        last_q = int(hist["quarter"].iloc[-1])

        best_model, is_best = _get_best_model(metric_id, metric_fc, best_models_df)
        model_fc = metric_fc[metric_fc["model"] == best_model]
        
        if model_fc.empty:
            continue

        next_q = model_fc.iloc[0]
        forecast_val = next_q["forecast"]

        change_pct = ((forecast_val - last_val) / abs(last_val) * 100) if last_val != 0 else 0

        trend = _trend_word(change_pct)

        model_text = f"terbaik: {best_model}" if is_best else f"{best_model}"
        insights.append({
            "category": "Forecast",
            "metric": metric_label,
            "severity": "INFO" if change_pct >= 0 else "WARNING",
            "insight": (
                f"{metric_label} diprediksi {trend} sebesar "
                f"{abs(change_pct):.1f}% pada Q{int(next_q['quarter'])} {int(next_q['year'])} "
                f"dibandingkan Q{last_q} {last_year}. "
                f"Proyeksi: {_format_miliar(forecast_val)} "
                f"(model {model_text})."
            ),
        })

        # Forecast band width insight
        band_width = next_q["upper_95"] - next_q["lower_95"]
        band_pct = (band_width / abs(forecast_val) * 100) if forecast_val != 0 else 0

        if band_pct > 30:
            insights.append({
                "category": "Forecast Uncertainty",
                "metric": metric_label,
                "severity": "INFO",
                "insight": (
                    f"Prediction interval 95% untuk {metric_label} cukup lebar "
                    f"({_format_persen(band_pct)} dari nilai forecast). "
                    f"Ini mencerminkan ketidakpastian yang tinggi akibat "
                    f"short time-series (20 kuartal)."
                ),
            })

    return insights


# ============================================================
# INSIGHT 2: Financial Anomaly Detection
# ============================================================
def insight_anomalies(data: dict) -> list:
    """Generate insight dari anomali terdeteksi."""
    insights = []
    anomaly_df = data.get("anomalies", pd.DataFrame())

    if anomaly_df.empty:
        insights.append({
            "category": "Anomaly Detection",
            "metric": "Umum",
            "severity": "INFO",
            "insight": "Tidak ditemukan anomali finansial signifikan pada periode analisis.",
        })
        return insights

    # Critical anomalies
    critical = anomaly_df[anomaly_df["severity"] == "CRITICAL"]
    warning = anomaly_df[anomaly_df["severity"] == "WARNING"]

    if not critical.empty:
        insights.append({
            "category": "Anomaly Detection",
            "metric": "Umum",
            "severity": "CRITICAL",
            "insight": (
                f"Terdeteksi {len(critical)} anomali KRITIS pada kinerja keuangan. "
                f"Metrik terdampak: {', '.join(critical['metric_name'].unique())}. "
                f"Diperlukan investigasi segera."
            ),
        })

    if not warning.empty:
        insights.append({
            "category": "Anomaly Detection",
            "metric": "Umum",
            "severity": "WARNING",
            "insight": (
                f"Terdeteksi {len(warning)} anomali WARNING pada indikator keuangan. "
                f"Pemantauan berkelanjutan diperlukan."
            ),
        })

    # Ambil top anomalies terbaru
    recent = anomaly_df.sort_values(["year", "quarter"], ascending=False).head(5)
    for _, row in recent.iterrows():
        insights.append({
            "category": "Anomaly Detail",
            "metric": row["metric_name"],
            "severity": row["severity"],
            "insight": row["description"],
        })

    return insights


# ============================================================
# INSIGHT 3: Profitability Trend
# ============================================================
def insight_profitability(data: dict) -> list:
    """Generate insight profitabilitas."""
    insights = []
    df_q = data.get("quarterly", pd.DataFrame())

    margin_metrics = {
        "grossMargin": "Gross Margin",
        "operatingMargin": "Operating Margin",
        "ebitdaMargin": "EBITDA Margin",
        "profitMargin": "Profit Margin",
        "ROA": "Return on Assets",
        "ROE": "Return on Equity",
    }

    for metric_id, label in margin_metrics.items():
        mdf = df_q[df_q["metric_id"] == metric_id].sort_values(["year", "quarter"])
        if len(mdf) < 4:
            continue

        last_val = mdf["value"].iloc[-1]
        avg_val = mdf["value"].mean()
        yoy_val = mdf["value"].iloc[-4] if len(mdf) >= 4 else None

        # Trend direction
        recent_4q = mdf["value"].tail(4).values
        if len(recent_4q) == 4:
            trend_slope = np.polyfit(range(4), recent_4q, 1)[0]
            display_val = last_val
            display_avg = avg_val

            if trend_slope > 0:
                trend_text = "tren positif (meningkat)"
            else:
                trend_text = "tren negatif (menurun)"

            insights.append({
                "category": "Profitabilitas",
                "metric": label,
                "severity": "INFO" if trend_slope >= 0 else "WARNING",
                "insight": (
                    f"{label} terakhir: {_format_persen(display_val)} "
                    f"(rata-rata historis: {_format_persen(display_avg)}). "
                    f"Tren 4 kuartal terakhir menunjukkan {trend_text}."
                ),
            })

    return insights


# ============================================================
# INSIGHT 4: Cost Efficiency
# ============================================================
def insight_cost_efficiency(data: dict) -> list:
    """Generate insight efisiensi biaya."""
    insights = []
    df_q = data.get("quarterly", pd.DataFrame())

    # Pivot untuk perbandingan
    pivot = df_q.pivot_table(
        index=["year", "quarter"],
        columns="metric_id",
        values="value",
        aggfunc="first"
    ).sort_index()

    if "cor" in pivot.columns and "revenue" in pivot.columns:
        cost_ratio = (pivot["cor"] / pivot["revenue"]) * 100
        latest = cost_ratio.iloc[-1]
        avg = cost_ratio.mean()
        trend = cost_ratio.diff().tail(4).mean()

        insights.append({
            "category": "Efisiensi Biaya",
            "metric": "Cost of Revenue Ratio",
            "severity": "INFO" if trend <= 0 else "WARNING",
            "insight": (
                f"Rasio Cost of Revenue terhadap Revenue saat ini: {_format_persen(latest)} "
                f"(rata-rata historis: {_format_persen(avg)}). "
                f"{'Efisiensi biaya membaik.' if trend <= 0 else 'Efisiensi biaya perlu perhatian karena tren meningkat.'}"
            ),
        })

    if "opex" in pivot.columns and "revenue" in pivot.columns:
        opex_ratio = (pivot["opex"] / pivot["revenue"]) * 100
        latest = opex_ratio.iloc[-1]
        avg = opex_ratio.mean()

        insights.append({
            "category": "Efisiensi Biaya",
            "metric": "Opex to Revenue Ratio",
            "severity": "INFO",
            "insight": (
                f"Rasio Operating Expenses terhadap Revenue: {_format_persen(latest)} "
                f"(rata-rata historis: {_format_persen(avg)}). "
                f"Monitoring efisiensi operasional diperlukan untuk mempertahankan margin."
            ),
        })

    return insights


# ============================================================
# INSIGHT 5: Risiko Pencapaian Target
# ============================================================
def insight_target_risk(data: dict) -> list:
    """Generate insight risiko pencapaian target bisnis."""
    insights = []
    forecast_df = data.get("forecast_df", pd.DataFrame())
    df_q = data.get("quarterly", pd.DataFrame())

    best_models_df = data.get("best_models", pd.DataFrame())

    if forecast_df.empty:
        return insights

    for metric_id, label in [("revenue", "Revenue"), ("ebitda", "EBITDA"),
                              ("netinc", "Laba Bersih")]:
        hist = df_q[df_q["metric_id"] == metric_id].sort_values(["year", "quarter"])
        if hist.empty:
            continue

        last_val = hist["value"].iloc[-1]
        last_year_val = hist[hist["year"] == hist["year"].max() - 1]["value"]

        if last_year_val.empty:
            continue

        # Target = nilai periode terakhir (karena tidak ada data budget)
        target = last_val * 1.05  # Asumsi target +5% growth

        fc = forecast_df[(forecast_df["metric_id"] == metric_id)]
        if fc.empty:
            continue

        # Cek probabilitas tercapai dari prediction interval
        best_model, _ = _get_best_model(metric_id, fc, best_models_df)
        best_fc = fc[fc["model"] == best_model].iloc[0]
        
        forecast_val = best_fc["forecast"]
        upper_95 = best_fc["upper_95"]
        lower_95 = best_fc["lower_95"]

        if forecast_val >= target:
            status = "ON-TRACK"
            severity = "INFO"
        elif upper_95 >= target:
            status = "AT-RISK"
            severity = "WARNING"
        else:
            status = "OFF-TRACK"
            severity = "CRITICAL"

        gap = ((forecast_val - target) / abs(target)) * 100

        insights.append({
            "category": "Risiko Target",
            "metric": label,
            "severity": severity,
            "insight": (
                f"Status pencapaian target {label}: [{status}]. "
                f"Proyeksi: {_format_miliar(forecast_val)}, "
                f"Target: {_format_miliar(target)} "
                f"(gap: {gap:+.1f}%). "
                f"{'Proyeksi menunjukkan pencapaian target realistis.' if status == 'ON-TRACK' else 'Diperlukan aksi korektif untuk mencapai target.'}"
            ),
        })

    return insights


def run_analysis(data: dict) -> dict:
    """
    Menjalankan pipeline analisis (Langkah 5).
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 5: Analisis Hasil")
    logger.info("=" * 60)

    all_insights = []

    # 1. Forecast insight
    logger.info("Generating forecast insights...")
    all_insights.extend(insight_forecast(data))

    # 2. Anomaly insight
    logger.info("Generating anomaly insights...")
    all_insights.extend(insight_anomalies(data))

    # 3. Profitability trend
    logger.info("Generating profitability insights...")
    all_insights.extend(insight_profitability(data))

    # 4. Cost efficiency
    logger.info("Generating cost efficiency insights...")
    all_insights.extend(insight_cost_efficiency(data))

    # 5. Target risk
    logger.info("Generating target risk insights...")
    all_insights.extend(insight_target_risk(data))

    insights_df = pd.DataFrame(all_insights)

    if not insights_df.empty:
        insights_path = OUTPUTS_DIR / "insights_report.csv"
        insights_df.to_csv(insights_path, index=False, encoding="utf-8-sig")
        logger.info(f"Insights disimpan ke {insights_path} ({len(insights_df)} insights)")

        # Summary
        for cat in insights_df["category"].unique():
            count = len(insights_df[insights_df["category"] == cat])
            logger.info(f"  {cat}: {count} insights")

    logger.info("Langkah 5 selesai")

    return {
        **data,
        "insights": insights_df,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    from src.data_loader import run_data_loader
    from src.preprocessing import run_preprocessing
    from src.segmentation import run_segmentation
    from src.models import run_forecasting
    from src.anomaly import run_anomaly_detection

    data = run_data_loader()
    data = run_preprocessing(data)
    data = run_segmentation(data)
    data = run_forecasting(data)
    data = run_anomaly_detection(data)
    run_analysis(data)
