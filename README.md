# FPIS — Financial Performance Intelligence System
## Telkom Indonesia (TLKM) — Usecase 8, Digistar Class Intern 2026

**Live Enterprise Dashboard:** [https://digistarhardskillusecase8.vercel.app/](https://digistarhardskillusecase8.vercel.app/)

---

## Ringkasan

**FPIS** (Financial Performance Intelligence System) adalah sistem berbasis AI untuk monitoring dan prediksi performa keuangan **Telkom Indonesia (TLKM)**. Sistem ini dibangun mengikuti **7 Langkah Playbook** yang ditetapkan sebagai framework pengembangan.

### Mapping ke 7 Langkah Playbook

| Langkah | Deskripsi | Implementasi |
|---------|-----------|-------------|
| 1 | Pengumpulan Data | `src/data_loader.py` — Load 3 CSV, validasi schema, simpan ke SQLite |
| 2 | Pre-processing | `src/preprocessing.py` — Konversi unit, missing values, rasio turunan, feature engineering |
| 3 | Labeling & Segmentasi | `src/segmentation.py` — Kategorisasi 135 metrik ke 6 segment |
| 4 | Integrasi AI Model | `src/models.py` + `src/anomaly.py` — 7 model forecasting + anomaly detection |
| 5 | Analisis Hasil | `src/analysis.py` — 5 kategori insight otomatis (Bahasa Indonesia) |
| 6 | Dashboard | `frontend/` — React/Vite Dashboard, Dark Theme, Recharts interaktif |
| 7 | Evaluasi Model | `src/evaluation.py` — Walk-forward backtest, RMSE/MAE/MAPE |

---

## Cara Run

### 1. Setup Environment

```bash
cd fpis
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Jalankan Pipeline End-to-End

```bash
python run_pipeline.py
```

Pipeline akan mengeksekusi Langkah 1–7 secara berurutan dan menghasilkan:
- `data/fpis.db` — SQLite database
- `outputs/forecast_results.csv` — Hasil forecast semua metrik × semua model
- `outputs/anomaly_report.csv` — Laporan anomali
- `outputs/evaluation_report.csv` — Evaluasi model (RMSE/MAE/MAPE)
- `outputs/best_models.csv` — Model terbaik per metrik
- `outputs/insights_report.csv` — Insight otomatis

### 3. Jalankan Dashboard (React Frontend)

```bash
cd frontend
npm install
npm run dev
```

### 4. Jalankan Unit Tests

```bash
python -m pytest tests/test_ratios.py -v
```

---

## Justifikasi Pemilihan Model

### Tantangan: Short Time-Series (20 Kuartal)

Data kuartalan TLKM hanya mencakup **20 titik data** (Q2 2021 – Q1 2026). Ini tergolong *short series* yang membuat model kompleks rentan overfitting.

### Roster Model

| Model | Kategori | Kompleksitas | Justifikasi |
|-------|----------|-------------|-------------|
| **Naive Seasonal** | Baseline | Rendah | Benchmark minimum — prediksi = nilai kuartal sama tahun lalu |
| **Linear Trend** | Baseline | Rendah | Menangkap trend linier jangka panjang |
| **Holt-Winters** | Time-Series | Sedang | Exponential smoothing dengan seasonal component (4Q) |
| **SARIMA** | Time-Series | Sedang | ARIMA dengan seasonal differencing, cocok untuk pola musiman |
| **XGBoost** | ML Regression | Tinggi | Gradient boosting dengan lag & seasonality features |
| **Random Forest** | ML Regression | Tinggi | Ensemble regression sebagai pembanding XGBoost |
| **LSTM** | Deep Learning | Tinggi | 1-layer LSTM ringan — **WAJIB dibandingkan vs baseline** |

### Mengapa Baseline Penting?

Dengan hanya 20 kuartal:
- Model kompleks (LSTM, XGBoost) memiliki risiko **overfitting** yang tinggi
- Baseline sederhana sering kali memberikan performa yang **kompetitif** atau bahkan lebih baik
- **Transparansi**: jika LSTM kalah dari Naive Seasonal, ini harus didokumentasikan — bukan disembunyikan

**Keputusan**: Model dengan **MAPE terendah** di walk-forward backtest menjadi default di dashboard. LSTM tetap ditampilkan di tabel evaluasi untuk transparansi, terlepas dari performanya.

---

## Hasil Evaluasi

Hasil evaluasi tersedia di `outputs/evaluation_report.csv`. Tabel RMSE/MAE/MAPE per metrik × model akan terisi setelah pipeline dijalankan.

**Model terbaik dipilih berdasarkan MAPE terendah per metrik melalui walk-forward validation.**

---

## Batasan Sistem

### Hard Constraints (WAJIB DIPATUHI)

Sistem **HANYA** mencakup:
- Forecast KPI finansial internal (revenue, EBITDA, laba, aset, liabilitas, ekuitas, rasio, margin)
- Monitoring performa bisnis
- Analisis profitabilitas
- Deteksi anomali finansial
- Early warning performa perusahaan

Sistem **DILARANG** mencakup:
- Prediksi harga saham (TLKM atau saham apapun)
- Analisis market sentiment
- Prediksi IHSG atau kapitalisasi pasar
- Financial trading recommendation (signal buy/sell/hold)
- Analisis perilaku investor

### Limitasi Data & Penggunaan Mock Data (Academic Integrity)

- **Short series**: Hanya 20 kuartal — *uncertainty forecast* besar, *prediction interval* harus jujur ditampilkan.
- **Metrik pasar**: EPS, shares, dividend hanya digunakan sebagai konteks performa internal, **BUKAN** untuk prediksi harga saham.
- **Simulasi Segmentasi (Mock Data)**: Karena data asli konsolidasi Telkom dari sumber publik (BEI/Stockbit) **tidak memiliki rincian segmentasi (Regional, Produk, Budget, Subscribers)**, maka digunakan **Mock Data (Data Simulasi)** khusus untuk bagian visualisasi *Frontend* tersebut. 
  - **Tujuan Simulasi:** Membuktikan bahwa arsitektur AI dan dashboard secara teknis siap (enterprise-ready) untuk menampung dan memvisualisasikan data segmentasi nyata jika kelak diintegrasikan dengan sistem internal perusahaan.
  - **Variabel Dummy:** *Revenue per Regional* (5 Regional Resmi Telkom), *Revenue per Produk* (3 Pilar Bisnis: Digital Connectivity, Digital Platform, Digital Services), dan nilai *Target*.
  - **Catatan Validitas:** Prediksi level agregat (Nasional) tetap akurat 100% karena diproses menggunakan model AI historis riil. Grafik segmentasi hanya berfungsi sebagai visualisasi kapabilitas arsitektur dan tidak mempengaruhi metrik prediksi.

### Future Work

1. Penggunaan data segmentasi riil (menggantikan *mock data*).
2. Real-time data pipeline untuk monitoring kontinu.
3. Model ensemble untuk meningkatkan akurasi forecast di dataset pendek.

---

## Struktur Repository

```
fpis/
├── data/
│   ├── tlkm_financial_data_all.csv     # Raw (wide format)
│   ├── tlkm_quarterly_tidy.csv         # Tidy (20 kuartal)
│   ├── tlkm_annual_tidy.csv            # Tidy (5 FY)
│   └── fpis.db                          # SQLite database
├── src/
│   ├── data_loader.py                   # Langkah 1
│   ├── preprocessing.py                 # Langkah 2
│   ├── segmentation.py                  # Langkah 3
│   ├── models.py                        # Langkah 4 (forecasting)
│   ├── anomaly.py                       # Langkah 4 (anomaly detection)
│   ├── analysis.py                      # Langkah 5
│   └── evaluation.py                    # Langkah 7
├── notebooks/
│   └── 01_eda_fpis.ipynb               # EDA walkthrough
├── outputs/                             # CSV outputs
├── tests/
│   └── test_ratios.py                  # Unit tests
├── frontend/                            # React & Vite Dashboard Frontend
├── scripts/
│   └── generate_mock_data.py            # Generator data simulasi JSON ke Frontend
├── run_pipeline.py                      # Pipeline orchestrator
├── requirements.txt                     # Dependencies
└── README.md                           # Dokumentasi ini
```

---

## Tech Stack

| Tool (Playbook) | Status | Peran |
|-----------------|--------|-------|
| Python | Terimplementasi | Bahasa utama |
| Pandas | Terimplementasi | Data manipulation |
| Scikit-learn | Terimplementasi | ML regression (RF), preprocessing |
| TensorFlow | Terimplementasi | LSTM forecasting |
| Prophet | Terimplementasi | Time-series forecasting |
| XGBoost | Terimplementasi | ML regression |
| Matplotlib | Terimplementasi | Chart di notebook EDA |
| React & Vite | Terimplementasi | Dashboard frontend modern (pengganti Streamlit) |
| Recharts | Terimplementasi | Visualisasi grafik interaktif di frontend |
| SQL (SQLite) | Terimplementasi | Storage layer |
| Node.js & npm | Terimplementasi | Build system untuk frontend |

Plus: Statsmodels (SARIMA/Holt-Winters).

---

## Tim

| Nama | Stream |
|------|--------|
| Brahmayudha Erlangga P. | AI |
| Mhd Rusdi Hakim Lubis | AI |

**Mentor AI:** Nanda Ringga Damanik

---

*Digistar Class Intern 2026 — Usecase 8: Financial Performance Intelligence System*
