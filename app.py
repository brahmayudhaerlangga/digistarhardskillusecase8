"""
FPIS — Langkah 6: Dashboard (Streamlit)
7 Section wajib: Executive Summary, Performance Trend, Forecast,
Forecast vs Target, Revenue Growth, Anomaly Alert, Model Limitations.
"""

import sys
import os
from pathlib import Path

# Ensure src is importable
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import sqlite3

from src.data_loader import DB_PATH, load_from_sqlite, query_metric
from src.segmentation import SEGMENT_MAP, get_metrics_by_segment
from src.preprocessing import RATIO_METRICS, PER_SHARE_METRICS

# ---------- Page Config ----------
st.set_page_config(
    page_title="FPIS — Financial Performance Intelligence System",
    page_icon="line-chart",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------- Custom CSS (Dark Theme, Clean, Profesional) ----------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    .stApp {
        font-family: 'Inter', sans-serif;
    }

    /* KPI Card styling */
    .kpi-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 20px;
        margin: 8px 0;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .kpi-value {
        font-size: 28px;
        font-weight: 700;
        color: #e0e0e0;
        margin: 4px 0;
    }
    .kpi-label {
        font-size: 13px;
        color: #8892b0;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .kpi-delta-positive {
        color: #64ffda;
        font-size: 14px;
        font-weight: 500;
    }
    .kpi-delta-negative {
        color: #ff6b6b;
        font-size: 14px;
        font-weight: 500;
    }
    .badge-healthy {
        background: rgba(100, 255, 218, 0.15);
        color: #64ffda;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    .badge-warning {
        background: rgba(255, 209, 102, 0.15);
        color: #ffd166;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    .badge-critical {
        background: rgba(255, 107, 107, 0.15);
        color: #ff6b6b;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }
    .section-header {
        font-size: 24px;
        font-weight: 700;
        color: #ccd6f6;
        margin-top: 30px;
        margin-bottom: 15px;
        border-bottom: 2px solid #233554;
        padding-bottom: 10px;
    }
    .insight-box {
        background: rgba(26, 26, 46, 0.8);
        border-left: 4px solid #64ffda;
        padding: 12px 16px;
        border-radius: 0 8px 8px 0;
        margin: 8px 0;
        font-size: 14px;
        color: #a8b2d1;
    }
    .insight-box-warning {
        border-left-color: #ffd166;
    }
    .insight-box-critical {
        border-left-color: #ff6b6b;
    }
</style>
""", unsafe_allow_html=True)

# ---------- Color Palette ----------
COLORS = {
    "primary": "#64ffda",
    "secondary": "#8892b0",
    "accent": "#ffd166",
    "danger": "#ff6b6b",
    "bg": "#0a192f",
    "card_bg": "#112240",
    "text": "#ccd6f6",
    "grid": "#233554",
}

PLOTLY_TEMPLATE = "plotly_dark"
PLOTLY_COLORS = ["#64ffda", "#ffd166", "#ff6b6b", "#a78bfa", "#38bdf8", "#f472b6"]


# ---------- Data Loading ----------
@st.cache_data(ttl=300)
def load_data():
    """Load semua data dari SQLite dan output CSV."""
    data = {}

    try:
        data["quarterly"] = load_from_sqlite("preprocessed_quarterly")
    except Exception:
        data["quarterly"] = load_from_sqlite("financials_quarterly")

    try:
        data["annual"] = load_from_sqlite("preprocessed_annual")
    except Exception:
        data["annual"] = load_from_sqlite("financials_annual")

    # Load output CSVs
    outputs = ROOT / "outputs"
    for fname in ["forecast_results.csv", "anomaly_report.csv",
                   "evaluation_report.csv", "best_models.csv",
                   "insights_report.csv"]:
        fpath = outputs / fname
        if fpath.exists():
            data[fname.replace(".csv", "")] = pd.read_csv(fpath)

    return data


def format_miliar(val: float, short: bool = True) -> str:
    """Format ke Miliar/Triliun Rupiah."""
    if pd.isna(val):
        return "N/A"
    if abs(val) >= 1000:
        return f"Rp {val/1000:.1f}T" if short else f"Rp {val/1000:.1f} triliun"
    elif abs(val) >= 1:
        return f"Rp {val:.1f}M" if short else f"Rp {val:.1f} miliar"
    else:
        return f"Rp {val*1000:.0f}jt"


def format_persen(val: float) -> str:
    if pd.isna(val):
        return "N/A"
    return f"{val:.1f}%"


# ============================================================
# SECTION 1: Executive Financial Summary
# ============================================================
def section_executive_summary(data: dict):
    st.markdown('<div class="section-header">Executive Financial Summary</div>',
                unsafe_allow_html=True)

    df = data["quarterly"]
    anomalies = data.get("anomaly_report", pd.DataFrame())

    kpi_metrics = {
        "revenue": ("Revenue", True),
        "ebitda": ("EBITDA", True),
        "netinc": ("Laba Bersih", True),
        "opinc": ("Operating Income", True),
        "fcf": ("Free Cash Flow", True),
        "ncfo": ("Operating Cash Flow", True),
        "grossMargin": ("Gross Margin", False),
        "ebitdaMargin": ("EBITDA Margin", False),
        "profitMargin": ("Profit Margin", False),
        "Current_Ratio": ("Current Ratio", False),
        "DAR": ("DAR", False),
        "ROE": ("ROE", False),
    }

    cols = st.columns(4)
    col_idx = 0

    for metric_id, (label, is_nominal) in kpi_metrics.items():
        mdf = df[df["metric_id"] == metric_id].sort_values(
            ["year", "quarter"] if "quarter" in df.columns else ["year"]
        )
        if mdf.empty:
            continue

        last_val = mdf["value"].iloc[-1]
        last_year = int(mdf["year"].iloc[-1])
        last_q = int(mdf["quarter"].iloc[-1]) if "quarter" in mdf.columns else 0

        # YoY delta
        prev_year = mdf[(mdf["year"] == last_year - 1)]
        if "quarter" in mdf.columns:
            prev_year = prev_year[prev_year["quarter"] == last_q]

        if not prev_year.empty:
            prev_val = prev_year["value"].iloc[-1]
            if prev_val != 0:
                yoy_delta = ((last_val - prev_val) / abs(prev_val)) * 100
            else:
                yoy_delta = 0
        else:
            yoy_delta = None

        # QoQ delta
        if len(mdf) >= 2:
            prev_q_val = mdf["value"].iloc[-2]
            qoq_delta = ((last_val - prev_q_val) / abs(prev_q_val) * 100) if prev_q_val != 0 else 0
        else:
            qoq_delta = None

        # Badge
        has_anomaly = False
        if not anomalies.empty:
            has_anomaly = (
                (anomalies["metric_id"] == metric_id) &
                (anomalies["year"] == last_year) &
                (anomalies.get("quarter", pd.Series()) == last_q)
            ).any() if "quarter" in anomalies.columns else False

        # Format display
        if is_nominal:
            display_val = format_miliar(last_val)
        elif metric_id in ("Current_Ratio", "DAR", "DER", "ROA", "ROE"):
            display_val = format_persen(last_val)
        else:
            display_val = format_persen(last_val * 100)  # desimal → persen

        with cols[col_idx % 4]:
            delta_html = ""
            if yoy_delta is not None:
                cls = "kpi-delta-positive" if yoy_delta >= 0 else "kpi-delta-negative"
                arrow = "▲" if yoy_delta >= 0 else "▼"
                delta_html = f'<span class="{cls}">{arrow} {abs(yoy_delta):.1f}% YoY</span>'

            badge = ""
            if has_anomaly:
                badge = '<span class="badge-critical">ANOMALI</span>'
            elif yoy_delta is not None and yoy_delta >= 0:
                badge = '<span class="badge-healthy">SEHAT</span>'
            elif yoy_delta is not None:
                badge = '<span class="badge-warning">PERHATIAN</span>'

            st.markdown(f"""
            <div class="kpi-card">
                <div class="kpi-label">{label} — Q{last_q} {last_year}</div>
                <div class="kpi-value">{display_val}</div>
                {delta_html} {badge}
            </div>
            """, unsafe_allow_html=True)

        col_idx += 1


# ============================================================
# SECTION 2: Financial Performance Trend
# ============================================================
def section_performance_trend(data: dict):
    st.markdown('<div class="section-header">Financial Performance Trend</div>',
                unsafe_allow_html=True)

    df = data["quarterly"]
    segments = list(set(SEGMENT_MAP.values()))

    col1, col2 = st.columns([1, 3])

    with col1:
        selected_segment = st.selectbox(
            "Kategori", segments, index=0, key="trend_segment"
        )
        view_mode = st.radio(
            "Tampilan", ["Quarterly", "Annual"], key="trend_view"
        )

    with col2:
        segment_metrics = get_metrics_by_segment(selected_segment)
        available = df[df["metric_id"].isin(segment_metrics)]["metric_id"].unique()

        if len(available) == 0:
            st.info("Tidak ada metrik tersedia untuk segmen ini.")
            return

        selected_metrics = st.multiselect(
            "Pilih Metrik", sorted(available),
            default=sorted(available)[:3],
            key="trend_metrics"
        )

    if not selected_metrics:
        return

    source_df = df if view_mode == "Quarterly" else data.get("annual", df)

    fig = go.Figure()
    for i, metric_id in enumerate(selected_metrics):
        mdf = source_df[source_df["metric_id"] == metric_id].sort_values(
            ["year", "quarter"] if "quarter" in source_df.columns else ["year"]
        )
        if mdf.empty:
            continue

        if "quarter" in mdf.columns:
            x = [f"Q{q} {y}" for y, q in zip(mdf["year"], mdf["quarter"])]
        else:
            x = mdf["year"].astype(str).tolist()

        fig.add_trace(go.Scatter(
            x=x, y=mdf["value"],
            name=metric_id,
            mode="lines+markers",
            line=dict(color=PLOTLY_COLORS[i % len(PLOTLY_COLORS)], width=2),
            marker=dict(size=6),
        ))

    fig.update_layout(
        template=PLOTLY_TEMPLATE,
        height=450,
        title=f"Tren {selected_segment} ({view_mode})",
        xaxis_title="Periode",
        yaxis_title="Nilai",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        plot_bgcolor="rgba(10,25,47,0.8)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig, use_container_width=True)


# ============================================================
# SECTION 3: Forecast
# ============================================================
def section_forecast(data: dict):
    st.markdown('<div class="section-header">Forecast — Proyeksi 4 Kuartal</div>',
                unsafe_allow_html=True)

    forecast_df = data.get("forecast_results", pd.DataFrame())
    if forecast_df.empty:
        st.warning("Data forecast belum tersedia. Jalankan pipeline terlebih dahulu.")
        return

    df_q = data["quarterly"]

    col1, col2 = st.columns([1, 1])
    with col1:
        metrics = sorted(forecast_df["metric_id"].unique())
        selected_metric = st.selectbox("Pilih Metrik", metrics, key="fc_metric")
    with col2:
        models = sorted(forecast_df[forecast_df["metric_id"] == selected_metric]["model"].unique())
        selected_model = st.selectbox("Pilih Model", models, key="fc_model")

    # Historical data
    hist = df_q[df_q["metric_id"] == selected_metric].sort_values(["year", "quarter"])
    fc = forecast_df[
        (forecast_df["metric_id"] == selected_metric) &
        (forecast_df["model"] == selected_model)
    ].sort_values(["year", "quarter"])

    if hist.empty:
        return

    fig = go.Figure()

    # Historical line
    hist_x = [f"Q{q} {y}" for y, q in zip(hist["year"], hist["quarter"])]
    fig.add_trace(go.Scatter(
        x=hist_x, y=hist["value"],
        name="Historis",
        mode="lines+markers",
        line=dict(color="#64ffda", width=2),
        marker=dict(size=6),
    ))

    if not fc.empty:
        fc_x = [f"Q{q} {y}" for y, q in zip(fc["year"], fc["quarter"])]

        # Connecting line from last historical to first forecast
        connect_x = [hist_x[-1]] + fc_x
        connect_y = [hist["value"].iloc[-1]] + fc["forecast"].tolist()

        # Forecast line
        fig.add_trace(go.Scatter(
            x=connect_x, y=connect_y,
            name="Forecast",
            mode="lines+markers",
            line=dict(color="#ffd166", width=2, dash="dash"),
            marker=dict(size=6, symbol="diamond"),
        ))

        # 80% confidence band
        fig.add_trace(go.Scatter(
            x=fc_x + fc_x[::-1],
            y=fc["upper_80"].tolist() + fc["lower_80"].tolist()[::-1],
            fill="toself",
            fillcolor="rgba(255, 209, 102, 0.15)",
            line=dict(width=0),
            name="CI 80%",
            showlegend=True,
        ))

        # 95% confidence band
        fig.add_trace(go.Scatter(
            x=fc_x + fc_x[::-1],
            y=fc["upper_95"].tolist() + fc["lower_95"].tolist()[::-1],
            fill="toself",
            fillcolor="rgba(255, 209, 102, 0.07)",
            line=dict(width=0),
            name="CI 95%",
            showlegend=True,
        ))

    fig.update_layout(
        template=PLOTLY_TEMPLATE,
        height=500,
        title=f"Forecast {selected_metric} — Model: {selected_model}",
        xaxis_title="Periode",
        yaxis_title="Nilai (Miliar Rp)" if selected_metric not in RATIO_METRICS else "Nilai (%)",
        plot_bgcolor="rgba(10,25,47,0.8)",
        paper_bgcolor="rgba(0,0,0,0)",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    st.plotly_chart(fig, use_container_width=True)

    # Forecast table
    if not fc.empty:
        st.markdown("**Detail Forecast:**")
        display_fc = fc[["year", "quarter", "forecast", "lower_95", "upper_95"]].copy()
        display_fc.columns = ["Tahun", "Kuartal", "Forecast", "Lower 95%", "Upper 95%"]
        st.dataframe(display_fc, use_container_width=True, hide_index=True)


# ============================================================
# SECTION 4: Forecast vs Target
# ============================================================
def section_forecast_vs_target(data: dict):
    st.markdown('<div class="section-header">Forecast vs Target</div>',
                unsafe_allow_html=True)

    forecast_df = data.get("forecast_results", pd.DataFrame())
    df_q = data["quarterly"]

    if forecast_df.empty:
        st.warning("Data forecast belum tersedia.")
        return

    target_metrics = ["revenue", "ebitda", "netinc", "opinc", "fcf"]

    st.markdown("*Target default = nilai terakhir + 5% growth (dapat disesuaikan):*")

    cols = st.columns(len(target_metrics))
    targets = {}

    for i, metric_id in enumerate(target_metrics):
        hist = df_q[df_q["metric_id"] == metric_id].sort_values(["year", "quarter"])
        if hist.empty:
            continue
        default_target = hist["value"].iloc[-1] * 1.05
        with cols[i]:
            targets[metric_id] = st.number_input(
                f"Target {metric_id}",
                value=float(round(default_target, 1)),
                key=f"target_{metric_id}"
            )

    # Gap analysis
    results = []
    for metric_id, target in targets.items():
        fc = forecast_df[forecast_df["metric_id"] == metric_id]
        if fc.empty:
            continue

        # Pakai model dengan MAPE terendah jika available
        best_models = data.get("best_models", pd.DataFrame())
        if not best_models.empty and metric_id in best_models["metric_id"].values:
            best = best_models[best_models["metric_id"] == metric_id]["best_model"].iloc[0]
            model_fc = fc[fc["model"] == best]
        else:
            model_fc = fc[fc["model"] == fc["model"].iloc[0]]

        if model_fc.empty:
            continue

        next_q = model_fc.iloc[0]
        forecast_val = next_q["forecast"]
        gap = ((forecast_val - target) / abs(target)) * 100

        # Status berdasarkan prediction interval
        if forecast_val >= target:
            status = "ON-TRACK"
        elif next_q["upper_95"] >= target:
            status = "AT-RISK"
        else:
            status = "OFF-TRACK"

        results.append({
            "Metrik": metric_id,
            "Model": next_q.get("model", "N/A"),
            "Forecast": f"{forecast_val:.1f}",
            "Target": f"{target:.1f}",
            "Gap (%)": f"{gap:+.1f}%",
            "Status": status,
        })

    if results:
        st.dataframe(pd.DataFrame(results), use_container_width=True, hide_index=True)


# ============================================================
# SECTION 5: Revenue Growth Projection
# ============================================================
def section_revenue_growth(data: dict):
    st.markdown('<div class="section-header">Revenue Growth Projection</div>',
                unsafe_allow_html=True)

    df_q = data["quarterly"]
    forecast_df = data.get("forecast_results", pd.DataFrame())

    hist = df_q[df_q["metric_id"] == "revenue"].sort_values(["year", "quarter"])
    if hist.empty:
        return

    # Hitung QoQ dan YoY growth historis
    hist_vals = hist["value"].values
    qoq_growth = np.concatenate([[np.nan], np.diff(hist_vals) / np.abs(hist_vals[:-1]) * 100])
    hist_x = [f"Q{q} {y}" for y, q in zip(hist["year"], hist["quarter"])]

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                         vertical_spacing=0.08,
                         subplot_titles=("Revenue (Miliar Rp)", "Revenue Growth (QoQ %)"))

    # Revenue bars
    fig.add_trace(go.Bar(
        x=hist_x, y=hist_vals,
        name="Revenue",
        marker_color="#64ffda",
        opacity=0.7,
    ), row=1, col=1)

    # Forecast bars
    if not forecast_df.empty:
        rev_fc = forecast_df[
            (forecast_df["metric_id"] == "revenue") &
            (forecast_df["model"] == forecast_df[forecast_df["metric_id"] == "revenue"]["model"].iloc[0])
        ]
        if not rev_fc.empty:
            fc_x = [f"Q{q} {y}" for y, q in zip(rev_fc["year"], rev_fc["quarter"])]
            fig.add_trace(go.Bar(
                x=fc_x, y=rev_fc["forecast"],
                name="Forecast Revenue",
                marker_color="#ffd166",
                opacity=0.7,
            ), row=1, col=1)

    # Growth line
    fig.add_trace(go.Scatter(
        x=hist_x, y=qoq_growth,
        name="QoQ Growth %",
        mode="lines+markers",
        line=dict(color="#a78bfa", width=2),
        marker=dict(size=5),
    ), row=2, col=1)

    # Zero line
    fig.add_hline(y=0, line_dash="dash", line_color="gray", row=2, col=1)

    fig.update_layout(
        template=PLOTLY_TEMPLATE,
        height=600,
        plot_bgcolor="rgba(10,25,47,0.8)",
        paper_bgcolor="rgba(0,0,0,0)",
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.05, xanchor="right", x=1),
    )
    st.plotly_chart(fig, use_container_width=True)


# ============================================================
# SECTION 6: Anomaly Alert
# ============================================================
def section_anomaly_alert(data: dict):
    st.markdown('<div class="section-header">Anomaly Alert</div>',
                unsafe_allow_html=True)

    anomaly_df = data.get("anomaly_report", pd.DataFrame())

    if anomaly_df.empty:
        st.success("Tidak ada anomali terdeteksi pada periode analisis.")
        return

    # Summary cards
    col1, col2, col3 = st.columns(3)
    n_critical = len(anomaly_df[anomaly_df["severity"] == "CRITICAL"])
    n_warning = len(anomaly_df[anomaly_df["severity"] == "WARNING"])
    n_info = len(anomaly_df[anomaly_df["severity"] == "INFO"])

    col1.metric("CRITICAL", n_critical)
    col2.metric("WARNING", n_warning)
    col3.metric("INFO", n_info)

    # Filter
    severity_filter = st.multiselect(
        "Filter Severity",
        ["CRITICAL", "WARNING", "INFO"],
        default=["CRITICAL", "WARNING"],
        key="anomaly_filter"
    )

    filtered = anomaly_df[anomaly_df["severity"].isin(severity_filter)]
    filtered = filtered.sort_values(["year", "quarter"], ascending=False)

    # Timeline visualization
    if "year" in filtered.columns and "quarter" in filtered.columns:
        filtered["period"] = filtered.apply(
            lambda r: f"Q{int(r['quarter'])} {int(r['year'])}", axis=1
        )

        fig = px.scatter(
            filtered, x="period", y="metric_name",
            color="severity",
            size=filtered["value"].abs().clip(lower=1),
            color_discrete_map={"CRITICAL": "#ff6b6b", "WARNING": "#ffd166", "INFO": "#64ffda"},
            hover_data=["description"],
            title="Timeline Anomali",
        )
        fig.update_layout(
            template=PLOTLY_TEMPLATE,
            height=400,
            plot_bgcolor="rgba(10,25,47,0.8)",
            paper_bgcolor="rgba(0,0,0,0)",
        )
        st.plotly_chart(fig, use_container_width=True)

    # Detail table
    display_cols = ["year", "quarter", "metric_name", "severity", "type", "description"]
    available_cols = [c for c in display_cols if c in filtered.columns]
    st.dataframe(filtered[available_cols], use_container_width=True, hide_index=True)


# ============================================================
# SECTION 7: Model Limitations
# ============================================================
def section_model_limitations(data: dict):
    st.markdown('<div class="section-header">Model Limitations & Disclaimer</div>',
                unsafe_allow_html=True)

    # Evaluation table
    eval_df = data.get("evaluation_report", pd.DataFrame())
    if not eval_df.empty:
        st.markdown("### Evaluasi Model (Walk-Forward Backtest)")

        # Pivot for display
        display = eval_df.pivot_table(
            index="metric_id",
            columns="model",
            values="MAPE",
            aggfunc="first"
        ).round(2)

        st.dataframe(display, use_container_width=True)

        # Best model per metric
        best_df = data.get("best_models", pd.DataFrame())
        if not best_df.empty:
            st.markdown("**Model Terbaik per Metrik (MAPE Terendah):**")
            st.dataframe(best_df, use_container_width=True, hide_index=True)

    # Limitations
    st.markdown("### Batasan Sistem")

    st.markdown("""
    <div class="insight-box">
        <strong>Batasan Usecase (WAJIB DIPATUHI):</strong><br>
        Sistem ini <strong>HANYA</strong> mencakup analisis performa keuangan internal perusahaan.
        <br><br>
        <strong>DILARANG:</strong> Prediksi harga saham, analisis market sentiment,
        prediksi IHSG/kapitalisasi pasar, rekomendasi trading (buy/sell/hold),
        analisis perilaku investor.
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="insight-box insight-box-warning">
        <strong>Limitasi Data:</strong><br>
        • Short time-series: hanya 20 kuartal (2021 Q2 – 2026 Q1)<br>
        • Tidak ada segmentasi regional / produk / customer<br>
        • Tidak ada data budget / realisasi (target menggunakan input manual)<br>
        • Data konsolidasi entity-level saja
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="insight-box">
        <strong>Catatan Model:</strong><br>
        • 20 kuartal tergolong short series — model kompleks (LSTM) WAJIB dibandingkan
          head-to-head dengan baseline sederhana lewat walk-forward backtest<br>
        • Jika LSTM kalah dari baseline, baseline menjadi model default<br>
        • Prediction interval mencerminkan uncertainty yang jujur dari short series<br>
        • Semua data traceable ke CSV sumber — TIDAK ADA fabrikasi data
    </div>
    """, unsafe_allow_html=True)

    st.markdown("### Future Work")
    st.markdown("""
    - Segmentasi regional / produk / subsidiary / customer (jika data tersedia)
    - Integrasi data budget & realisasi untuk Forecast vs Target yang lebih akurat
    - Customer & subscription data untuk analisis churn
    - Real-time data pipeline untuk monitoring kontinu
    """)


# ============================================================
# SIDEBAR
# ============================================================
def sidebar():
    st.sidebar.markdown("# FPIS")
    st.sidebar.markdown("**Financial Performance Intelligence System**")
    st.sidebar.markdown("Telkom Indonesia (TLKM)")
    st.sidebar.markdown("---")

    st.sidebar.markdown("### Navigasi")
    section = st.sidebar.radio(
        "Pilih Section",
        [
            "1. Executive Summary",
            "2. Performance Trend",
            "3. Forecast",
            "4. Forecast vs Target",
            "5. Revenue Growth",
            "6. Anomaly Alert",
            "7. Model Limitations",
        ],
        key="nav"
    )

    st.sidebar.markdown("---")
    st.sidebar.markdown("*Digistar Intern 2026*")
    st.sidebar.markdown("*Usecase 8 — AI Team*")

    return section


# ============================================================
# MAIN
# ============================================================
def main():
    section = sidebar()
    data = load_data()

    # Title
    st.markdown("# FPIS — Financial Performance Intelligence System")
    st.markdown("*Telkom Indonesia (TLKM) — Monitoring & Prediksi Performa Keuangan*")
    st.markdown("---")

    if "1." in section:
        section_executive_summary(data)
    elif "2." in section:
        section_performance_trend(data)
    elif "3." in section:
        section_forecast(data)
    elif "4." in section:
        section_forecast_vs_target(data)
    elif "5." in section:
        section_revenue_growth(data)
    elif "6." in section:
        section_anomaly_alert(data)
    elif "7." in section:
        section_model_limitations(data)

    # Insights bar (always visible)
    insights = data.get("insights_report", pd.DataFrame())
    if not insights.empty:
        with st.expander("Insight Otomatis (Bahasa Indonesia)", expanded=False):
            for _, row in insights.head(10).iterrows():
                severity = row.get("severity", "INFO")
                css_class = "insight-box"
                if severity == "WARNING":
                    css_class += " insight-box-warning"
                elif severity == "CRITICAL":
                    css_class += " insight-box-critical"

                st.markdown(f"""
                <div class="{css_class}">
                    <strong>[{row.get('category', '')}]</strong> {row.get('insight', '')}
                </div>
                """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
