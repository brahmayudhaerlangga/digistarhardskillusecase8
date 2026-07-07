"""
FPIS — Langkah 3: Labeling dan Segmentasi
Segmentasi metrik ke kategori: Profitabilitas, Likuiditas, Leverage, Cash Flow, Ukuran.
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)

# ---------- Segmentasi Kategori (sesuai spec Section 5, Langkah 3) ----------
SEGMENT_MAP = {
    # Profitabilitas
    "revenue": "Profitabilitas",
    "revenueGrowth": "Profitabilitas",
    "gp": "Profitabilitas",
    "grossMargin": "Profitabilitas",
    "opinc": "Profitabilitas",
    "operatingMargin": "Profitabilitas",
    "ebit": "Profitabilitas",
    "ebitMargin": "Profitabilitas",
    "ebitda": "Profitabilitas",
    "ebitdaMargin": "Profitabilitas",
    "netinc": "Profitabilitas",
    "netinccmn": "Profitabilitas",
    "netIncomeGrowth": "Profitabilitas",
    "profitMargin": "Profitabilitas",
    "pretax": "Profitabilitas",
    "taxexp": "Profitabilitas",
    "taxrate": "Profitabilitas",
    "ROA": "Profitabilitas",
    "ROE": "Profitabilitas",
    "epsBasic": "Profitabilitas",
    "epsdil": "Profitabilitas",
    "epsGrowth": "Profitabilitas",
    "earningContinuing": "Profitabilitas",

    # Likuiditas
    "assetsc": "Likuiditas",
    "currentLiabilities": "Likuiditas",
    "Current_Ratio": "Likuiditas",
    "Quick_Ratio": "Likuiditas",
    "cashneq": "Likuiditas",
    "totalcash": "Likuiditas",
    "cashGrowth": "Likuiditas",
    "workingcapital": "Likuiditas",
    "inventory": "Likuiditas",
    "accountsReceivable": "Likuiditas",
    "accountsPayable": "Likuiditas",
    "receivables": "Likuiditas",

    # Leverage / Solvabilitas
    "debt": "Leverage",
    "debtc": "Leverage",
    "debtnc": "Leverage",
    "DAR": "Leverage",
    "DER": "Leverage",
    "liabilities": "Leverage",
    "equity": "Leverage",
    "interestExpense": "Leverage",
    "currentPortDebt": "Leverage",
    "capitalLeases": "Leverage",
    "netcash": "Leverage",
    "netDebtIssued": "Leverage",

    # Cash Flow
    "ncfo": "Cash Flow",
    "ncfi": "Cash Flow",
    "ncff": "Cash Flow",
    "ncf": "Cash Flow",
    "fcf": "Cash Flow",
    "fcfGrowth": "Cash Flow",
    "fcfMargin": "Cash Flow",
    "fcfps": "Cash Flow",
    "ocfGrowth": "Cash Flow",
    "capex": "Cash Flow",
    "leveredFCF": "Cash Flow",
    "unleveredFCF": "Cash Flow",
    "commonDividendCF": "Cash Flow",
    "totalDepAmorCF": "Cash Flow",

    # Ukuran
    "assets": "Ukuran",
    "Firm_Size": "Ukuran",
    "netPPE": "Ukuran",
    "totalCommonEquity": "Ukuran",
    "tangibleBookValue": "Ukuran",
    "bvps": "Ukuran",

    # Biaya (sub-kategori Profitabilitas, tapi penting untuk cost efficiency)
    "cor": "Biaya",
    "opex": "Biaya",
    "sgna": "Biaya",
    "otheropex": "Biaya",
}


def assign_segments(df: pd.DataFrame) -> pd.DataFrame:
    """Assign segment/kategori ke setiap metrik."""
    df = df.copy()
    df["segment"] = df["metric_id"].map(SEGMENT_MAP).fillna("Lainnya")
    return df


def get_segment_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Ringkasan metrik per segment."""
    summary = (df.groupby("segment")
               .agg(n_metrics=("metric_id", "nunique"),
                    n_rows=("value", "count"))
               .sort_values("n_metrics", ascending=False)
               .reset_index())
    return summary


def get_metrics_by_segment(segment: str) -> list:
    """Ambil daftar metric_id untuk segment tertentu."""
    return [m for m, s in SEGMENT_MAP.items() if s == segment]


def run_segmentation(data: dict) -> dict:
    """
    Menjalankan pipeline segmentasi (Langkah 3).
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 3: Labeling dan Segmentasi")
    logger.info("=" * 60)

    df_q = assign_segments(data["quarterly"])
    df_a = assign_segments(data["annual"])

    # Summary
    summary = get_segment_summary(df_q)
    logger.info("Segmentasi kuartalan:")
    for _, row in summary.iterrows():
        logger.info(f"  {row['segment']}: {row['n_metrics']} metrik, {row['n_rows']} baris")

    logger.info("Catatan: Segmentasi regional/produk/customer = future work (data tidak tersedia)")
    logger.info("Langkah 3 selesai")

    return {
        "quarterly": df_q,
        "annual": df_a,
        "segment_summary": summary,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    from src.data_loader import run_data_loader
    from src.preprocessing import run_preprocessing
    data = run_data_loader()
    data = run_preprocessing(data)
    run_segmentation(data)
