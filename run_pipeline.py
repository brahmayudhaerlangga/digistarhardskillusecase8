"""
FPIS — Run Pipeline End-to-End
Orkestrasi Langkah 1–7 secara berurutan.
"""

import sys
import os
import logging
import time
from pathlib import Path

# Tambahkan root ke path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.data_loader import run_data_loader
from src.preprocessing import run_preprocessing
from src.segmentation import run_segmentation
from src.models import run_forecasting
from src.anomaly import run_anomaly_detection
from src.analysis import run_analysis
from src.evaluation import run_evaluation


def main():
    """Jalankan pipeline FPIS end-to-end."""
    # Setup logging
    log_dir = Path(__file__).resolve().parent / "outputs"
    log_dir.mkdir(exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_dir / "pipeline.log", encoding="utf-8"),
        ]
    )
    logger = logging.getLogger("FPIS")

    logger.info("=" * 70)
    logger.info("  FPIS — Financial Performance Intelligence System")
    logger.info("  Telkom Indonesia (TLKM) — Pipeline End-to-End")
    logger.info("=" * 70)

    start = time.time()

    try:
        # Langkah 1: Pengumpulan Data
        data = run_data_loader()

        # Langkah 2: Pre-processing
        data = run_preprocessing(data)

        # Langkah 3: Segmentasi
        data = run_segmentation(data)

        # Langkah 4a: Forecasting
        data = run_forecasting(data)

        # Langkah 7: Evaluasi Model
        data = run_evaluation(data)

        # Langkah 4b: Anomaly Detection
        data = run_anomaly_detection(data)

        # Langkah 5: Analisis Hasil
        data = run_analysis(data)

        elapsed = time.time() - start
        logger.info("=" * 70)
        logger.info(f"  PIPELINE SELESAI — Total waktu: {elapsed:.1f} detik")
        logger.info("=" * 70)

        # Summary
        logger.info("Output files:")
        output_dir = Path(__file__).resolve().parent / "outputs"
        for f in sorted(output_dir.glob("*.csv")):
            logger.info(f"  > {f.name}")
        logger.info(f"  > data/fpis.db (SQLite)")

        return data

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
