# FPIS — Project Handover & Architecture Document

Dokumen ini disusun sebagai panduan *handover* untuk tim AI internal agar dapat memahami arsitektur, isi *codebase*, *engine* yang digunakan, serta fitur-fitur yang ada di dalam *dashboard* FPIS (Financial Performance Intelligence System).

---

## 1. Arsitektur & Alur Pipeline (End-to-End)

Sistem ini didesain menggunakan framework **7 Langkah Playbook**. Semua proses orkestrasi dijalankan melalui file `run_pipeline.py` yang akan mengeksekusi modul-modul di dalam folder `src/` secara sekuensial.

*   **`src/data_loader.py` (Langkah 1):** 
    Membaca *raw CSV* (quarterly dan annual), melakukan validasi tipe data dan duplikasi, lalu menyimpannya ke dalam `data/fpis.db` (SQLite) agar proses selanjutnya lebih cepat.
*   **`src/preprocessing.py` (Langkah 2):** 
    Menangani *missing values*, mengubah format pecahan ke persentase secara terpusat, dan membuat perhitungan rasio turunan lintas-*statement* (seperti ROA dan ROE). Di sini juga *feature engineering* dilakukan (`lag_1` sampai `lag_4`, `rolling_mean_4Q`) yang nantinya dipakai oleh model *Machine Learning*.
*   **`src/segmentation.py` (Langkah 3):** 
    Mengkategorikan 135 metrik ke dalam 6 segment (Profitability, Liquidity, dll).
*   **`src/models.py` (Langkah 4a):**
    Melakukan *forecasting* untuk horizon 4 kuartal ke depan menggunakan berbagai *engine* algoritma (Holt-Winters, SARIMA, XGBoost, Random Forest, LSTM).
*   **`src/evaluation.py` (Langkah 7):** 
    Skrip validasi (*Walk-Forward Backtesting*) yang menghitung metrik eror (RMSE, MAE, MAPE) dan *Directional Accuracy*. Modul ini bertugas mencari model terbaik (MAPE terendah) per metrik dan menyimpannya ke `best_models.csv`. Dieksekusi sebelum analisis agar *insight* dapat langsung melabeli model terbaik secara akurat.
*   **`src/anomaly.py` (Langkah 4b):**
    Deteksi anomali ganda (statistik z-score/IQR pada *growth rates*, dan *rule-based domain knowledge* seperti penurunan margin yang divalidasi langsung dari *best forecast*).
*   **`src/analysis.py` (Langkah 5):** 
    Mengonversi output *raw* (angka) menjadi teks *insight* otomatis berbahasa Indonesia formal dengan label *severity* (CRITICAL/WARNING/INFO). Semua probabilitas ditarik dari metrik *best model* evaluasi.
*   **`app.py` (Langkah 6):** 
    Dashboard Streamlit yang membaca langsung dari *database* SQLite dan output CSV.

---

## 2. Rincian "Engine" & Model AI yang Digunakan

Karena data *quarterly* Telkom (TLKM) yang diberikan sangat terbatas (*short time-series*, hanya 20 kuartal/5 tahun), sistem sengaja tidak hanya bergantung pada *Deep Learning*. Kami menyediakan **7 roster model** untuk diadu akurasinya.

1.  **Baseline Models (Naive Seasonal & Linear Trend):** Digunakan sebagai *benchmark*. Pada data *short-series*, seringkali *Naive Seasonal* (memakai nilai kuartal yang sama di tahun lalu) sulit dikalahkan.
2.  **Statistical Models (Holt-Winters & SARIMA):** Menggunakan *library* `statsmodels`. SARIMA dikonfigurasi untuk menangani *seasonality* 4 kuartal.
3.  **Machine Learning Regressors (XGBoost & Random Forest Regressor):** Menggunakan *library* `xgboost` dan `scikit-learn`. Model ini dilatih secara *iterative forecasting* memanfaatkan fitur `lag` dan `rolling_mean` dari modul preprocessing.
4.  **Deep Learning (LSTM):** Menggunakan *library* `tensorflow/keras`. Dibuat dengan arsitektur 1-layer ringan (32 unit) dengan *lookback* 4 kuartal untuk mencegah *overfitting* yang parah pada sampel sekecil ini.

**Mekanisme Pemilihan Model:** 
Di dalam `evaluation.py`, sistem melakukan *walk-forward validation* (expanding window) dengan batas latih awal 8 kuartal. MAPE rata-rata dari seluruh horizon validasi dihitung. Model dengan MAPE terkecil (terbaik) dicatat di `best_models.csv` dan akan digunakan secara *default* oleh Dashboard Streamlit.

---

## 3. Rincian Fitur Dashboard (`app.py`)

Dashboard dibangun menggunakan `Streamlit` dengan visualisasi grafik dari `Plotly`. Berikut adalah 7 fitur/section yang ada di dalam dashboard beserta dari mana datanya diambil:

1.  **Executive Financial Summary:** 
    Berisi kotak-kotak KPI (*metric cards*) untuk Revenue, EBITDA, Laba Bersih, dll. Menampilkan nilai *quarter* terakhir dan persentase perubahan YoY (Year-on-Year). Di sini juga muncul *badge* (seperti `ANOMALI` atau `PERHATIAN`) yang di-trigger jika metrik tersebut terdeteksi oleh `anomaly_report.csv`.
2.  **Financial Performance Trend:** 
    Grafik *line chart* interaktif (*Quarterly* atau *Annual*) untuk memonitor tren metrik berdasarkan kategorinya (Segmentasi).
3.  **Forecast (Proyeksi 4 Kuartal):** 
    Visualisasi gabungan antara data historis masa lalu (garis solid) dan proyeksi masa depan (garis putus-putus). Dilengkapi area *Confidence Interval* (80% dan 95%) agar pengguna menyadari limitasi *uncertainty* (ketidakpastian) dari prediksi *short time-series*.
4.  **Forecast vs Target:** 
    Tabel monitoring target. Karena ketiadaan *data budget* di *dataset*, pengguna dapat melakukan *input target* (secara default diisi nilai terakhir +5% growth). AI akan mengecek batas bawah *prediction interval*; jika terlalu rendah, status akan berubah menjadi `AT-RISK` atau `OFF-TRACK`.
5.  **Revenue Growth Projection:** 
    Kombinasi *bar chart* (absolut revenue) dan *line chart* (persentase QoQ growth) yang membentang dari data historis hingga ke data *forecast*.
6.  **Anomaly Alert:** 
    Tabel *timeline* detektif finansial. Menampilkan deskripsi *insight* dari skrip `anomaly.py`. Terdapat fitur *filter* berdasarkan *Severity* (Critical, Warning, Info) dan visualisasi *scatter plot* untuk melihat distribusi anomali di sepanjang kuartal.
7.  **Model Limitations & Disclaimer:** 
    Tabel transparansi hasil *Walk-Forward Backtesting* (menampilkan nilai MAPE seluruh model). Di section ini juga ditegaskan bahwa sistem dipasang *hard constraints* dan **TIDAK MENCAPUP** prediksi harga saham atau *trading recommendation*.

*(Note: Ada satu fitur tambahan di bagian bawah aplikasi bernama **Insight Otomatis**, yang menempel secara permanen untuk memberikan rangkuman berbasis teks bahasa Indonesia dari skrip `analysis.py`).*

---

## 4. Struktur Output Files

Apabila Anda butuh mengakses langsung *raw output* AI untuk integrasi ke *tools* lain (misal Power BI atau sistem lain), Anda dapat melihat folder `outputs/`:
*   `forecast_results.csv`: Keseluruhan hasil prediksi dari 7 model lengkap dengan *confidence intervals*.
*   `forecast_fy2026.csv`: Data agregasi yang sudah digabung menjadi proyeksi tahunan (*Full Year*).
*   `anomaly_report.csv`: Data anomali terdeteksi.
*   `insights_report.csv`: Kalimat teks *insight* siap baca.
*   `evaluation_report.csv` & `best_models.csv`: Hasil *scoring* akurasi model.
