"""
FPIS — Langkah 7: Evaluasi Model
Walk-forward validation, RMSE/MAE/MAPE, directional accuracy.
"""

import logging
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Callable

from src.models import (
    MODEL_REGISTRY, _prepare_series, PRIORITY_METRICS, KEY_RATIO_METRICS,
)

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"


def rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Root Mean Squared Error."""
    return np.sqrt(np.mean((actual - predicted) ** 2))


def mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Mean Absolute Error."""
    return np.mean(np.abs(actual - predicted))


def mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Mean Absolute Percentage Error (%)."""
    mask = actual != 0
    if not mask.any():
        return np.nan
    return np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100


def directional_accuracy(last_train: np.ndarray, actual: np.ndarray, predicted: np.ndarray) -> float:
    """Directional accuracy: % of correct direction predictions."""
    if len(actual) < 1:
        return np.nan

    actual_dir = np.sign(actual - last_train)
    pred_dir = np.sign(predicted - last_train)

    return np.mean(actual_dir == pred_dir) * 100


def walk_forward_validation(df: pd.DataFrame, metric_id: str,
                             model_name: str, model_func: Callable,
                             min_train: int = 8) -> dict:
    """
    Walk-forward validation: expanding window, forecast 1 kuartal, geser.
    """
    series = _prepare_series(df, metric_id)
    if series.empty or len(series) < min_train + 2:
        return None

    actuals = []
    predictions = []
    last_train_values = []

    for split_point in range(min_train, len(series)):
        train = series.iloc[:split_point].copy()
        test_val = series.iloc[split_point]["value"]
        last_train_val = train.iloc[-1]["value"]

        try:
            result = model_func(train, horizon=1)
            if result is None:
                continue

            pred_val = result["forecast"][0]
            actuals.append(test_val)
            predictions.append(pred_val)
            last_train_values.append(last_train_val)
        except Exception:
            continue

    if len(actuals) < 2:
        return None

    actuals = np.array(actuals)
    predictions = np.array(predictions)
    last_train_values = np.array(last_train_values)

    return {
        "metric_id": metric_id,
        "model": model_name,
        "n_folds": len(actuals),
        "RMSE": rmse(actuals, predictions),
        "MAE": mae(actuals, predictions),
        "MAPE": mape(actuals, predictions),
        "Forecast_Accuracy": 100 - mape(actuals, predictions),
        "Directional_Accuracy": directional_accuracy(last_train_values, actuals, predictions),
    }


def run_evaluation(data: dict) -> dict:
    """
    Menjalankan pipeline evaluasi model (Langkah 7).
    Walk-forward backtest semua metrik × semua model.
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 7: Evaluasi Model")
    logger.info("=" * 60)

    df_q = data["quarterly"]
    all_metrics = PRIORITY_METRICS + KEY_RATIO_METRICS
    results = []

    # Cek ketersediaan TensorFlow
    try:
        import tensorflow
        available_models = dict(MODEL_REGISTRY)
    except ImportError:
        available_models = {k: v for k, v in MODEL_REGISTRY.items() if k != "LSTM"}
        logger.info("TensorFlow tidak tersedia, skip LSTM evaluation")

    total_combos = len(all_metrics) * len(available_models)
    completed = 0

    for metric_id in all_metrics:
        series = _prepare_series(df_q, metric_id)
        if series.empty or len(series) < 10:
            logger.warning(f"  {metric_id}: skip (kurang data)")
            completed += len(available_models)
            continue

        for model_name, model_func in available_models.items():
            completed += 1
            try:
                result = walk_forward_validation(
                    df_q, metric_id, model_name, model_func
                )
                if result is not None:
                    results.append(result)
                    logger.debug(
                        f"  [{completed}/{total_combos}] {metric_id} × {model_name}: "
                        f"MAPE={result['MAPE']:.2f}%"
                    )
            except Exception as e:
                logger.warning(f"  {metric_id} × {model_name}: error - {e}")

    if not results:
        logger.warning("Tidak ada hasil evaluasi yang berhasil")
        return {**data, "evaluation": pd.DataFrame()}

    eval_df = pd.DataFrame(results)

    # Pilih model terbaik per metrik (MAPE terendah)
    best_models = (eval_df.loc[eval_df.groupby("metric_id")["MAPE"].idxmin()]
                   [["metric_id", "model", "MAPE"]]
                   .rename(columns={"model": "best_model", "MAPE": "best_MAPE"}))

    logger.info(f"\nModel terbaik per metrik (MAPE terendah):")
    for _, row in best_models.iterrows():
        logger.info(f"  {row['metric_id']}: {row['best_model']} "
                     f"(MAPE: {row['best_MAPE']:.2f}%)")

    # Simpan ke CSV
    eval_path = OUTPUTS_DIR / "evaluation_report.csv"
    eval_df.to_csv(eval_path, index=False)
    logger.info(f"\nEvaluation report disimpan ke {eval_path} ({len(eval_df)} entries)")

    best_path = OUTPUTS_DIR / "best_models.csv"
    best_models.to_csv(best_path, index=False)
    logger.info(f"Best models disimpan ke {best_path}")

    logger.info("Langkah 7 selesai")

    return {
        **data,
        "evaluation": eval_df,
        "best_models": best_models,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    from src.data_loader import run_data_loader
    from src.preprocessing import run_preprocessing
    from src.segmentation import run_segmentation
    from src.models import run_forecasting
    from src.anomaly import run_anomaly_detection
    from src.analysis import run_analysis

    data = run_data_loader()
    data = run_preprocessing(data)
    data = run_segmentation(data)
    data = run_forecasting(data)
    data = run_anomaly_detection(data)
    data = run_analysis(data)
    run_evaluation(data)
