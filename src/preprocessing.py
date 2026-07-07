"""
FPIS — Langkah 2: Pre-processing
Konversi satuan, missing value handling, hitung rasio turunan, feature engineering.
"""

import logging
import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from src.data_loader import DB_PATH, load_from_sqlite

logger = logging.getLogger(__name__)

# ---------- Konstanta ----------
MILIAR = 1e9  # Konversi Rupiah penuh → Miliar Rupiah

# Metrik yang sudah dalam bentuk persen/rasio (JANGAN konversi ke miliar)
RATIO_METRICS = {
    "grossMargin", "operatingMargin", "ebitMargin", "ebitdaMargin",
    "profitMargin", "fcfMargin", "taxrate", "payoutratio",
    "revenueGrowth", "netIncomeGrowth", "epsGrowth", "fcfGrowth",
    "ocfGrowth", "cashGrowth", "dividendGrowth", "sharesYoY",
}

# Metrik per-share (jangan konversi ke miliar)
PER_SHARE_METRICS = {
    "epsBasic", "epsdil", "dps", "fcfps", "bvps",
    "netcashpershare", "tangibleBookValuePerShare",
}

# Metrik yang berupa count/jumlah (jangan konversi)
COUNT_METRICS = {
    "sharesBasic", "sharesDiluted", "sharesOutFilingDate",
    "sharesOutTotalCommon",
}

# Metrik prioritas untuk modeling (sesuai spec Section 4)
PRIORITY_METRICS = [
    "revenue", "ebitda", "netinc", "opinc", "fcf",
    "gp", "cor", "opex", "ncfo",
]

# Rasio kunci untuk modeling
KEY_RATIOS = [
    "grossMargin", "operatingMargin", "ebitdaMargin", "profitMargin",
    "fcfMargin",
]

# ---------- Komponen untuk hitung rasio turunan ----------
RATIO_COMPONENTS = {
    "DAR": {"numerator": "liabilities", "denominator": "assets"},
    "DER": {"numerator": "liabilities", "denominator": "equity"},
    "Current_Ratio": {"numerator": "assetsc", "denominator": "currentLiabilities"},
    "Quick_Ratio": {
        "numerator_formula": "assetsc - inventory",
        "denominator": "currentLiabilities",
    },
    "ROA": {"numerator": "netinc", "denominator": "assets"},
    "ROE": {"numerator": "netinc", "denominator": "equity"},
    "Firm_Size": {"ln_of": "assets"},
}


def convert_to_miliar(df: pd.DataFrame) -> pd.DataFrame:
    """Konversi nominal Rupiah penuh ke Miliar Rupiah."""
    df = df.copy()
    skip_metrics = RATIO_METRICS | PER_SHARE_METRICS | COUNT_METRICS

    mask = ~df["metric_id"].isin(skip_metrics)
    df.loc[mask, "value"] = df.loc[mask, "value"] / MILIAR

    logger.info(f"Konversi ke Miliar Rupiah: {mask.sum()} baris dikonversi, "
                f"{(~mask).sum()} baris skip (rasio/per-share/count)")
    return df


def handle_missing_values(df: pd.DataFrame, source: str = "quarterly") -> pd.DataFrame:
    """
    Missing value handling: identifikasi rentang kontinu per metrik.
    Catat gap eksplisit — JANGAN silent fill.
    """
    df = df.copy()
    gap_report = []

    for metric_id in df["metric_id"].unique():
        metric_data = df[df["metric_id"] == metric_id].copy()

        if source == "quarterly":
            metric_data = metric_data.sort_values(["year", "quarter"])
        else:
            metric_data = metric_data.sort_values("year")

        total = len(metric_data)
        missing = metric_data["value"].isna().sum()

        if missing > 0 and missing < total:
            gap_report.append({
                "metric_id": metric_id,
                "total_periods": total,
                "missing": missing,
                "pct_missing": round(missing / total * 100, 1),
            })

    if gap_report:
        gap_df = pd.DataFrame(gap_report)
        logger.info(f"[{source}] {len(gap_report)} metrik memiliki gap data:")
        for _, row in gap_df.iterrows():
            logger.debug(f"  {row['metric_id']}: {row['missing']}/{row['total_periods']} "
                         f"missing ({row['pct_missing']}%)")

    # Hapus baris yang value-nya NaN (jangan interpolasi — JANGAN fabrikasi data)
    before = len(df)
    df = df.dropna(subset=["value"])
    after = len(df)
    if before > after:
        logger.info(f"[{source}] Removed {before - after} rows with NaN values")

    return df


def compute_derived_ratios_quarterly(df: pd.DataFrame) -> pd.DataFrame:
    """
    Hitung rasio turunan dari komponen balance sheet (quarterly).
    DAR, DER, CR, QR, ROA, ROE, Firm Size — sesuai Section 3.3 spec.
    """
    pivot = df.pivot_table(
        index=["year", "quarter", "period_date", "ticker"],
        columns="metric_id", values="value", aggfunc="first"
    ).reset_index()

    new_rows = []

    for _, row in pivot.iterrows():
        base = {
            "ticker": row.get("ticker", "TLKM"),
            "year": int(row["year"]),
            "quarter": int(row["quarter"]),
            "period_date": row["period_date"],
        }

        # DAR = Total Liabilitas / Total Aset × 100%
        if "liabilities" in row and "assets" in row:
            liab = row.get("liabilities")
            assets = row.get("assets")
            if pd.notna(liab) and pd.notna(assets) and assets != 0:
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "DAR",
                    "metric_name": "Debt to Asset Ratio",
                    "value": (liab / assets) * 100,
                })

        # DER = Total Liabilitas / Total Ekuitas × 100%
        if "liabilities" in row and "equity" in row:
            liab = row.get("liabilities")
            equity = row.get("equity")
            if pd.notna(liab) and pd.notna(equity) and equity != 0:
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "DER",
                    "metric_name": "Debt to Equity Ratio",
                    "value": (liab / equity) * 100,
                })

        # Current Ratio = Aset Lancar / Liabilitas Lancar × 100%
        if "assetsc" in row and "currentLiabilities" in row:
            ca = row.get("assetsc")
            cl = row.get("currentLiabilities")
            if pd.notna(ca) and pd.notna(cl) and cl != 0:
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "Current_Ratio",
                    "metric_name": "Current Ratio",
                    "value": (ca / cl) * 100,
                })

        # Quick Ratio = (Aset Lancar - Persediaan) / Liabilitas Lancar
        if "assetsc" in row and "inventory" in row and "currentLiabilities" in row:
            ca = row.get("assetsc")
            inv = row.get("inventory")
            cl = row.get("currentLiabilities")
            if pd.notna(ca) and pd.notna(cl) and cl != 0:
                inv_val = inv if pd.notna(inv) else 0
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "Quick_Ratio",
                    "metric_name": "Quick Ratio",
                    "value": (ca - inv_val) / cl,
                })

        # ROA = Laba Bersih / Total Aset × 100%
        if "netinc" in row and "assets" in row:
            ni = row.get("netinc")
            assets = row.get("assets")
            if pd.notna(ni) and pd.notna(assets) and assets != 0:
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "ROA",
                    "metric_name": "Return on Assets",
                    "value": (ni / assets) * 100,
                })

        # ROE = Laba Bersih / Total Ekuitas × 100%
        if "netinc" in row and "equity" in row:
            ni = row.get("netinc")
            equity = row.get("equity")
            if pd.notna(ni) and pd.notna(equity) and equity != 0:
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "ROE",
                    "metric_name": "Return on Equity",
                    "value": (ni / equity) * 100,
                })

        # Firm Size = Ln(Total Aset)
        if "assets" in row:
            assets = row.get("assets")
            if pd.notna(assets) and assets > 0:
                new_rows.append({
                    **base,
                    "statement_type": "Derived Ratio",
                    "metric_id": "Firm_Size",
                    "metric_name": "Firm Size (Ln Total Assets)",
                    "value": np.log(assets),
                })

    if new_rows:
        derived_df = pd.DataFrame(new_rows)
        df = pd.concat([df, derived_df], ignore_index=True)
        logger.info(f"Rasio turunan dihitung: {len(new_rows)} baris baru "
                    f"({len(set(r['metric_id'] for r in new_rows))} rasio)")

    return df


def compute_derived_ratios_annual(df: pd.DataFrame) -> pd.DataFrame:
    """Hitung rasio turunan untuk data tahunan."""
    pivot = df.pivot_table(
        index=["year", "ticker"],
        columns="metric_id", values="value", aggfunc="first"
    ).reset_index()

    new_rows = []

    for _, row in pivot.iterrows():
        base = {
            "ticker": row.get("ticker", "TLKM"),
            "year": int(row["year"]),
        }

        # DAR
        liab = row.get("liabilities")
        assets = row.get("assets")
        if pd.notna(liab) and pd.notna(assets) and assets != 0:
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "DAR", "metric_name": "Debt to Asset Ratio",
                             "value": (liab / assets) * 100})

        # DER
        equity = row.get("equity")
        if pd.notna(liab) and pd.notna(equity) and equity != 0:
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "DER", "metric_name": "Debt to Equity Ratio",
                             "value": (liab / equity) * 100})

        # Current Ratio
        ca = row.get("assetsc")
        cl = row.get("currentLiabilities")
        if pd.notna(ca) and pd.notna(cl) and cl != 0:
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "Current_Ratio", "metric_name": "Current Ratio",
                             "value": (ca / cl) * 100})

        # Quick Ratio
        inv = row.get("inventory")
        if pd.notna(ca) and pd.notna(cl) and cl != 0:
            inv_val = inv if pd.notna(inv) else 0
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "Quick_Ratio", "metric_name": "Quick Ratio",
                             "value": (ca - inv_val) / cl})

        # ROA
        ni = row.get("netinc")
        if pd.notna(ni) and pd.notna(assets) and assets != 0:
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "ROA", "metric_name": "Return on Assets",
                             "value": (ni / assets) * 100})

        # ROE
        if pd.notna(ni) and pd.notna(equity) and equity != 0:
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "ROE", "metric_name": "Return on Equity",
                             "value": (ni / equity) * 100})

        # Firm Size
        if pd.notna(assets) and assets > 0:
            new_rows.append({**base, "statement_type": "Derived Ratio",
                             "metric_id": "Firm_Size",
                             "metric_name": "Firm Size (Ln Total Assets)",
                             "value": np.log(assets)})

    if new_rows:
        derived_df = pd.DataFrame(new_rows)
        df = pd.concat([df, derived_df], ignore_index=True)
        logger.info(f"Rasio turunan (annual): {len(new_rows)} baris baru")

    return df


def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature engineering untuk time-series modeling (Langkah 4).
    Lag 1–4Q, rolling mean 4Q, YoY growth, QoQ growth, quarter dummy.
    """
    all_features = []

    for metric_id in df["metric_id"].unique():
        mdf = df[df["metric_id"] == metric_id].copy()
        mdf = mdf.sort_values(["year", "quarter"]).reset_index(drop=True)

        if len(mdf) < 4:
            # Terlalu sedikit data untuk feature engineering
            mdf["lag_1"] = np.nan
            mdf["lag_2"] = np.nan
            mdf["lag_3"] = np.nan
            mdf["lag_4"] = np.nan
            mdf["rolling_mean_4Q"] = np.nan
            mdf["yoy_growth"] = np.nan
            mdf["qoq_growth"] = np.nan
        else:
            # Lag features
            mdf["lag_1"] = mdf["value"].shift(1)
            mdf["lag_2"] = mdf["value"].shift(2)
            mdf["lag_3"] = mdf["value"].shift(3)
            mdf["lag_4"] = mdf["value"].shift(4)

            # Rolling mean 4Q
            mdf["rolling_mean_4Q"] = mdf["value"].rolling(window=4, min_periods=4).mean()

            # YoY growth (vs 4 kuartal lalu)
            mdf["yoy_growth"] = mdf["value"].pct_change(periods=4) * 100

            # QoQ growth
            mdf["qoq_growth"] = mdf["value"].pct_change(periods=1) * 100

        # Quarter dummy (seasonality)
        mdf["Q1"] = (mdf["quarter"] == 1).astype(int)
        mdf["Q2"] = (mdf["quarter"] == 2).astype(int)
        mdf["Q3"] = (mdf["quarter"] == 3).astype(int)
        mdf["Q4"] = (mdf["quarter"] == 4).astype(int)

        # Time index (0, 1, 2, ... untuk linear trend)
        mdf["time_idx"] = range(len(mdf))

        all_features.append(mdf)

    result = pd.concat(all_features, ignore_index=True)
    logger.info(f"Feature engineering selesai: {len(result)} baris, "
                f"fitur baru: lag_1-4, rolling_mean_4Q, yoy_growth, qoq_growth, Q1-Q4, time_idx")

    return result


def validate_margins(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validasi hitungan margin pipeline vs nilai asli (toleransi ±0.2pp).
    """
    margin_checks = {
        "grossMargin": ("gp", "revenue"),
        "operatingMargin": ("opinc", "revenue"),
        "profitMargin": ("netinc", "revenue"),
    }

    pivot = df.pivot_table(
        index=["year", "quarter"],
        columns="metric_id", values="value", aggfunc="first"
    )

    for margin_id, (num_id, den_id) in margin_checks.items():
        if margin_id in pivot.columns and num_id in pivot.columns and den_id in pivot.columns:
            reported = pivot[margin_id]
            computed = (pivot[num_id] / pivot[den_id]) * 100

            # Reported margin is now in percent (e.g., 45.0)
            diff = (reported - computed).abs()
            max_diff = diff.max()

            if max_diff > 0.2:  # 0.2 poin persen
                logger.warning(f"Margin validation: {margin_id} max diff = "
                               f"{max_diff:.4f} (>{0.2})")
            else:
                logger.info(f"Margin validation: {margin_id} OK (max diff = {max_diff:.6f})")

    return df


def standardize_percentages(df: pd.DataFrame) -> pd.DataFrame:
    """Konversi format desimal ke persen untuk rasio/margin."""
    PERCENT_METRICS = {
        "grossMargin", "operatingMargin", "ebitMargin", "ebitdaMargin",
        "profitMargin", "fcfMargin", "taxrate", "payoutratio"
    }
    df = df.copy()
    for metric_id in PERCENT_METRICS:
        mask = df["metric_id"] == metric_id
        if mask.any():
            median_val = df.loc[mask, "value"].abs().median()
            if median_val < 1:  # Kemungkinan besar format desimal (e.g. 0.45)
                df.loc[mask, "value"] = df.loc[mask, "value"] * 100
                logger.info(f"Standardisasi {metric_id}: dikalikan 100 (format desimal -> persen)")
    return df


def save_preprocessed(df_q: pd.DataFrame, df_a: pd.DataFrame,
                      db_path: Path = DB_PATH) -> None:
    """Simpan data preprocessed ke SQLite."""
    conn = sqlite3.connect(str(db_path))
    try:
        df_q.to_sql("preprocessed_quarterly", conn, if_exists="replace", index=False)
        df_a.to_sql("preprocessed_annual", conn, if_exists="replace", index=False)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pq_metric ON preprocessed_quarterly(metric_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pa_metric ON preprocessed_annual(metric_id)")
        conn.commit()
        logger.info(f"Preprocessed data disimpan ke SQLite")
    finally:
        conn.close()


def run_preprocessing(data: dict) -> dict:
    """
    Menjalankan pipeline preprocessing (Langkah 2).
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 2: Pre-processing")
    logger.info("=" * 60)

    df_q = data["quarterly"].copy()
    df_a = data["annual"].copy()

    # 1. Konversi ke Miliar Rupiah
    logger.info("Konversi nominal ke Miliar Rupiah...")
    df_q = convert_to_miliar(df_q)
    df_a = convert_to_miliar(df_a)

    # 2. Handle missing values
    logger.info("Handling missing values...")
    df_q = handle_missing_values(df_q, "quarterly")
    df_a = handle_missing_values(df_a, "annual")

    # 3. Hitung rasio turunan
    logger.info("Menghitung rasio turunan (DAR, DER, CR, QR, ROA, ROE, Firm Size)...")
    df_q = compute_derived_ratios_quarterly(df_q)
    df_a = compute_derived_ratios_annual(df_a)

    # 3.5. Standardisasi margin/persentase (agar format persen konsisten e.g 45.0 bukan 0.45)
    logger.info("Standardisasi margin/persentase...")
    df_q = standardize_percentages(df_q)
    df_a = standardize_percentages(df_a)

    # 4. Validasi margin
    logger.info("Validasi margin pipeline vs data asli...")
    validate_margins(df_q)

    # 5. Feature engineering (hanya quarterly — basis modeling)
    logger.info("Feature engineering time-series...")
    df_q = add_time_features(df_q)

    # 6. Simpan ke SQLite
    save_preprocessed(df_q, df_a)

    logger.info("Langkah 2 selesai")
    return {
        "quarterly": df_q,
        "annual": df_a,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    from src.data_loader import run_data_loader
    data = run_data_loader()
    run_preprocessing(data)
