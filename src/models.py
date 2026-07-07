"""
FPIS — Langkah 4: Integrasi AI Model (Forecasting)
Roster: Baseline (Naive Seasonal + Linear Trend), Prophet, SARIMA/Holt-Winters,
        XGBoost, Random Forest, LSTM.
Forecast horizon: 4Q (2026 Q2 – 2027 Q1) + prediction interval 80% & 95%.
"""

import logging
import warnings
import pickle
import sqlite3
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = BASE_DIR / "outputs"
OUTPUTS_DIR.mkdir(exist_ok=True)

# Metrik prioritas (sesuai spec Section 4)
PRIORITY_METRICS = [
    "revenue", "ebitda", "netinc", "opinc", "fcf",
    "gp", "ncfo",
]

KEY_RATIO_METRICS = [
    "grossMargin", "operatingMargin", "ebitdaMargin", "profitMargin",
    "DAR", "DER", "Current_Ratio", "ROA", "ROE",
]

FORECAST_HORIZON = 4  # 4 kuartal ke depan


def _prepare_series(df: pd.DataFrame, metric_id: str) -> pd.DataFrame:
    """Siapkan time series untuk satu metrik."""
    mdf = df[df["metric_id"] == metric_id].copy()
    mdf = mdf.sort_values(["year", "quarter"]).reset_index(drop=True)
    mdf = mdf.dropna(subset=["value"])

    if len(mdf) < 5:
        return pd.DataFrame()

    return mdf


def _future_periods(last_year: int, last_quarter: int, n: int = 4) -> list:
    """Generate future period tuples."""
    periods = []
    y, q = last_year, last_quarter
    for _ in range(n):
        q += 1
        if q > 4:
            q = 1
            y += 1
        periods.append((y, q))
    return periods


# ============================================================
# MODEL 1: Naive Seasonal Baseline
# ============================================================
def forecast_naive_seasonal(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """
    Naive seasonal: nilai kuartal yang sama tahun lalu.
    """
    values = series["value"].values
    quarters = series["quarter"].values

    if len(values) < 4:
        return None

    last_year = int(series["year"].iloc[-1])
    last_quarter = int(series["quarter"].iloc[-1])
    future = _future_periods(last_year, last_quarter, horizon)

    forecasts = []
    for fy, fq in future:
        # Cari nilai kuartal yang sama dari tahun sebelumnya
        same_q = series[series["quarter"] == fq]["value"].values
        if len(same_q) > 0:
            forecasts.append(same_q[-1])  # Kuartal yang sama, tahun terakhir
        else:
            forecasts.append(values[-1])  # Fallback

    forecasts = np.array(forecasts)

    # Prediction interval dari variasi historis QoQ
    residuals = np.diff(values)
    std = np.std(residuals) if len(residuals) > 0 else 0

    return {
        "model": "Naive Seasonal",
        "forecast": forecasts,
        "lower_80": forecasts - 1.28 * std,
        "upper_80": forecasts + 1.28 * std,
        "lower_95": forecasts - 1.96 * std,
        "upper_95": forecasts + 1.96 * std,
        "periods": future,
    }


# ============================================================
# MODEL 2: Linear Trend
# ============================================================
def forecast_linear_trend(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """Linear trend baseline."""
    values = series["value"].values
    n = len(values)
    X = np.arange(n).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, values)

    # Forecast
    X_future = np.arange(n, n + horizon).reshape(-1, 1)
    forecasts = model.predict(X_future)

    # Residuals untuk prediction interval
    residuals = values - model.predict(X)
    std = np.std(residuals)

    last_year = int(series["year"].iloc[-1])
    last_quarter = int(series["quarter"].iloc[-1])

    return {
        "model": "Linear Trend",
        "forecast": forecasts,
        "lower_80": forecasts - 1.28 * std,
        "upper_80": forecasts + 1.28 * std,
        "lower_95": forecasts - 1.96 * std,
        "upper_95": forecasts + 1.96 * std,
        "periods": _future_periods(last_year, last_quarter, horizon),
    }


# ============================================================
# MODEL 3: Holt-Winters (Exponential Smoothing)
# ============================================================
def forecast_holt_winters(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """Holt-Winters exponential smoothing."""
    values = series["value"].values

    if len(values) < 8:  # Butuh minimal 2 siklus seasonal
        return forecast_linear_trend(series, horizon)  # Fallback

    try:
        # Coba dengan seasonality
        model = ExponentialSmoothing(
            values,
            seasonal_periods=4,
            trend="add",
            seasonal="add",
            initialization_method="estimated",
        )
        fitted = model.fit(optimized=True, use_brute=True)

        forecasts = fitted.forecast(horizon)

        # Prediction interval dari residual
        residuals = values - fitted.fittedvalues
        std = np.std(residuals)

        last_year = int(series["year"].iloc[-1])
        last_quarter = int(series["quarter"].iloc[-1])

        return {
            "model": "Holt-Winters",
            "forecast": forecasts,
            "lower_80": forecasts - 1.28 * std,
            "upper_80": forecasts + 1.28 * std,
            "lower_95": forecasts - 1.96 * std,
            "upper_95": forecasts + 1.96 * std,
            "periods": _future_periods(last_year, last_quarter, horizon),
        }
    except Exception as e:
        logger.warning(f"Holt-Winters error: {e}, fallback to linear trend")
        return forecast_linear_trend(series, horizon)


# ============================================================
# MODEL 4: SARIMA
# ============================================================
def forecast_sarima(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """SARIMA forecasting."""
    values = series["value"].values

    if len(values) < 8:
        return forecast_linear_trend(series, horizon)

    try:
        model = SARIMAX(
            values,
            order=(1, 1, 1),
            seasonal_order=(1, 0, 1, 4),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        fitted = model.fit(disp=False, maxiter=200)

        pred = fitted.get_forecast(steps=horizon)
        forecasts = pred.predicted_mean
        conf_95 = pred.conf_int(alpha=0.05)
        conf_80 = pred.conf_int(alpha=0.20)

        last_year = int(series["year"].iloc[-1])
        last_quarter = int(series["quarter"].iloc[-1])

        return {
            "model": "SARIMA",
            "forecast": np.asarray(forecasts),
            "lower_80": np.asarray(conf_80)[:, 0],
            "upper_80": np.asarray(conf_80)[:, 1],
            "lower_95": np.asarray(conf_95)[:, 0],
            "upper_95": np.asarray(conf_95)[:, 1],
            "periods": _future_periods(last_year, last_quarter, horizon),
        }
    except Exception as e:
        logger.warning(f"SARIMA error: {e}, fallback to Holt-Winters")
        return forecast_holt_winters(series, horizon)


# ============================================================
# MODEL 5: XGBoost Regression
# ============================================================
def forecast_xgboost(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """XGBoost with lag & seasonality features."""
    try:
        import xgboost as xgb
    except ImportError:
        logger.warning("XGBoost not installed, fallback to linear trend")
        return forecast_linear_trend(series, horizon)

    feature_cols = ["lag_1", "lag_2", "lag_3", "lag_4", "rolling_mean_4Q",
                    "Q1", "Q2", "Q3", "Q4", "time_idx"]

    available_cols = [c for c in feature_cols if c in series.columns]

    if not available_cols or len(series.dropna(subset=available_cols)) < 8:
        return forecast_linear_trend(series, horizon)

    train = series.dropna(subset=available_cols + ["value"]).copy()
    X_train = train[available_cols].values
    y_train = train["value"].values

    try:
        model = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=3,
            learning_rate=0.1,
            random_state=42,
            verbosity=0,
        )
        model.fit(X_train, y_train)

        # Iterative forecast
        last_row = train.iloc[-1].copy()
        last_year = int(last_row["year"])
        last_quarter = int(last_row["quarter"])
        future_periods = _future_periods(last_year, last_quarter, horizon)

        forecasts = []
        recent_values = list(train["value"].values[-4:])

        for i, (fy, fq) in enumerate(future_periods):
            features = {}
            features["lag_1"] = recent_values[-1] if len(recent_values) >= 1 else 0
            features["lag_2"] = recent_values[-2] if len(recent_values) >= 2 else 0
            features["lag_3"] = recent_values[-3] if len(recent_values) >= 3 else 0
            features["lag_4"] = recent_values[-4] if len(recent_values) >= 4 else 0
            features["rolling_mean_4Q"] = np.mean(recent_values[-4:]) if len(recent_values) >= 4 else np.mean(recent_values)
            features["Q1"] = 1 if fq == 1 else 0
            features["Q2"] = 1 if fq == 2 else 0
            features["Q3"] = 1 if fq == 3 else 0
            features["Q4"] = 1 if fq == 4 else 0
            features["time_idx"] = int(last_row["time_idx"]) + i + 1

            X_pred = np.array([[features.get(c, 0) for c in available_cols]])
            pred = model.predict(X_pred)[0]
            forecasts.append(pred)
            recent_values.append(pred)

        forecasts = np.array(forecasts)

        # Prediction interval dari training residuals
        train_pred = model.predict(X_train)
        residuals = y_train - train_pred
        std = np.std(residuals)

        return {
            "model": "XGBoost",
            "forecast": forecasts,
            "lower_80": forecasts - 1.28 * std,
            "upper_80": forecasts + 1.28 * std,
            "lower_95": forecasts - 1.96 * std,
            "upper_95": forecasts + 1.96 * std,
            "periods": future_periods,
        }
    except Exception as e:
        logger.warning(f"XGBoost error: {e}")
        return forecast_linear_trend(series, horizon)


# ============================================================
# MODEL 6: Random Forest Regression
# ============================================================
def forecast_random_forest(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """Random Forest with lag & seasonality features."""
    feature_cols = ["lag_1", "lag_2", "lag_3", "lag_4", "rolling_mean_4Q",
                    "Q1", "Q2", "Q3", "Q4", "time_idx"]

    available_cols = [c for c in feature_cols if c in series.columns]

    if not available_cols or len(series.dropna(subset=available_cols)) < 8:
        return forecast_linear_trend(series, horizon)

    train = series.dropna(subset=available_cols + ["value"]).copy()
    X_train = train[available_cols].values
    y_train = train["value"].values

    try:
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=5,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)

        # Iterative forecast
        last_row = train.iloc[-1].copy()
        last_year = int(last_row["year"])
        last_quarter = int(last_row["quarter"])
        future_periods = _future_periods(last_year, last_quarter, horizon)

        forecasts = []
        recent_values = list(train["value"].values[-4:])

        for i, (fy, fq) in enumerate(future_periods):
            features = {}
            features["lag_1"] = recent_values[-1] if len(recent_values) >= 1 else 0
            features["lag_2"] = recent_values[-2] if len(recent_values) >= 2 else 0
            features["lag_3"] = recent_values[-3] if len(recent_values) >= 3 else 0
            features["lag_4"] = recent_values[-4] if len(recent_values) >= 4 else 0
            features["rolling_mean_4Q"] = np.mean(recent_values[-4:]) if len(recent_values) >= 4 else np.mean(recent_values)
            features["Q1"] = 1 if fq == 1 else 0
            features["Q2"] = 1 if fq == 2 else 0
            features["Q3"] = 1 if fq == 3 else 0
            features["Q4"] = 1 if fq == 4 else 0
            features["time_idx"] = int(last_row["time_idx"]) + i + 1

            X_pred = np.array([[features.get(c, 0) for c in available_cols]])
            pred = model.predict(X_pred)[0]
            forecasts.append(pred)
            recent_values.append(pred)

        forecasts = np.array(forecasts)

        train_pred = model.predict(X_train)
        residuals = y_train - train_pred
        std = np.std(residuals)

        return {
            "model": "Random Forest",
            "forecast": forecasts,
            "lower_80": forecasts - 1.28 * std,
            "upper_80": forecasts + 1.28 * std,
            "lower_95": forecasts - 1.96 * std,
            "upper_95": forecasts + 1.96 * std,
            "periods": future_periods,
        }
    except Exception as e:
        logger.warning(f"Random Forest error: {e}")
        return forecast_linear_trend(series, horizon)


# ============================================================
# MODEL 7: LSTM (lightweight 1-layer)
# ============================================================
def forecast_lstm(series: pd.DataFrame, horizon: int = FORECAST_HORIZON) -> dict:
    """LSTM 1-layer ringan (TensorFlow/Keras)."""
    try:
        import os
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
        from tensorflow import keras
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM as LSTMLayer, Dense
        from sklearn.preprocessing import MinMaxScaler
    except ImportError:
        logger.warning("TensorFlow not installed, fallback to Holt-Winters")
        return forecast_holt_winters(series, horizon)

    values = series["value"].values.reshape(-1, 1)

    if len(values) < 8:
        return forecast_holt_winters(series, horizon)

    try:
        # Normalisasi
        scaler = MinMaxScaler()
        scaled = scaler.fit_transform(values)

        # Buat sequences (lookback=4)
        lookback = 4
        X, y = [], []
        for i in range(lookback, len(scaled)):
            X.append(scaled[i - lookback:i, 0])
            y.append(scaled[i, 0])

        X = np.array(X).reshape(-1, lookback, 1)
        y = np.array(y)

        # Model LSTM 1-layer
        model = Sequential([
            LSTMLayer(32, input_shape=(lookback, 1), return_sequences=False),
            Dense(1),
        ])
        model.compile(optimizer="adam", loss="mse")
        model.fit(X, y, epochs=50, batch_size=4, verbose=0)

        # Forecast
        last_seq = scaled[-lookback:].reshape(1, lookback, 1)
        forecasts_scaled = []
        current_seq = last_seq.copy()

        for _ in range(horizon):
            pred = model.predict(current_seq, verbose=0)[0, 0]
            forecasts_scaled.append(pred)
            # Shift sequence
            new_seq = np.append(current_seq[0, 1:, 0], pred).reshape(1, lookback, 1)
            current_seq = new_seq

        # Inverse transform
        forecasts_scaled = np.array(forecasts_scaled).reshape(-1, 1)
        forecasts = scaler.inverse_transform(forecasts_scaled).flatten()

        # Prediction interval dari training residuals
        train_pred_scaled = model.predict(X, verbose=0).flatten()
        train_pred = scaler.inverse_transform(train_pred_scaled.reshape(-1, 1)).flatten()
        actual = scaler.inverse_transform(y.reshape(-1, 1)).flatten()
        residuals = actual - train_pred
        std = np.std(residuals)

        last_year = int(series["year"].iloc[-1])
        last_quarter = int(series["quarter"].iloc[-1])

        return {
            "model": "LSTM",
            "forecast": forecasts,
            "lower_80": forecasts - 1.28 * std,
            "upper_80": forecasts + 1.28 * std,
            "lower_95": forecasts - 1.96 * std,
            "upper_95": forecasts + 1.96 * std,
            "periods": _future_periods(last_year, last_quarter, horizon),
        }
    except Exception as e:
        logger.warning(f"LSTM error: {e}, fallback to Holt-Winters")
        return forecast_holt_winters(series, horizon)


# ============================================================
# MODEL REGISTRY
# ============================================================
MODEL_REGISTRY = {
    "Naive Seasonal": forecast_naive_seasonal,
    "Linear Trend": forecast_linear_trend,
    "Holt-Winters": forecast_holt_winters,
    "SARIMA": forecast_sarima,
    "XGBoost": forecast_xgboost,
    "Random Forest": forecast_random_forest,
    "LSTM": forecast_lstm,
}

# Model yang tidak butuh fitur tambahan (time-series murni)
PURE_TS_MODELS = {"Naive Seasonal", "Linear Trend", "Holt-Winters", "SARIMA"}

# Model yang butuh fitur (lag, rolling, dll)
FEATURE_MODELS = {"XGBoost", "Random Forest"}


def forecast_all_models(series: pd.DataFrame, metric_id: str,
                        models: list = None) -> list:
    """
    Jalankan semua model untuk satu metrik.
    Returns: list of dicts dengan hasil forecast per model.
    """
    if models is None:
        models = list(MODEL_REGISTRY.keys())

    results = []
    for model_name in models:
        func = MODEL_REGISTRY.get(model_name)
        if func is None:
            continue

        try:
            result = func(series)
            if result is not None:
                result["metric_id"] = metric_id
                results.append(result)
                logger.debug(f"  {model_name}: forecast OK")
        except Exception as e:
            logger.warning(f"  {model_name} error for {metric_id}: {e}")

    return results


def run_forecasting(data: dict) -> dict:
    """
    Menjalankan pipeline forecasting (Langkah 4 — bagian forecast).
    """
    logger.info("=" * 60)
    logger.info("LANGKAH 4: Integrasi AI Model — Forecasting")
    logger.info("=" * 60)

    df_q = data["quarterly"]
    all_metrics = PRIORITY_METRICS + KEY_RATIO_METRICS
    all_forecasts = []

    for metric_id in all_metrics:
        series = _prepare_series(df_q, metric_id)
        if series.empty:
            logger.warning(f"  {metric_id}: tidak cukup data untuk forecasting")
            continue

        logger.info(f"  Forecasting: {metric_id} ({len(series)} titik data)")

        # Tentukan model: LSTM skip jika tensorflow tidak ada
        try:
            import tensorflow
            models = list(MODEL_REGISTRY.keys())
        except ImportError:
            models = [m for m in MODEL_REGISTRY.keys() if m != "LSTM"]
            logger.info("  TensorFlow tidak tersedia, skip LSTM")

        results = forecast_all_models(series, metric_id, models)
        all_forecasts.extend(results)

    # Simpan forecast ke CSV
    forecast_rows = []
    for result in all_forecasts:
        for i, (y, q) in enumerate(result["periods"]):
            forecast_rows.append({
                "metric_id": result["metric_id"],
                "model": result["model"],
                "year": y,
                "quarter": q,
                "forecast": result["forecast"][i],
                "lower_80": result["lower_80"][i],
                "upper_80": result["upper_80"][i],
                "lower_95": result["lower_95"][i],
                "upper_95": result["upper_95"][i],
            })

    forecast_df = pd.DataFrame(forecast_rows)
    forecast_path = OUTPUTS_DIR / "forecast_results.csv"
    forecast_df.to_csv(forecast_path, index=False)
    logger.info(f"Forecast disimpan ke {forecast_path} ({len(forecast_df)} baris)")

    # Agregasi ke FY 2026 (hanya untuk metrik absolut, bukan rasio)
    fy_agg = _aggregate_to_fy(forecast_df)
    if not fy_agg.empty:
        fy_path = OUTPUTS_DIR / "forecast_fy2026.csv"
        fy_agg.to_csv(fy_path, index=False)
        logger.info(f"Agregasi FY 2026 disimpan ke {fy_path}")

    logger.info("Langkah 4 (Forecasting) selesai")

    return {
        **data,
        "forecasts": all_forecasts,
        "forecast_df": forecast_df,
    }


def _aggregate_to_fy(forecast_df: pd.DataFrame) -> pd.DataFrame:
    """Agregasi forecast kuartalan ke FY 2026."""
    ratio_ids = set(KEY_RATIO_METRICS)
    # Untuk metrik absolut: sum 4Q = FY
    # Untuk rasio: average 4Q
    rows = []
    for (metric_id, model), group in forecast_df.groupby(["metric_id", "model"]):
        fy_data = group[group["year"].isin([2026, 2027])].copy()
        if fy_data.empty:
            continue

        if metric_id in ratio_ids:
            agg = fy_data.agg({
                "forecast": "mean",
                "lower_80": "mean", "upper_80": "mean",
                "lower_95": "mean", "upper_95": "mean",
            })
        else:
            # Ambil Q2,Q3,Q4 2026 + Q1 2027 = ~FY2026
            agg = fy_data.agg({
                "forecast": "sum",
                "lower_80": "sum", "upper_80": "sum",
                "lower_95": "sum", "upper_95": "sum",
            })

        rows.append({
            "metric_id": metric_id,
            "model": model,
            "period": "FY 2026 (projected)",
            **agg.to_dict(),
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    from src.data_loader import run_data_loader
    from src.preprocessing import run_preprocessing
    from src.segmentation import run_segmentation
    data = run_data_loader()
    data = run_preprocessing(data)
    data = run_segmentation(data)
    run_forecasting(data)
