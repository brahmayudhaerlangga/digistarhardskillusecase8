import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, 
  DollarSign, Users, Target, LayoutDashboard, LineChart as ChartIcon, 
  Crosshair, BarChart2, ShieldAlert, FileText, Info
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
  
  const [activeMenu, setActiveMenu] = useState('1');

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
          <div className={`menu-item ${activeMenu === '1' ? 'active' : ''}`} onClick={() => setActiveMenu('1')}>
            <LayoutDashboard size={18} /><span>1. Executive Summary</span>
          </div>
          <div className={`menu-item ${activeMenu === '2' ? 'active' : ''}`} onClick={() => setActiveMenu('2')}>
            <ChartIcon size={18} /><span>2. Performance Trend</span>
          </div>
          <div className={`menu-item ${activeMenu === '3' ? 'active' : ''}`} onClick={() => setActiveMenu('3')}>
            <Activity size={18} /><span>3. AI Forecast</span>
          </div>
          <div className={`menu-item ${activeMenu === '4' ? 'active' : ''}`} onClick={() => setActiveMenu('4')}>
            <Crosshair size={18} /><span>4. Forecast vs Target</span>
          </div>
          <div className={`menu-item ${activeMenu === '5' ? 'active' : ''}`} onClick={() => setActiveMenu('5')}>
            <BarChart2 size={18} /><span>5. Revenue Growth</span>
          </div>
          <div className={`menu-item ${activeMenu === '6' ? 'active' : ''}`} onClick={() => setActiveMenu('6')}>
            <ShieldAlert size={18} /><span>6. Anomaly Alert</span>
          </div>
          <div className={`menu-item ${activeMenu === '7' ? 'active' : ''}`} onClick={() => setActiveMenu('7')}>
            <FileText size={18} /><span>7. Model Limitations</span>
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
              {activeMenu === '1' && 'Executive Financial Summary'}
              {activeMenu === '2' && 'Financial Performance Trend'}
              {activeMenu === '3' && 'Forecast — Proyeksi 4 Kuartal'}
              {activeMenu === '4' && 'Forecast vs Target Gap Analysis'}
              {activeMenu === '5' && 'Revenue Growth Projection'}
              {activeMenu === '6' && 'Anomaly Alert System'}
              {activeMenu === '7' && 'Model Limitations & Disclaimer'}
            </h1>
          </div>
        </header>

        <div className="dashboard-container">
          {activeMenu === '1' && <Section1 data={data} />}
          {activeMenu === '2' && <Section2 data={data} />}
          {activeMenu === '3' && <Section3 data={data} />}
          {activeMenu === '4' && <Section4 data={data} />}
          {activeMenu === '5' && <Section5 data={data} />}
          {activeMenu === '6' && <Section6 data={data} />}
          {activeMenu === '7' && <Section7 data={data} />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// SECTION 1: Executive Summary
// ==========================================
function Section1({ data }) {
  const kpis = [
    { id: 'revenue', label: 'Total Revenue', isNominal: true },
    { id: 'ebitda', label: 'EBITDA', isNominal: true },
    { id: 'netinc', label: 'Net Income', isNominal: true },
    { id: 'opex', label: 'Operating Expenses', isNominal: true }
  ];

  const hist = data.historical;

  return (
    <div className="kpi-grid">
      {kpis.map(kpi => {
        const metricData = hist.filter(d => d.metric_id === kpi.id);
        if (metricData.length < 2) return null;
        
        const last = metricData[metricData.length - 1];
        const prev = metricData[metricData.length - 2];
        const qoq = prev.value_scaled !== 0 ? ((last.value_scaled - prev.value_scaled) / Math.abs(prev.value_scaled)) * 100 : 0;
        
        // Check anomaly
        const isAnomaly = data.anomalies.some(a => a.metric_id === kpi.id && a.period === last.period && a.severity === 'CRITICAL');
        
        return (
          <div className="glass-card" key={kpi.id}>
            <div className="card-title">
              {kpi.label} — {last.period}
              {isAnomaly ? <span className="badge badge-critical" style={{marginLeft: 'auto'}}>ANOMALI</span> 
                         : <span className="badge badge-healthy" style={{marginLeft: 'auto'}}>SEHAT</span>}
            </div>
            <div className="kpi-value">{formatIDR(last.value_scaled, !kpi.isNominal)}</div>
            <div className={`kpi-trend ${qoq >= 0 ? 'trend-up' : 'trend-down'}`}>
              {qoq >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
              {Math.abs(qoq).toFixed(1)}% QoQ
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// SECTION 2: Performance Trend
// ==========================================
function Section2({ data }) {
  const [metric, setMetric] = useState('revenue');
  const metrics = [...new Set(data.historical.map(d => d.metric_id))];

  const chartData = data.historical.filter(d => d.metric_id === metric);

  return (
    <div className="glass-card">
      <div className="controls-row">
        <div className="control-group">
          <label>Pilih Metrik</label>
          <select className="form-select" value={metric} onChange={(e) => setMetric(e.target.value)} style={{borderBottom: '1px solid var(--border-glass)', padding: '0.25rem'}}>
            {metrics.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
            <XAxis dataKey="period" stroke="var(--text-muted)" />
            <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
            <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} formatter={(val) => formatIDR(val)} />
            <Line type="monotone" dataKey="value_scaled" name={metric} stroke="var(--accent-blue)" strokeWidth={3} dot={{r:4}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==========================================
// SECTION 3: Forecast
// ==========================================
function Section3({ data }) {
  const [metric, setMetric] = useState('revenue');
  const [model, setModel] = useState('');
  
  const metrics = [...new Set(data.forecast.map(d => d.metric_id))];
  
  useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(metric)) setMetric(metrics[0]);
  }, [data]);

  const availableModels = [...new Set(data.forecast.filter(d => d.metric_id === metric).map(d => d.model))];
  
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(model)) {
      setModel(availableModels[0]);
    }
  }, [metric, data]);

  const hist = data.historical.filter(d => d.metric_id === metric);
  const fc = data.forecast.filter(d => d.metric_id === metric && d.model === model);

  // Combine
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
    <div className="glass-card">
      <div className="controls-row">
        <div className="control-group">
          <label>Metrik</label>
          <select className="form-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {metrics.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label>Model AI</label>
          <select className="form-select" value={model} onChange={(e) => setModel(e.target.value)}>
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
  );
}

// ==========================================
// SECTION 4: Forecast vs Target
// ==========================================
function Section4({ data }) {
  const targetMetrics = ["revenue", "ebitda", "netinc"];
  
  // Initialize targets dynamically based on last historical + 5%
  const [targets, setTargets] = useState({});
  
  useEffect(() => {
    const initialTargets = {};
    targetMetrics.forEach(m => {
      const hist = data.historical.filter(d => d.metric_id === m);
      if (hist.length > 0) initialTargets[m] = hist[hist.length - 1].value_scaled * 1.05;
    });
    setTargets(initialTargets);
  }, [data]);

  const handleTargetChange = (m, val) => {
    setTargets(prev => ({...prev, [m]: parseFloat(val)}));
  };

  const results = targetMetrics.map(m => {
    const fc = data.forecast.filter(d => d.metric_id === m);
    if (fc.length === 0) return null;
    
    // Pick best model for simplicity or first
    const modelFc = fc.filter(d => d.model === fc[0].model);
    const nextQ = modelFc[0]; // first forecast period
    
    const target = targets[m] || 0;
    const gap = target !== 0 ? ((nextQ.forecast - target) / Math.abs(target)) * 100 : 0;
    
    let status = "OFF-TRACK";
    let statusColor = "var(--danger)";
    if (nextQ.forecast >= target) { status = "ON-TRACK"; statusColor = "var(--success)"; }
    else if (nextQ.upper_95 >= target) { status = "AT-RISK"; statusColor = "var(--warning)"; }
    
    return (
      <tr key={m}>
        <td><strong>{m.toUpperCase()}</strong></td>
        <td>{nextQ.model}</td>
        <td>{formatIDR(nextQ.forecast)}</td>
        <td>
          <input type="number" className="form-input" value={(targets[m] || 0).toFixed(1)} onChange={(e) => handleTargetChange(m, e.target.value)} />
        </td>
        <td style={{color: gap >= 0 ? 'var(--success)' : 'var(--danger)'}}>{gap > 0 ? '+' : ''}{gap.toFixed(1)}%</td>
        <td><span className="badge" style={{backgroundColor: statusColor, color: '#fff'}}>{status}</span></td>
      </tr>
    );
  }).filter(Boolean);

  return (
    <div className="glass-card">
      <div className="card-title">Gap Analysis (Next Quarter)</div>
      <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem'}}>Ubah nilai Target pada kolom input untuk melihat simulasi status pencapaian secara instan.</p>
      
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Model</th>
              <th>Forecast AI</th>
              <th>Target (Input)</th>
              <th>Gap (%)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {results}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// SECTION 5: Revenue Growth
// ==========================================
function Section5({ data }) {
  const hist = data.historical.filter(d => d.metric_id === 'revenue');
  const fcData = data.forecast.filter(d => d.metric_id === 'revenue' && d.model === 'Naive Seasonal'); // Example model
  
  const chartData = [];
  hist.forEach((h, i) => {
    let qoq = 0;
    if (i > 0) qoq = ((h.value_scaled - hist[i-1].value_scaled) / Math.abs(hist[i-1].value_scaled)) * 100;
    chartData.push({ period: h.period, Revenue: h.value_scaled, Growth: qoq });
  });
  
  if (fcData.length > 0 && hist.length > 0) {
    let prevVal = hist[hist.length-1].value_scaled;
    fcData.forEach(f => {
      let qoq = ((f.forecast - prevVal) / Math.abs(prevVal)) * 100;
      chartData.push({ period: f.period, ForecastRev: f.forecast, Growth: qoq });
      prevVal = f.forecast;
    });
  }

  return (
    <div className="glass-card">
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
            <XAxis dataKey="period" stroke="var(--text-muted)" />
            <YAxis yAxisId="left" stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--accent-purple)" tickFormatter={val => `${val}%`} />
            <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} />
            <Legend />
            <Bar yAxisId="left" dataKey="Revenue" fill="#64ffda" opacity={0.7} />
            <Bar yAxisId="left" dataKey="ForecastRev" fill="#ffd166" opacity={0.7} name="Forecast Revenue" />
            <Line yAxisId="right" type="monotone" dataKey="Growth" stroke="#a78bfa" strokeWidth={2} name="QoQ Growth %" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==========================================
// SECTION 6: Anomaly Alert
// ==========================================
function Section6({ data }) {
  const anomalies = data.anomalies || [];
  const critical = anomalies.filter(a => a.severity === 'CRITICAL').length;
  const warning = anomalies.filter(a => a.severity === 'WARNING').length;

  return (
    <div>
      <div className="kpi-grid">
        <div className="glass-card" style={{borderLeft: '4px solid var(--danger)'}}>
          <div className="card-title">CRITICAL Anomalies</div>
          <div className="kpi-value">{critical}</div>
        </div>
        <div className="glass-card" style={{borderLeft: '4px solid var(--warning)'}}>
          <div className="card-title">WARNING Anomalies</div>
          <div className="kpi-value">{warning}</div>
        </div>
      </div>
      
      <div className="glass-card">
        <div className="card-title">Detail Log Anomali</div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Metrik</th>
                <th>Severity</th>
                <th>Tipe</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a, i) => (
                <tr key={i}>
                  <td>{a.period}</td>
                  <td><strong>{a.metric_id || a.metric_name}</strong></td>
                  <td>
                    <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td>{a.type}</td>
                  <td>{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SECTION 7: Limitations & Insights
// ==========================================
function Section7({ data }) {
  return (
    <div>
      <div className="glass-card">
        <div className="card-title">Evaluasi Model (Walk-Forward Backtest)</div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Model</th>
                <th>MAPE (%)</th>
                <th>RMSE</th>
              </tr>
            </thead>
            <tbody>
              {data.evaluations.map((e, i) => (
                <tr key={i}>
                  <td><strong>{e.metric_id}</strong></td>
                  <td>{e.model}</td>
                  <td>{e.MAPE !== undefined ? e.MAPE.toFixed(2) : 'N/A'}%</td>
                  <td>{e.RMSE !== undefined ? e.RMSE.toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-title">Model Terbaik Terpilih</div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Best Model</th>
                <th>MAPE (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.best_models.map((b, i) => (
                <tr key={i}>
                  <td><strong>{b.metric_id}</strong></td>
                  <td style={{color: 'var(--accent-blue)', fontWeight: 'bold'}}>{b.best_model}</td>
                  <td>{b.MAPE !== undefined ? b.MAPE.toFixed(2) : 'N/A'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-title"><Info size={18}/> Batasan Usecase (WAJIB DIPATUHI)</div>
        <div className="alert-box info">
          <Info color="var(--info)" />
          <div>
            <div className="alert-title">Sistem ini HANYA mencakup analisis performa keuangan internal perusahaan.</div>
            <div className="alert-desc">
              <strong>DILARANG:</strong> Prediksi harga saham, analisis market sentiment, prediksi IHSG/kapitalisasi pasar, 
              rekomendasi trading (buy/sell/hold), analisis perilaku investor.
            </div>
          </div>
        </div>
        
        <div className="alert-box warning">
          <AlertCircle color="var(--warning)" />
          <div>
            <div className="alert-title">Limitasi Data</div>
            <div className="alert-desc">
              • Short time-series: hanya 20 kuartal (2021 Q2 – 2026 Q1)<br/>
              • Tidak ada segmentasi regional / produk (hanya mock up visual)<br/>
              • Tidak ada data budget nyata (target menggunakan input simulator)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
