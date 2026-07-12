import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, 
  DollarSign, Users, Target, LayoutDashboard, Database, Settings,
  ShieldAlert, FileText, Info
} from 'lucide-react';
import './index.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];

// Utilities
const formatIDR = (val, isPercentage = false) => {
  if (val === undefined || val === null) return 'N/A';
  if (isPercentage) return `${val.toFixed(1)}%`;
  if (Math.abs(val) >= 1000) return `Rp ${(val / 1000).toFixed(2)} T`;
  if (Math.abs(val) >= 1) return `Rp ${val.toFixed(1)} M`;
  return `Rp ${(val * 1000).toFixed(0)} Jt`;
};

// Main App
function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [globalMetric, setGlobalMetric] = useState('revenue');

  useEffect(() => {
    fetch('/data/dashboard.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="dashboard-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><h2>Loading AI Pipeline Data...</h2></div>;
  if (error) return <div className="dashboard-container"><h2>Error: {error}</h2></div>;
  if (!data) return null;

  const metrics = [...new Set(data.historical.map(d => d.metric_id))];

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>FPIS</h2>
          <p>Financial Performance Intelligence System</p>
        </div>
        
        <div className="sidebar-menu">
          <div className="sidebar-section-title">Navigasi Utama</div>
          <div className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>
            <LayoutDashboard size={18} /><span>Executive Dashboard</span>
          </div>
          <div className={`menu-item ${activeMenu === 'data' ? 'active' : ''}`} onClick={() => setActiveMenu('data')}>
            <Database size={18} /><span>Dataset & AI Models</span>
          </div>
          <div className={`menu-item ${activeMenu === 'settings' ? 'active' : ''}`} onClick={() => setActiveMenu('settings')}>
            <Settings size={18} /><span>Settings</span>
          </div>
        </div>

        <div style={{marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem'}}>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Digistar Intern 2026</p>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Usecase 8 — AI Team</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>
              {activeMenu === 'dashboard' && 'Executive Performance Dashboard'}
              {activeMenu === 'data' && 'Dataset & Evaluasi Model AI'}
              {activeMenu === 'settings' && 'System Settings'}
            </h1>
          </div>
          {activeMenu === 'dashboard' && (
            <div className="topbar-controls">
              <div className="metric-select-wrapper">
                <label>Fokus Analisis:</label>
                <select className="metric-select" value={globalMetric} onChange={(e) => setGlobalMetric(e.target.value)}>
                  {metrics.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </header>

        <div className="dashboard-container">
          {activeMenu === 'dashboard' && <DashboardTab data={data} metric={globalMetric} />}
          {activeMenu === 'data' && <DataTab data={data} />}
          {activeMenu === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// TAB 1: EXECUTIVE DASHBOARD
// ==========================================
function DashboardTab({ data, metric }) {
  const [model, setModel] = useState('');
  
  const availableModels = [...new Set(data.forecast.filter(d => d.metric_id === metric).map(d => d.model))];
  
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(model)) {
      setModel(availableModels[0]);
    }
  }, [metric, data]);

  // 1. KPI Cards
  const kpis = [
    { id: 'revenue', label: 'Total Revenue', isNominal: true },
    { id: 'ebitda', label: 'EBITDA', isNominal: true },
    { id: 'netinc', label: 'Net Income', isNominal: true },
    { id: 'opex', label: 'Operating Expenses', isNominal: true }
  ];

  // 2. Forecast Chart Data
  const hist = data.historical.filter(d => d.metric_id === metric);
  const fc = data.forecast.filter(d => d.metric_id === metric && d.model === model);

  let combined = hist.map(d => ({ period: d.period, Actual: d.value_scaled }));
  if (hist.length > 0 && fc.length > 0) {
    const lastHist = hist[hist.length - 1];
    fc.unshift({ period: lastHist.period, forecast: lastHist.value_scaled, lower_80: lastHist.value_scaled, upper_80: lastHist.value_scaled, lower_95: lastHist.value_scaled, upper_95: lastHist.value_scaled });
  }
  
  fc.forEach(f => {
    const existing = combined.find(c => c.period === f.period);
    if (existing) {
      existing.Forecast = f.forecast;
      existing.L80 = f.lower_80; existing.U80 = f.upper_80;
      existing.L95 = f.lower_95; existing.U95 = f.upper_95;
    } else {
      combined.push({ period: f.period, Forecast: f.forecast, L80: f.lower_80, U80: f.upper_80, L95: f.lower_95, U95: f.upper_95 });
    }
  });

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      {/* SECTION: KPI Cards */}
      <div className="kpi-grid">
        {kpis.map(kpi => {
          const metricData = data.historical.filter(d => d.metric_id === kpi.id);
          if (metricData.length < 2) return null;
          
          const last = metricData[metricData.length - 1];
          const prev = metricData[metricData.length - 2];
          const qoq = prev.value_scaled !== 0 ? ((last.value_scaled - prev.value_scaled) / Math.abs(prev.value_scaled)) * 100 : 0;
          
          const isAnomaly = data.anomalies.some(a => a.metric_id === kpi.id && a.period === last.period && a.severity === 'CRITICAL');
          
          return (
            <div className="glass-card" key={kpi.id} style={{marginBottom: 0}}>
              <div className="card-title">
                {kpi.label}
                {isAnomaly ? <span className="badge badge-critical" style={{marginLeft: 'auto'}}>ANOMALI</span> 
                           : <span className="badge badge-healthy" style={{marginLeft: 'auto'}}>SEHAT</span>}
              </div>
              <div className="kpi-value">{formatIDR(last.value_scaled, !kpi.isNominal)}</div>
              <div className={`kpi-trend ${qoq >= 0 ? 'trend-up' : 'trend-down'}`}>
                {qoq >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                {Math.abs(qoq).toFixed(1)}% vs Kuartal Lalu
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION: Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className="glass-card">
          <div className="card-title"><Activity size={18}/> AI Predictive Insights</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {data.insights.slice(0, 3).map((ins, i) => (
              <div key={i} className={`alert-box ${ins.severity === 'CRITICAL' ? '' : ins.severity === 'WARNING' ? 'warning' : 'info'}`} style={{marginBottom: 0, padding: '0.75rem'}}>
                <div className="alert-desc"><strong>[{ins.category}]</strong> {ins.insight}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: MAIN FORECAST CHART */}
      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <div className="card-title" style={{marginBottom: 0}}>AI Forecast vs Target ({metric.toUpperCase()})</div>
          
          <div className="metric-select-wrapper" style={{padding: '0.25rem 0.75rem', background: 'rgba(0,0,0,0.2)'}}>
            <label>Model AI Prediksi:</label>
            <select className="metric-select" style={{color: 'var(--accent-blue)'}} value={model} onChange={(e) => setModel(e.target.value)}>
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ComposedChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} formatter={(val) => formatIDR(val)} />
              <Legend />
              <Area type="monotone" dataKey="U95" fill="rgba(245, 158, 11, 0.05)" stroke="none" name="Upper 95%" />
              <Area type="monotone" dataKey="L95" fill="var(--bg-card)" stroke="none" name="Lower 95%" />
              <Area type="monotone" dataKey="U80" fill="rgba(245, 158, 11, 0.15)" stroke="none" name="Upper 80%" />
              <Area type="monotone" dataKey="L80" fill="var(--bg-card)" stroke="none" name="Lower 80%" />
              <Line type="monotone" dataKey="Actual" stroke="#64ffda" strokeWidth={2} dot={{r:3}} />
              <Line type="monotone" dataKey="Forecast" stroke="#ffd166" strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION: Segmentations & Anomalies */}
      <div className="chart-grid" style={{gridTemplateColumns: '1fr 1fr 1.5fr'}}>
        {/* Regional */}
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Regional Share</div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={data.regional || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={80} />
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="value" fill="var(--accent-blue)" radius={[0, 4, 4, 0]}>
                  {data.regional && data.regional.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product */}
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Product Mix</div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.product || []} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {data.product && data.product.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Anomaly Mini-Table */}
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title"><ShieldAlert size={18} color="var(--danger)"/> Recent Anomalies</div>
          <div style={{maxHeight: '250px', overflowY: 'auto'}}>
            <table className="data-table" style={{fontSize: '0.75rem'}}>
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Metrik</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies && data.anomalies.slice(0,6).map((a, i) => (
                  <tr key={i}>
                    <td>{a.period}</td>
                    <td>{a.metric_id || a.metric_name}</td>
                    <td>
                      <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                        {a.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 2: DATA & MODELS
// ==========================================
function DataTab({ data }) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div className="glass-card">
        <div className="card-title">Evaluasi Model AI (Walk-Forward Backtest)</div>
        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
          Semua algoritma telah diuji menggunakan simulasi data historis (backtesting) untuk mencari yang paling akurat memprediksi per kuartal.
        </p>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik Uji</th>
                <th>Algoritma (Model)</th>
                <th>MAPE (%)</th>
                <th>RMSE (Miliar Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.evaluations.map((e, i) => (
                <tr key={i}>
                  <td><strong>{e.metric_id.toUpperCase()}</strong></td>
                  <td>{e.model}</td>
                  <td>{e.MAPE !== undefined ? e.MAPE.toFixed(2) : 'N/A'}%</td>
                  <td>{e.RMSE !== undefined ? e.RMSE.toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="split-grid">
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Model Rekomendasi (Terbaik)</div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metrik</th>
                  <th>Model Terbaik</th>
                  <th>MAPE (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.best_models.map((b, i) => (
                  <tr key={i}>
                    <td><strong>{b.metric_id.toUpperCase()}</strong></td>
                    <td style={{color: 'var(--accent-blue)', fontWeight: 'bold'}}>{b.best_model}</td>
                    <td>{b.MAPE !== undefined ? b.MAPE.toFixed(2) : 'N/A'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title"><Info size={18}/> Limitasi & Disclaimer AI</div>
          <div className="alert-box warning">
            <AlertCircle color="var(--warning)" style={{flexShrink: 0}} />
            <div>
              <div className="alert-title">Dataset Keuangan (Short Time-Series)</div>
              <div className="alert-desc">
                Data Telkom yang tersedia hanya 20 kuartal (2021-2026). Model Deep Learning seperti LSTM bisa saja kalah akurat (overfitting) dibanding model klasik (ARIMA/Holt-Winters) pada data sesingkat ini. Oleh karena itu, kita menjalankan <b>semua model</b> dan membuktikan hasilnya secara empiris di tabel kiri.
              </div>
            </div>
          </div>
          <div className="alert-box info">
            <Info color="var(--info)" style={{flexShrink: 0}} />
            <div>
              <div className="alert-title">Batasan Usecase FPIS</div>
              <div className="alert-desc">
                Sistem ini murni dikhususkan untuk FP&A (Financial Planning & Analysis) performa fundamental internal B2B. <b>Dilarang keras</b> menggunakannya untuk tebak-tebakan harga saham, trading, atau market sentiment karena parameter eksternal (makroekonomi) belum diikutsertakan.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 3: SETTINGS
// ==========================================
function SettingsTab() {
  return (
    <div className="glass-card">
      <div className="card-title">System Settings</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        <div className="alert-box info">
          Halaman ini mensimulasikan konfigurasi sistem level enterprise.
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-glass)'}}>
          <div>
            <strong>Email Alerts (Anomali Kritis)</strong>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Kirim peringatan seketika ke jajaran BOD jika ada anomali terdeteksi.</p>
          </div>
          <div className="radio-group">
            <div className="radio-label active">ON</div>
            <div className="radio-label">OFF</div>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-glass)'}}>
          <div>
            <strong>Auto-Refresh Dashboard</strong>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Tarik data real-time dari ERP (SAP) setiap 15 menit.</p>
          </div>
          <div className="radio-group">
            <div className="radio-label active">ON</div>
            <div className="radio-label">OFF</div>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem'}}>
          <div>
            <strong>Confidence Interval Band</strong>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Tampilkan rentang probabilitas prediksi di grafik utama.</p>
          </div>
          <select className="form-select" style={{background: 'var(--bg-sidebar)', padding: '0.5rem', borderRadius: '4px'}}>
            <option>80% & 95% (Default)</option>
            <option>95% Only</option>
            <option>Hidden</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default App;
