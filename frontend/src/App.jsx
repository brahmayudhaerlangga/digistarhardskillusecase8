import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, 
  DollarSign, Users, Target, LayoutDashboard, Database, Settings,
  ShieldAlert, FileText, Info, BarChart2, MessageSquare, X, Send, Bot, 
  LineChart as LineChartIcon, Sliders, AlertOctagon
} from 'lucide-react';
import './index.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];
const CORE_METRICS = ['revenue', 'ebitda', 'netinc', 'opinc', 'opex', 'ncfo', 'fcf'];

const formatIDR = (val, isPercentage = false) => {
  if (val === undefined || val === null) return 'N/A';
  if (isPercentage) return `${val.toFixed(1)}%`;
  if (Math.abs(val) >= 1000) return `Rp ${(val / 1000).toFixed(2)} T`;
  if (Math.abs(val) >= 1) return `Rp ${val.toFixed(1)} M`;
  return `Rp ${(val * 1000).toFixed(0)} Jt`;
};

// ==========================================
// AI CHATBOT COMPONENT
// ==========================================
function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Halo! Saya AI Financial Assistant FPIS. Ada insight yang ingin Anda ketahui terkait prediksi performa atau segmentasi regional/produk?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    // Mock AI Response generation based on Usecase 8
    setTimeout(() => {
      let botResponse = '';
      const lower = userMsg.toLowerCase();
      if (lower.includes('revenue') || lower.includes('enterprise')) {
        botResponse = 'Berdasarkan model AI forecasting, segmen Enterprise diprediksi mengalami penurunan Revenue sebesar 8% pada kuartal berikutnya. Disarankan tim B2B segera menyiapkan proposal retensi untuk enterprise key accounts.';
      } else if (lower.includes('cost') || lower.includes('network') || lower.includes('efisiensi')) {
        botResponse = 'Analisis anomali mendeteksi Cost Network meningkat abnormal 15% dibanding historical trend. Hal ini menggerus EBITDA margin secara signifikan pada kuartal ini.';
      } else if (lower.includes('produk') || lower.includes('digital')) {
        botResponse = 'Produk Digital Services memiliki growth tertinggi selama 12 bulan terakhir. Di sisi lain, Digital Connectivity tetap menjadi cash-cow utama dengan kontribusi >70%.';
      } else if (lower.includes('regional') || lower.includes('wilayah') || lower.includes('kti')) {
        botResponse = 'Regional V (KTI) memiliki risiko tidak mencapai target EBITDA kuartal depan karena adanya perlambatan growth dan tingginya capex/opex di wilayah timur.';
      } else {
        botResponse = 'Berdasarkan data time-series saat ini, model XGBoost memproyeksikan target Revenue akan tercapai (ON-TRACK), namun target EBITDA berstatus AT-RISK karena tekanan opex. Apakah Anda ingin melihat detail untuk produk tertentu?';
      }
      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    }, 1000);
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3><Bot size={18} /> AI Financial Assistant</h3>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}><X size={18}/></button>
          </div>
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input">
            <input 
              type="text" 
              placeholder="Tanya AI seputar insight finansial..." 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend}><Send size={16}/></button>
          </div>
        </div>
      )}
      <button className={`chatbot-fab ${!isOpen ? 'pulse' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24}/> : <MessageSquare size={24}/>}
      </button>
    </div>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMenu, setActiveMenu] = useState('1');
  const [globalMetric, setGlobalMetric] = useState('revenue');
  const [ciVisibility, setCiVisibility] = useState('80% & 95% (Default)');

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
      {/* SIDEBAR - 7 SECTIONS */}
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
            <LineChartIcon size={18} /><span>2. Performance Trend</span>
          </div>
          <div className={`menu-item ${activeMenu === '3' ? 'active' : ''}`} onClick={() => setActiveMenu('3')}>
            <Activity size={18} /><span>3. AI Forecasting</span>
          </div>
          <div className={`menu-item ${activeMenu === '4' ? 'active' : ''}`} onClick={() => setActiveMenu('4')}>
            <Target size={18} /><span>4. Forecast vs Target</span>
          </div>
          <div className={`menu-item ${activeMenu === '5' ? 'active' : ''}`} onClick={() => setActiveMenu('5')}>
            <BarChart2 size={18} /><span>5. Revenue Growth</span>
          </div>
          <div className={`menu-item ${activeMenu === '6' ? 'active' : ''}`} onClick={() => setActiveMenu('6')}>
            <ShieldAlert size={18} /><span>6. Anomaly Alert</span>
          </div>
          <div className={`menu-item ${activeMenu === '7' ? 'active' : ''}`} onClick={() => setActiveMenu('7')}>
            <Database size={18} /><span>7. Model Limitations</span>
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
              {activeMenu === '1' && '1. Executive Summary & Segmentations'}
              {activeMenu === '2' && '2. Financial Performance Trend'}
              {activeMenu === '3' && '3. AI Forecasting (Proyeksi Masa Depan)'}
              {activeMenu === '4' && '4. Forecast vs Target (Gap Analysis)'}
              {activeMenu === '5' && '5. Revenue Growth Projection'}
              {activeMenu === '6' && '6. Anomaly Alerts'}
              {activeMenu === '7' && '7. Model Evaluation & Limitations'}
            </h1>
          </div>
          {['2', '3', '4'].includes(activeMenu) && (
            <div className="topbar-controls">
              <div className="metric-select-wrapper">
                <label>Fokus Analisis:</label>
                <select className="metric-select" value={globalMetric} onChange={(e) => setGlobalMetric(e.target.value)}>
                  {CORE_METRICS.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </header>

        <div className="dashboard-container">
          {activeMenu === '1' && <Section1 data={data} />}
          {activeMenu === '2' && <Section2 data={data} />}
          {activeMenu === '3' && <Section3 data={data} metric={globalMetric} ciVisibility={ciVisibility} setCiVisibility={setCiVisibility} />}
          {activeMenu === '4' && <Section4 data={data} />}
          {activeMenu === '5' && <Section5 data={data} />}
          {activeMenu === '6' && <Section6 data={data} />}
          {activeMenu === '7' && <Section7 data={data} />}
        </div>
      </main>

      {/* AI CHATBOT PERSISTENT WIDGET */}
      <AIChatbot />
    </div>
  );
}

// ==========================================
// SECTIONS COMPONENTS
// ==========================================

function Section1({ data }) {
  const kpis = [
    { id: 'revenue', label: 'Total Revenue' },
    { id: 'ebitda', label: 'EBITDA' },
    { id: 'netinc', label: 'Net Income' },
    { id: 'opex', label: 'Operating Expenses' }
  ];

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
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
              <div className="kpi-value">{formatIDR(last.value_scaled, false)}</div>
              <div className={`kpi-trend ${qoq >= 0 ? 'trend-up' : 'trend-down'}`}>
                {qoq >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                {Math.abs(qoq).toFixed(1)}% vs Kuartal Lalu
              </div>
            </div>
          );
        })}
      </div>

      {data.insights && data.insights.length > 0 && (
        <div className="glass-card">
          <div className="card-title"><Activity size={18}/> Highlight Insight (Auto-generated)</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {data.insights.slice(0, 3).map((ins, i) => (
              <div key={i} className={`alert-box ${ins.severity === 'CRITICAL' ? '' : ins.severity === 'WARNING' ? 'warning' : 'info'}`} style={{marginBottom: 0, padding: '0.75rem'}}>
                <div className="alert-desc"><strong>[{ins.category}]</strong> {ins.insight}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chart-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Regional Share (Simulasi 5 Regional)</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={data.regional || []} layout="vertical" margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={180} tick={{fontSize: 12}} />
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(val) => formatIDR(val)} />
                <Bar dataKey="value" fill="var(--accent-blue)" radius={[0, 4, 4, 0]}>
                  {data.regional && data.regional.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Product Mix (3 Digital Domains)</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.product || []} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}>
                  {data.product && data.product.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} formatter={(value, name) => [`${value} Juta Pelanggan`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section2({ data }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'ebitda', 'opex']);
  
  const toggleMetric = (m) => {
    if (selectedMetrics.includes(m)) setSelectedMetrics(selectedMetrics.filter(x => x !== m));
    else setSelectedMetrics([...selectedMetrics, m]);
  };

  const periods = [...new Set(data.historical.map(d => d.period))];
  const chartData = periods.map(p => {
    let obj = { period: p };
    selectedMetrics.forEach(m => {
      const point = data.historical.find(d => d.period === p && d.metric_id === m);
      if (point) obj[m] = point.value_scaled;
    });
    return obj;
  });

  return (
    <div className="glass-card">
      <div className="card-title"><Sliders size={18}/> Perbandingan Multi-Metrik Historis</div>
      <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
        Analisis Profitabilitas dan Cost Efficiency dengan membandingkan metrik secara bersamaan. Klik pada metrik di bawah untuk menampilkan/menyembunyikan.
      </p>
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
        {CORE_METRICS.map(m => (
          <button key={m} onClick={() => toggleMetric(m)} style={{
            background: selectedMetrics.includes(m) ? 'var(--accent-blue)' : 'var(--bg-sidebar)',
            color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem'
          }}>
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ width: '100%', height: 450 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
            <XAxis dataKey="period" stroke="var(--text-muted)" />
            <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
            <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-dark)'}} formatter={(val) => formatIDR(val)} />
            <Legend verticalAlign="top" height={36}/>
            {selectedMetrics.map((m, i) => (
              <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{r: 4}} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Section3({ data, metric, ciVisibility, setCiVisibility }) {
  const [model, setModel] = useState('');
  const availableModels = [...new Set(data.forecast.filter(d => d.metric_id === metric).map(d => d.model))];
  
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(model)) setModel(availableModels[0]);
  }, [metric, data]);

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
      existing.Forecast = f.forecast; existing.L80 = f.lower_80; existing.U80 = f.upper_80; existing.L95 = f.lower_95; existing.U95 = f.upper_95;
    } else {
      combined.push({ period: f.period, Forecast: f.forecast, L80: f.lower_80, U80: f.upper_80, L95: f.lower_95, U95: f.upper_95 });
    }
  });

  const show95 = ciVisibility.includes('95%');
  const show80 = ciVisibility.includes('80%');

  return (
    <div className="glass-card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
        <div className="card-title" style={{marginBottom: 0}}>Prediksi AI: {metric.toUpperCase()} 4 Kuartal Kedepan</div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <select className="metric-select" style={{background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)'}} value={ciVisibility} onChange={(e) => setCiVisibility(e.target.value)}>
            <option value="80% & 95% (Default)">Tampilkan CI 80% & 95%</option>
            <option value="95% Only">Tampilkan CI 95% Saja</option>
            <option value="Hidden">Sembunyikan Interval (Flat)</option>
          </select>
          <select className="metric-select" style={{background: 'rgba(0,0,0,0.2)', color: 'var(--accent-blue)'}} value={model} onChange={(e) => setModel(e.target.value)}>
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
            <Legend verticalAlign="top" height={36}/>
            
            {show95 && <Area type="monotone" dataKey="U95" fill="rgba(245, 158, 11, 0.25)" stroke="none" name="Upper 95% CI" />}
            {show95 && <Area type="monotone" dataKey="L95" fill="var(--bg-card)" stroke="none" name="Lower 95% CI (Mask)" legendType="none" />}
            {show80 && <Area type="monotone" dataKey="U80" fill="rgba(245, 158, 11, 0.45)" stroke="none" name="Upper 80% CI" />}
            {show80 && <Area type="monotone" dataKey="L80" fill="var(--bg-card)" stroke="none" name="Lower 80% CI (Mask)" legendType="none" />}
            
            <Line type="monotone" dataKey="Actual" stroke="#64ffda" strokeWidth={3} dot={{r:4}} />
            <Line type="monotone" dataKey="Forecast" stroke="#ffd166" strokeWidth={3} strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Section4({ data }) {
  const [targets, setTargets] = useState({});
  useEffect(() => {
    const initialTargets = {};
    ['revenue', 'ebitda', 'netinc'].forEach(m => {
      const h = data.historical.filter(d => d.metric_id === m);
      if (h.length > 0) initialTargets[m] = ((h[h.length - 1].value_scaled * 1.05) / 1000).toFixed(2);
    });
    setTargets(initialTargets);
  }, [data]);

  const targetResults = ['revenue', 'ebitda', 'netinc'].map(m => {
    const mFc = data.forecast.filter(d => d.metric_id === m);
    if (mFc.length === 0) return null;
    const modelFc = mFc.filter(d => d.model === mFc[0].model);
    const nextQ = modelFc[0]; 
    const t = (parseFloat(targets[m]) || 0) * 1000;
    const gap = t !== 0 ? ((nextQ.forecast - t) / Math.abs(t)) * 100 : 0;
    let status = "OFF-TRACK"; let statusColor = "var(--danger)";
    if (nextQ.forecast >= t) { status = "ON-TRACK"; statusColor = "var(--success)"; }
    else if (nextQ.upper_95 >= t) { status = "AT-RISK"; statusColor = "var(--warning)"; }
    return { m, nextQ, t, gap, status, statusColor };
  }).filter(Boolean);

  return (
    <div className="glass-card">
      <div className="card-title"><Target size={18}/> Simulasi Pencapaian Target Keuangan</div>
      <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem'}}>
        Ubah nilai Target pada kolom input untuk melakukan simulasi pencapaian secara instan berdasarkan prediksi AI (Gap Analysis).
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
                    <input type="number" className="form-input" style={{width: '70px', textAlign: 'right', padding: '0.15rem'}} 
                           value={targets[res.m] !== undefined ? targets[res.m] : ''} 
                           onChange={(e) => setTargets(prev => ({...prev, [res.m]: e.target.value}))} step="0.1" />
                    <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>T</span>
                  </div>
                </td>
                <td style={{color: res.gap >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold'}}>{res.gap > 0 ? '+' : ''}{res.gap.toFixed(1)}%</td>
                <td><span className="badge" style={{backgroundColor: res.statusColor, color: '#fff'}}>{res.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section5({ data }) {
  const revHist = data.historical.filter(d => d.metric_id === 'revenue');
  const revFc = data.forecast.filter(d => d.metric_id === 'revenue' && d.model === 'XGBoost');
  const growthData = [];
  
  revHist.forEach((h, i) => {
    let qoq = i > 0 ? ((h.value_scaled - revHist[i-1].value_scaled) / Math.abs(revHist[i-1].value_scaled)) * 100 : 0;
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

  return (
    <div className="glass-card">
      <div className="card-title"><BarChart2 size={18}/> Revenue Growth Projection (QoQ)</div>
      <div style={{ width: '100%', height: 450 }}>
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
  );
}

function Section6({ data }) {
  return (
    <div className="glass-card">
      <div className="card-title"><ShieldAlert size={18} color="var(--danger)"/> Financial Anomaly Detection</div>
      <div style={{marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
        Sistem mendeteksi lonjakan biaya atau penurunan pendapatan yang berada di luar batas kewajaran pada dataset historis.
        <br/><br/>
        <strong>SOP Tindakan:</strong><br/>
        <span style={{color: 'var(--danger)'}}>● CRITICAL:</span> Eskalasi segera ke BOD.<br/>
        <span style={{color: 'var(--warning)'}}>● WARNING:</span> Tinjauan lokal.<br/>
        <span style={{color: 'var(--info)'}}>● INFO:</span> Pelaporan log rutin.
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Metrik</th>
              <th>Tipe</th>
              <th>Severity</th>
              <th>Deskripsi Detail</th>
            </tr>
          </thead>
          <tbody>
            {data.anomalies && data.anomalies.map((a, i) => (
              <tr key={i}>
                <td>{a.period}</td>
                <td><strong>{a.metric_id || a.metric_name}</strong></td>
                <td>{a.type}</td>
                <td>
                  <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : a.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>
                    {a.severity}
                  </span>
                </td>
                <td style={{fontSize: '0.8rem'}}>{a.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section7({ data }) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div className="glass-card">
        <div className="card-title">Evaluasi Model AI (Walk-Forward Backtest)</div>
        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
          Semua algoritma telah diuji menggunakan simulasi data historis untuk mencari yang paling akurat memprediksi per kuartal.
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
                    <td>{b.best_MAPE !== undefined ? b.best_MAPE.toFixed(2) : 'N/A'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title"><AlertOctagon size={18}/> Limitasi & Disclaimer AI</div>
          <div className="alert-box warning">
            <AlertCircle color="var(--warning)" style={{flexShrink: 0}} />
            <div>
              <div className="alert-title">Dataset Keuangan (Short Time-Series)</div>
              <div className="alert-desc">
                Data Telkom yang tersedia hanya 20 kuartal (2021-2026). Model kompleks (Deep Learning) rentan overfit, sehingga diadu dengan model statistik secara empiris.
              </div>
            </div>
          </div>
          <div className="alert-box info">
            <Info color="var(--info)" style={{flexShrink: 0}} />
            <div>
              <div className="alert-title">Batasan Usecase FPIS</div>
              <div className="alert-desc">
                Sistem ini murni dikhususkan untuk FP&A (Financial Planning & Analysis). <b>Dilarang keras</b> menggunakannya untuk tebak-tebakan harga saham atau sentimen pasar eksternal.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
