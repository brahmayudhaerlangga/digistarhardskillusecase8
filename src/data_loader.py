"""
FPIS — Langkah 1: Pengumpulan Data (Data Loader)
Memuat CSV tidy, validasi schema, dan menyimpan ke SQLite.
"""

import os
import sqlite3
import logging
import pandas as pd
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------- Paths ----------
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "fpis.db"

QUARTERLY_CSV = DATA_DIR / "tlkm_quarterly_tidy.csv"
ANNUAL_CSV = DATA_DIR / "tlkm_annual_tidy.csv"
RAW_CSV = DATA_DIR / "tlkm_financial_data_all.csv"

# ---------- Expected schemas ----------
QUARTERLY_COLS = [
    "ticker", "statement_type", "metric_id", "metric_name",
    "year", "quarter", "period_date", "value"
]

ANNUAL_COLS = [
    "ticker", "statement_type", "metric_id", "metric_name",
    "year", "value"
]


def validate_quarterly(df: pd.DataFrame) -> pd.DataFrame:
    """Validasi schema data kuartalan."""
    # Cek kolom
    missing = set(QUARTERLY_COLS) - set(df.columns)
    if missing:
        raise ValueError(f"Kolom kuartalan tidak lengkap: {missing}")

    # Tipe data
    df["year"] = df["year"].astype(int)
    df["quarter"] = df["quarter"].astype(int)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["period_date"] = pd.to_datetime(df["period_date"])

    # Validasi periode — harusnya 20 kuartal (2021 Q2 – 2026 Q1)
    periods = df[["year", "quarter"]].drop_duplicates().sort_values(["year", "quarter"])
    n_periods = len(periods)
    logger.info(f"Data kuartalan: {n_periods} periode, "
                f"{df['metric_id'].nunique()} metrik, {len(df)} baris")

    if n_periods < 15:
        logger.warning(f"Hanya {n_periods} periode kuartalan tersedia (expected ~20)")

    return df


def validate_annual(df: pd.DataFrame) -> pd.DataFrame:
    """Validasi schema data tahunan."""
    missing = set(ANNUAL_COLS) - set(df.columns)
    if missing:
        raise ValueError(f"Kolom tahunan tidak lengkap: {missing}")

    df["year"] = df["year"].astype(int)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")

    years = sorted(df["year"].unique())
    logger.info(f"Data tahunan: {len(years)} tahun ({years[0]}–{years[-1]}), "
                f"{df['metric_id'].nunique()} metrik, {len(df)} baris")

    return df


def validate_values(df: pd.DataFrame, label: str) -> None:
    """Validasi wajar: revenue positif, margin dalam range masuk akal."""
    revenue = df[df["metric_id"] == "revenue"]
    if not revenue.empty:
        neg_rev = revenue[revenue["value"] < 0]
        if not neg_rev.empty:
            logger.warning(f"[{label}] Ditemukan revenue negatif di {len(neg_rev)} baris")

    # Margin seharusnya -100% s/d 100%
    margin_ids = [m for m in df["metric_id"].unique()
                  if "margin" in m.lower() or "Margin" in str(df[df["metric_id"] == m]["metric_name"].iloc[0] if not df[df["metric_id"] == m].empty else "")]
    margin_data = df[df["metric_id"].isin(margin_ids)]
    if not margin_data.empty:
        extreme = margin_data[(margin_data["value"].abs() > 1.5) & margin_data["value"].notna()]
        if not extreme.empty:
            # Margin > 150% — mungkin data sudah dalam desimal (e.g. 0.45 = 45%)
            logger.info(f"[{label}] Margin values range: "
                        f"{margin_data['value'].min():.4f} to {margin_data['value'].max():.4f}")


def build_metrics_catalog(df_q: pd.DataFrame, df_a: pd.DataFrame) -> pd.DataFrame:
    """Buat katalog metrik dari data."""
    cats = []
    for df, source in [(df_q, "quarterly"), (df_a, "annual")]:
        cat = (df[["metric_id", "metric_name", "statement_type"]]
               .drop_duplicates()
               .assign(source=source))
        cats.append(cat)

    catalog = pd.concat(cats, ignore_index=True).drop_duplicates(
        subset=["metric_id", "source"]
    )
    logger.info(f"Metrics catalog: {len(catalog)} entries")
    return catalog


def save_to_sqlite(df_q: pd.DataFrame, df_a: pd.DataFrame,
                   catalog: pd.DataFrame, db_path: Path = DB_PATH) -> None:
    """Simpan data ke SQLite."""
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    try:
        df_q.to_sql("financials_quarterly", conn, if_exists="replace", index=False)
        df_a.to_sql("financials_annual", conn, if_exists="replace", index=False)
        catalog.to_sql("metrics_catalog", conn, if_exists="replace", index=False)

        # Buat index untuk query cepat
        conn.execute("CREATE INDEX IF NOT EXISTS idx_q_metric ON financials_quarterly(metric_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_q_period ON financials_quarterly(year, quarter)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_a_metric ON financials_annual(metric_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_a_year ON financials_annual(year)")
        conn.commit()

        logger.info(f"Data disimpan ke SQLite: {db_path}")
    finally:
        conn.close()


def load_from_sqlite(table: str, db_path: Path = DB_PATH) -> pd.DataFrame:
    """Baca tabel dari SQLite."""
    conn = sqlite3.connect(str(db_path))
    try:
        df = pd.read_sql(f"SELECT * FROM {table}", conn)
        return df
    finally:
        conn.close()


def query_metric(metric_id: str, source: str = "quarterly",
                 db_path: Path = DB_PATH) -> pd.DataFrame:
    """Query metrik spesifik dari SQLite."""
    table = "financials_quarterly" if source == "quarterly" else "financials_annual"
    conn = sqlite3.connect(str(db_path))
    try:
        df = pd.read_sql(
            f"SELECT * FROM {table} WHERE metric_id = ?",
            conn, params=[metric_id]
        )
        return df
    finally:
        conn.close()


def run_data_loader() -> dict:
    """
    Menjalankan pipeline data loader (Langkah 1).
    Returns: dict dengan dataframes yang dimuat.
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 1: Pengumpulan Data")
    logger.info("=" * 60)

    # Load CSV
    logger.info(f"Memuat data kuartalan dari {QUARTERLY_CSV}")
    df_q = pd.read_csv(QUARTERLY_CSV)
    df_q = validate_quarterly(df_q)
    validate_values(df_q, "Quarterly")

    logger.info(f"Memuat data tahunan dari {ANNUAL_CSV}")
    df_a = pd.read_csv(ANNUAL_CSV)
    df_a = validate_annual(df_a)
    validate_values(df_a, "Annual")

    # Metrics catalog
    catalog = build_metrics_catalog(df_q, df_a)

    # Save ke SQLite
    save_to_sqlite(df_q, df_a, catalog)

    logger.info("Langkah 1 selesai")
    return {
        "quarterly": df_q,
        "annual": df_a,
        "catalog": catalog,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    run_data_loader()
