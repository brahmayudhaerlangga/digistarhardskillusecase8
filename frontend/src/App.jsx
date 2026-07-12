import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, 
  DollarSign, Users, Target, LayoutDashboard, Database, Settings,
  ShieldAlert, FileText, Info, BarChart2
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
  
  // Global Settings State
  const [ciVisibility, setCiVisibility] = useState('80% & 95% (Default)');
  const [emailAlerts, setEmailAlerts] = useState('ON');
  const [autoRefresh, setAutoRefresh] = useState('ON');

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

  // Hardcode core metrics for clarity, instead of showing all 16 technical ratios
  const coreMetrics = ['revenue', 'ebitda', 'netinc', 'opinc', 'opex', 'ncfo', 'fcf'];

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
                  {coreMetrics.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </header>

        <div className="dashboard-container">
          {activeMenu === 'dashboard' && <DashboardTab data={data} metric={globalMetric} ciVisibility={ciVisibility} />}
          {activeMenu === 'data' && <DataTab data={data} />}
          {activeMenu === 'settings' && (
            <SettingsTab 
              ciVisibility={ciVisibility} setCiVisibility={setCiVisibility}
              emailAlerts={emailAlerts} setEmailAlerts={setEmailAlerts}
              autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// TAB 1: EXECUTIVE DASHBOARD
// ==========================================
function DashboardTab({ data, metric, ciVisibility }) {
  const [model, setModel] = useState('');
  
  const availableModels = [...new Set(data.forecast.filter(d => d.metric_id === metric).map(d => d.model))];
  
  useEffect(() => {
    if (availableModels.length > 0) {
      if (!availableModels.includes(model)) {
        setModel(availableModels[0]);
      }
    } else {
      setModel('');
    }
  }, [metric, data]);

  const handleModelChange = (e) => {
    setModel(e.target.value);
  };

  // KPI Target Inputs State (For the Gap Analysis section)
  // Fix: We store raw strings here to prevent formatting bugs during user typing
  const [targets, setTargets] = useState({});
  useEffect(() => {
    const initialTargets = {};
    ['revenue', 'ebitda', 'netinc'].forEach(m => {
      const h = data.historical.filter(d => d.metric_id === m);
      if (h.length > 0) {
        const valInBillions = h[h.length - 1].value_scaled * 1.05; // 5% growth
        initialTargets[m] = (valInBillions / 1000).toFixed(2); // Store as Trillions string
      }
    });
    setTargets(initialTargets);
  }, [data]);

  const handleTargetChange = (m, val) => {
    // Store raw string without formatting
    setTargets(prev => ({...prev, [m]: val}));
  };

  const getNumericTarget = (m) => {
    const raw = targets[m];
    if (!raw || isNaN(parseFloat(raw))) return 0;
    return parseFloat(raw) * 1000; // Convert Trillions to Billions
  };

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

  // Generate target line
  const currentTarget = getNumericTarget(metric) || (hist.length > 0 ? hist[hist.length-1].value_scaled * 1.05 : 0);

  let combined = hist.map(d => ({ 
    period: d.period, 
    Actual: d.value_scaled,
    Target: null
  }));
  
  if (hist.length > 0 && fc.length > 0) {
    const lastHist = hist[hist.length - 1];
    fc.unshift({ 
      period: lastHist.period, 
      forecast: lastHist.value_scaled, 
      lower_80: lastHist.value_scaled, 
      upper_80: lastHist.value_scaled, 
      lower_95: lastHist.value_scaled, 
      upper_95: lastHist.value_scaled 
    });
    // Disconnect Target from historical data so it renders as a flat threshold benchmark
  }
  
  const lastHistVal = hist.length > 0 ? hist[hist.length-1].value_scaled : 0;

  fc.forEach((f, i) => {
    // Treat the target as a constant benchmark threshold (flat line) across quarters
    let stepTarget = currentTarget;

    const existing = combined.find(c => c.period === f.period);
    if (existing) {
      existing.Forecast = f.forecast;
      existing.L80 = f.lower_80; existing.U80 = f.upper_80;
      existing.L95 = f.lower_95; existing.U95 = f.upper_95;
      existing.Target = stepTarget;
    } else {
      combined.push({ 
        period: f.period, 
        Forecast: f.forecast, 
        L80: f.lower_80, U80: f.upper_80, 
        L95: f.lower_95, U95: f.upper_95,
        Target: stepTarget
      });
    }
  });

  // Settings visibility
  const show95 = ciVisibility.includes('95%');
  const show80 = ciVisibility.includes('80%');

  // Revenue Growth Data (Section 5)
  const revHist = data.historical.filter(d => d.metric_id === 'revenue');
  const revFc = data.forecast.filter(d => d.metric_id === 'revenue' && d.model === (availableModels[0] || 'Naive Seasonal'));
  const growthData = [];
  
  revHist.forEach((h, i) => {
    let qoq = 0;
    if (i > 0) qoq = ((h.value_scaled - revHist[i-1].value_scaled) / Math.abs(revHist[i-1].value_scaled)) * 100;
    growthData.push({ period: h.period, Revenue: h.value_scaled, Growth: qoq });
  });
  
  if (revFc.length > 0 && revHist.length > 0) {
    let prevVal = revHist[revHist.length-1].value_scaled;
    revFc.forEach(f => {
      let qoq = ((f.forecast - prevVal) / Math.abs(prevVal)) * 100;
      growthData.push({ period: f.period, ForecastRev: f.forecast, Growth: qoq });
      prevVal = f.forecast;
    });
  }

  // Target Table logic
  const targetResults = ['revenue', 'ebitda', 'netinc'].map(m => {
    const mFc = data.forecast.filter(d => d.metric_id === m);
    if (mFc.length === 0) return null;
    const modelFc = mFc.filter(d => d.model === mFc[0].model);
    const nextQ = modelFc[0]; 
    const t = getNumericTarget(m);
    const gap = t !== 0 ? ((nextQ.forecast - t) / Math.abs(t)) * 100 : 0;
    let status = "OFF-TRACK";
    let statusColor = "var(--danger)";
    if (nextQ.forecast >= t) { status = "ON-TRACK"; statusColor = "var(--success)"; }
    else if (nextQ.upper_95 >= t) { status = "AT-RISK"; statusColor = "var(--warning)"; }
    return { m, nextQ, t, gap, status, statusColor };
  }).filter(Boolean);

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
          <div className="card-title"><Activity size={18}/> Financial Summary & Predictive Insights</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {data.insights.slice(0, 3).map((ins, i) => (
              <div key={i} className={`alert-box ${ins.severity === 'CRITICAL' ? '' : ins.severity === 'WARNING' ? 'warning' : 'info'}`} style={{marginBottom: 0, padding: '0.75rem'}}>
                <div className="alert-desc"><strong>[{ins.category}]</strong> {ins.insight}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: TARGET TABLE (Gap Analysis) */}
      <div className="glass-card">
        <div className="card-title"><Target size={18}/> Forecast vs Target (Gap Analysis)</div>
        <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem'}}>
          Ubah nilai Target pada kolom input untuk melakukan simulasi pencapaian secara instan.
        </p>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik Utama</th>
                <th>AI Forecast Kuartal Depan</th>
                <th>Target Perusahaan (Input)</th>
                <th>Kesenjangan (Gap %)</th>
                <th>Status Pencapaian</th>
              </tr>
            </thead>
            <tbody>
              {targetResults.map(res => (
                <tr key={res.m}>
                  <td><strong>{res.m.toUpperCase()}</strong></td>
                  <td>{formatIDR(res.nextQ.forecast)}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.35rem'}}>
                      <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Rp</span>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{width: '70px', textAlign: 'right', padding: '0.15rem'}} 
                        value={targets[res.m] !== undefined ? targets[res.m] : ''} 
                        onChange={(e) => handleTargetChange(res.m, e.target.value)} 
                        step="0.1"
                      />
                      <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>T</span>
                    </div>
                  </td>
                  <td style={{color: res.gap >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold'}}>
                    {res.gap > 0 ? '+' : ''}{res.gap.toFixed(1)}%
                  </td>
                  <td><span className="badge" style={{backgroundColor: res.statusColor, color: '#fff'}}>{res.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: MAIN FORECAST CHART */}
      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <div className="card-title" style={{marginBottom: 0}}>
            <ChartIcon size={18}/> Prediksi AI: {metric.toUpperCase()} Actual vs Forecast vs Target
          </div>
          
          <div className="metric-select-wrapper" style={{padding: '0.25rem 0.75rem', background: 'rgba(0,0,0,0.2)'}}>
            <label>Model Prediksi:</label>
            <select className="metric-select" style={{color: 'var(--accent-blue)'}} value={model} onChange={handleModelChange}>
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 450 }}>
          <ResponsiveContainer>
            <ComposedChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border-glass)'}} formatter={(val) => formatIDR(val)} />
              <Legend verticalAlign="top" height={36}/>
              
              {/* Highlighted Confidence Intervals - opacity increased */}
              {show95 && <Area type="monotone" dataKey="U95" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" strokeWidth={0} name="Upper 95% CI" />}
              {show95 && <Area type="monotone" dataKey="L95" fill="var(--bg-card)" stroke="none" name="Lower 95% CI (Mask)" legendType="none" />}
              {show80 && <Area type="monotone" dataKey="U80" fill="rgba(245, 158, 11, 0.45)" stroke="#f59e0b" strokeWidth={0} name="Upper 80% CI" />}
              {show80 && <Area type="monotone" dataKey="L80" fill="var(--bg-card)" stroke="none" name="Lower 80% CI (Mask)" legendType="none" />}
              
              <Line type="monotone" dataKey="Actual" stroke="#64ffda" strokeWidth={3} dot={{r:4}} />
              <Line type="monotone" dataKey="Forecast" stroke="#ffd166" strokeWidth={3} strokeDasharray="5 5" />
              <Line type="linear" dataKey="Target" stroke="#ec4899" strokeWidth={2} strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION: Revenue Growth Projection */}
      <div className="glass-card">
        <div className="card-title"><BarChart2 size={18}/> Revenue Growth Projection (Kuartal ke Kuartal)</div>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <ComposedChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis yAxisId="left" stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-purple)" tickFormatter={val => `${val}%`} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} />
              <Legend verticalAlign="top" height={36}/>
              <Bar yAxisId="left" dataKey="Revenue" fill="#3b82f6" opacity={0.8} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="ForecastRev" fill="#f59e0b" opacity={0.8} name="Forecast Revenue" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="Growth" stroke="#c084fc" strokeWidth={3} dot={{r: 4, fill: '#c084fc'}} name="QoQ Growth (%)" />
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
        
        {/* Anomaly Mini-Table & SOP */}
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title"><ShieldAlert size={18} color="var(--danger)"/> Recent Anomalies & SOP</div>
          
          <div style={{marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
            <strong>SOP Tindakan:</strong><br/>
            <span style={{color: 'var(--danger)'}}>● CRITICAL:</span> Penurunan ekstrem di luar margin batas bawah, perlu eskalasi segera ke BOD.<br/>
            <span style={{color: 'var(--warning)'}}>● WARNING:</span> Penyimpangan minor, instruksikan FP&A lokal untuk meninjau kuartal depan.<br/>
            <span style={{color: 'var(--info)'}}>● INFO:</span> Anomali positif atau kewajaran data, sekadar pelaporan tanpa perlu tindakan.
          </div>

          <div style={{maxHeight: '180px', overflowY: 'auto'}}>
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
                      <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : a.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>
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

// ChartIcon for React component
function ChartIcon({ size }) {
  return <TrendingUp size={size} />;
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
                    {/* Fixed: Use b.best_MAPE instead of b.MAPE based on CSV column */}
                    <td>{b.best_MAPE !== undefined ? b.best_MAPE.toFixed(2) : 'N/A'}%</td>
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
function SettingsTab({ 
  ciVisibility, setCiVisibility, 
  emailAlerts, setEmailAlerts, 
  autoRefresh, setAutoRefresh 
}) {
  return (
    <div className="glass-card">
      <div className="card-title">System Settings</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        <div className="alert-box info">
          Halaman ini mengonfigurasi parameter dashboard secara real-time.
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-glass)'}}>
          <div>
            <strong>Email Alerts (Anomali Kritis)</strong>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Kirim peringatan seketika ke jajaran BOD jika ada anomali terdeteksi.</p>
          </div>
          <div className="radio-group">
            <div className={`radio-label ${emailAlerts === 'ON' ? 'active' : ''}`} onClick={() => setEmailAlerts('ON')}>ON</div>
            <div className={`radio-label ${emailAlerts === 'OFF' ? 'active' : ''}`} onClick={() => setEmailAlerts('OFF')}>OFF</div>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-glass)'}}>
          <div>
            <strong>Auto-Refresh Dashboard</strong>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Tarik data real-time dari ERP (SAP) setiap 15 menit.</p>
          </div>
          <div className="radio-group">
            <div className={`radio-label ${autoRefresh === 'ON' ? 'active' : ''}`} onClick={() => setAutoRefresh('ON')}>ON</div>
            <div className={`radio-label ${autoRefresh === 'OFF' ? 'active' : ''}`} onClick={() => setAutoRefresh('OFF')}>OFF</div>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '1rem'}}>
          <div>
            <strong>Confidence Interval Band</strong>
            <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Tampilkan rentang probabilitas prediksi di grafik utama Executive Dashboard.</p>
          </div>
          <select 
            className="form-select" 
            style={{background: 'var(--bg-sidebar)', padding: '0.5rem', borderRadius: '4px'}}
            value={ciVisibility}
            onChange={(e) => setCiVisibility(e.target.value)}
          >
            <option value="80% & 95% (Default)">80% & 95% (Default)</option>
            <option value="95% Only">95% Only</option>
            <option value="Hidden">Hidden</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default App;
