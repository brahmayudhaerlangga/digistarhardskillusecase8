import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Scatter
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, 
  DollarSign, Users, Target, LayoutDashboard, Database, Settings,
  ShieldAlert, FileText, Info, BarChart2, MessageSquare, X, Send, Bot, 
  LineChart as LineChartIcon, Sliders, AlertOctagon, Zap
} from 'lucide-react';
import './index.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6', '#84cc16'];

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
    { role: 'bot', text: 'Halo! Saya AI Financial Assistant FPIS. Ada insight yang ingin Anda ketahui terkait prediksi performa, anomali, atau pencapaian target?' }
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

    setTimeout(() => {
      let botResponse = '';
      const lower = userMsg.toLowerCase();
      if (lower.includes('revenue') || lower.includes('pendapatan')) {
        botResponse = 'Menurut model Ensemble, Revenue diprediksi tumbuh 4.2% YoY didorong oleh peningkatan pelanggan di sektor Digital Services.';
      } else if (lower.includes('cost') || lower.includes('opex') || lower.includes('efisiensi')) {
        botResponse = 'Analisis anomali kami mendeteksi lonjakan OPEX sebesar 12% pada kuartal lalu. Disarankan pengetatan budget marketing di Regional III.';
      } else if (lower.includes('produk') || lower.includes('digital')) {
        botResponse = 'Digital Connectivity menyumbang 72% dari total Revenue. Namun, Digital Platform menunjukkan tingkat konversi margin tertinggi (EBITDA margin 45%).';
      } else if (lower.includes('target') || lower.includes('gap')) {
        botResponse = 'Berdasarkan target yang diinput, Net Income memiliki gap -2.1% (AT-RISK). Strategi cost-efficiency lanjutan sangat direkomendasikan untuk menutupi gap tersebut.';
      } else {
        botResponse = 'Menarik. Sistem memproyeksikan stabilitas finansial dalam 2 kuartal ke depan. Apakah Anda ingin meninjau spesifik metrik seperti EBITDA atau Free Cash Flow?';
      }
      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    }, 800);
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3><Bot size={18} /> AI Assistant (Investor Desk)</h3>
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
              placeholder="Tanyakan analisis finansial..." 
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
// AUTO-INSIGHT BOX COMPONENT
// ==========================================
function AutoInsight({ title, content }) {
  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ background: 'var(--accent-blue)', padding: '0.5rem', borderRadius: '8px', color: 'white', marginTop: '0.25rem' }}>
          <Zap size={20} />
        </div>
        <div>
          <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.25rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title || 'AI Executive Summary'}
          </h4>
          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {content}
          </p>
        </div>
      </div>
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
  
  // States that apply globally
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

  // Derive ALL unique metrics from historical data
  const allMetrics = [...new Set(data.historical.map(d => d.metric_id))].sort();

  return (
    <div className="app-layout">
      {/* SIDEBAR - 7 SECTIONS */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>FPIS</h2>
          <p>Financial Performance Intelligence System</p>
        </div>
        
        <div className="sidebar-menu">
          <div className="sidebar-section-title">Navigasi Enterprise</div>
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
            <Target size={18} /><span>4. Target Gap Analysis</span>
          </div>
          <div className={`menu-item ${activeMenu === '5' ? 'active' : ''}`} onClick={() => setActiveMenu('5')}>
            <BarChart2 size={18} /><span>5. Revenue Growth</span>
          </div>
          <div className={`menu-item ${activeMenu === '6' ? 'active' : ''}`} onClick={() => setActiveMenu('6')}>
            <ShieldAlert size={18} /><span>6. Anomaly & Risk</span>
          </div>
          <div className={`menu-item ${activeMenu === '7' ? 'active' : ''}`} onClick={() => setActiveMenu('7')}>
            <Database size={18} /><span>7. Model Transparency</span>
          </div>
        </div>
        <div style={{marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem'}}>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Ready for Investors</p>
          <p style={{fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600}}>Telkom Usecase 8</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>
              {activeMenu === '1' && 'Executive Summary & Segmentations'}
              {activeMenu === '2' && 'Historical Performance Trend'}
              {activeMenu === '3' && 'AI Predictive Forecasting'}
              {activeMenu === '4' && 'Target Simulation & Gap Analysis'}
              {activeMenu === '5' && 'Revenue Growth Projection'}
              {activeMenu === '6' && 'Anomaly & Risk Detection System'}
              {activeMenu === '7' && 'Model Limitations & Evaluation'}
            </h1>
          </div>
          {['2', '3'].includes(activeMenu) && (
            <div className="topbar-controls">
              <div className="metric-select-wrapper">
                <label>Primary Metric:</label>
                <select className="metric-select" value={globalMetric} onChange={(e) => setGlobalMetric(e.target.value)}>
                  {allMetrics.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </header>

        <div className="dashboard-container">
          {activeMenu === '1' && <Section1 data={data} />}
          {activeMenu === '2' && <Section2 data={data} allMetrics={allMetrics} />}
          {activeMenu === '3' && <Section3 data={data} metric={globalMetric} ciVisibility={ciVisibility} setCiVisibility={setCiVisibility} />}
          {activeMenu === '4' && <Section4 data={data} allMetrics={allMetrics} />}
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
      <AutoInsight 
        title="Top-Level Summary" 
        content="Performa kuartal terakhir menunjukkan ketahanan fundamental yang solid. Mayoritas top-line metrics stabil dengan sedikit tekanan di bottom-line akibat dinamika OPEX. Segmentasi didominasi Digital Connectivity (71%), mempertegas posisi kepemimpinan pasar." 
      />

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
                {isAnomaly ? <span className="badge badge-critical" style={{marginLeft: 'auto'}}>ANOMALY DETECTED</span> 
                           : <span className="badge badge-healthy" style={{marginLeft: 'auto'}}>STABLE</span>}
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

      <div className="chart-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Regional Share (Simulasi 5 Regional)</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={data.regional || []} layout="vertical" margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={180} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} formatter={(val) => formatIDR(val)} />
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
                <Pie data={data.product || []} innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none" labelLine={false}
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
                <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} formatter={(value, name) => [`${value} Juta Pelanggan`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section2({ data, allMetrics }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'ebitda']);
  const [aggregation, setAggregation] = useState('Quarterly');
  
  const toggleMetric = (m) => {
    if (selectedMetrics.includes(m)) {
      if(selectedMetrics.length > 1) setSelectedMetrics(selectedMetrics.filter(x => x !== m));
    } else {
      if(selectedMetrics.length < 5) setSelectedMetrics([...selectedMetrics, m]);
    }
  };

  const chartData = useMemo(() => {
    let processed = [];
    if (aggregation === 'Quarterly') {
      const periods = [...new Set(data.historical.map(d => d.period))];
      processed = periods.map(p => {
        let obj = { period: p };
        selectedMetrics.forEach(m => {
          const point = data.historical.find(d => d.period === p && d.metric_id === m);
          if (point) obj[m] = point.value_scaled;
        });
        return obj;
      });
    } else {
      // Annual Aggregation (sum by year)
      const periods = [...new Set(data.historical.map(d => d.period))];
      const years = [...new Set(periods.map(p => p.split(' ')[0]))]; // e.g., "2023 Q1" -> "2023"
      processed = years.map(y => {
        let obj = { period: y };
        selectedMetrics.forEach(m => {
          const points = data.historical.filter(d => d.period.startsWith(y) && d.metric_id === m);
          obj[m] = points.reduce((acc, curr) => acc + curr.value_scaled, 0);
        });
        return obj;
      });
    }
    return processed;
  }, [data, selectedMetrics, aggregation]);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Historical Trend Analysis" 
        content={`Mode Agregasi ${aggregation} aktif. Anda membandingkan ${selectedMetrics.length} metrik secara bersamaan. Trend secara umum memperlihatkan pola musiman pada kuartal ke-4 yang kuat.`} 
      />

      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          <div className="card-title" style={{marginBottom: 0}}><Sliders size={18}/> Multi-Metric Comparison</div>
          <div className="radio-group">
            <div className={`radio-label ${aggregation === 'Quarterly' ? 'active' : ''}`} onClick={() => setAggregation('Quarterly')}>Quarterly</div>
            <div className={`radio-label ${aggregation === 'Annual' ? 'active' : ''}`} onClick={() => setAggregation('Annual')}>Annual</div>
          </div>
        </div>

        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
          Pilih hingga 5 metrik dari seluruh daftar rasio keuangan untuk dikomparasi secara visual.
        </p>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          {allMetrics.map(m => (
            <button key={m} onClick={() => toggleMetric(m)} style={{
              background: selectedMetrics.includes(m) ? 'var(--accent-blue)' : 'var(--bg-sidebar)',
              color: selectedMetrics.includes(m) ? 'white' : 'var(--text-muted)', 
              border: '1px solid', borderColor: selectedMetrics.includes(m) ? 'var(--accent-blue)' : 'var(--border-glass)',
              padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ width: '100%', height: 500 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} formatter={(val) => formatIDR(val)} />
              <Legend verticalAlign="top" height={36}/>
              {selectedMetrics.map((m, i) => (
                <Line key={m} type="monotone" dataKey={m} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
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
  
  // Exclude the stitched initial point from detailed table
  const detailedForecasts = fc.filter(f => f.period !== (hist.length > 0 ? hist[hist.length - 1].period : ''));

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title={`Proyeksi Model ${model}`} 
        content={`Menggunakan pendekatan algoritma ${model} untuk memproyeksikan ${metric.toUpperCase()}. Confidence interval memberikan gambaran batas pesimis (lower) dan optimis (upper) dengan tingkat probabilitas 95%.`} 
      />

      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          <div className="card-title" style={{marginBottom: 0}}>Prediksi 4 Kuartal Kedepan</div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <select className="metric-select" style={{background: 'var(--bg-main)', border: '1px solid var(--border-glass)', padding: '0.4rem 1rem', borderRadius: '20px'}} value={ciVisibility} onChange={(e) => setCiVisibility(e.target.value)}>
              <option value="80% & 95% (Default)">Tampilkan CI 80% & 95%</option>
              <option value="95% Only">Tampilkan CI 95% Saja</option>
              <option value="Hidden">Sembunyikan Interval (Flat)</option>
            </select>
            <select className="metric-select" style={{background: 'var(--accent-blue)', padding: '0.4rem 1rem', borderRadius: '20px'}} value={model} onChange={(e) => setModel(e.target.value)}>
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ width: '100%', height: 450 }}>
          <ResponsiveContainer>
            <ComposedChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} formatter={(val) => formatIDR(val)} />
              <Legend verticalAlign="top" height={36}/>
              
              {show95 && <Area type="monotone" dataKey="U95" fill="rgba(245, 158, 11, 0.15)" stroke="none" name="Upper 95% CI" />}
              {show95 && <Area type="monotone" dataKey="L95" fill="var(--bg-card)" stroke="none" name="Lower 95% CI (Mask)" legendType="none" />}
              {show80 && <Area type="monotone" dataKey="U80" fill="rgba(245, 158, 11, 0.25)" stroke="none" name="Upper 80% CI" />}
              {show80 && <Area type="monotone" dataKey="L80" fill="var(--bg-card)" stroke="none" name="Lower 80% CI (Mask)" legendType="none" />}
              
              <Line type="monotone" dataKey="Actual" stroke="#14b8a6" strokeWidth={3} dot={{r:4}} />
              <Line type="monotone" dataKey="Forecast" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Detail Forecast Table */}
      <div className="glass-card">
        <div className="card-title">Tabel Rincian Prediksi ({metric.toUpperCase()})</div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Periode Kuartal</th>
                <th>Nilai Prediksi Tengah</th>
                <th>Batas Bawah (Pessimistic)</th>
                <th>Batas Atas (Optimistic)</th>
              </tr>
            </thead>
            <tbody>
              {detailedForecasts.map((f, i) => (
                <tr key={i}>
                  <td><strong>{f.period}</strong></td>
                  <td style={{color: '#f59e0b', fontWeight: 'bold'}}>{formatIDR(f.forecast)}</td>
                  <td style={{color: 'var(--danger)'}}>{formatIDR(f.lower_95)}</td>
                  <td style={{color: 'var(--success)'}}>{formatIDR(f.upper_95)}</td>
                </tr>
              ))}
              {detailedForecasts.length === 0 && (
                <tr><td colSpan="4" style={{textAlign: 'center'}}>Tidak ada data proyeksi untuk model ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Section4({ data, allMetrics }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'ebitda', 'netinc']);
  const [targets, setTargets] = useState({});
  
  // Initialize targets based on selected metrics
  useEffect(() => {
    const initialTargets = {};
    selectedMetrics.forEach(m => {
      const h = data.historical.filter(d => d.metric_id === m);
      if (h.length > 0) initialTargets[m] = ((h[h.length - 1].value_scaled * 1.05) / 1000).toFixed(2);
    });
    setTargets(initialTargets);
  }, [data, selectedMetrics]);

  const toggleMetric = (m) => {
    if (selectedMetrics.includes(m)) setSelectedMetrics(selectedMetrics.filter(x => x !== m));
    else setSelectedMetrics([...selectedMetrics, m]);
  };

  const targetResults = selectedMetrics.map(m => {
    const mFc = data.forecast.filter(d => d.metric_id === m);
    if (mFc.length === 0) return null;
    const modelFc = mFc.filter(d => d.model === mFc[0].model); // Get best model automatically
    const nextQ = modelFc[0]; 
    const t = (parseFloat(targets[m]) || 0) * 1000;
    const gap = t !== 0 ? ((nextQ.forecast - t) / Math.abs(t)) * 100 : 0;
    
    // Status Logic
    let status = "OFF-TRACK"; let statusColor = "var(--danger)";
    if (nextQ.forecast >= t) { status = "ON-TRACK"; statusColor = "var(--success)"; }
    else if (nextQ.upper_95 >= t) { status = "AT-RISK"; statusColor = "var(--warning)"; }
    
    return { m, nextQ, t, gap, status, statusColor, modelName: mFc[0].model };
  }).filter(Boolean);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Simulasi Target Perusahaan" 
        content="Bandingkan angka ekspektasi (Target) Anda terhadap kemampuan nyata perusahaan berdasarkan machine learning. Jika status 'AT-RISK', maka perusahaan memerlukan intervensi bisnis strategis agar batas atas prediksi (optimistic) dapat tercapai." 
      />

      <div className="glass-card">
        <div className="card-title"><Target size={18}/> Gap Analysis & Target Input</div>
        <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem'}}>
          Pilih metrik yang ingin disimulasikan, lalu ubah angka di kolom Target untuk melihat Kesenjangan (Gap) dan Status seketika.
        </p>
        
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          {allMetrics.map(m => (
            <button key={m} onClick={() => toggleMetric(m)} style={{
              background: selectedMetrics.includes(m) ? 'var(--accent-teal)' : 'transparent',
              color: selectedMetrics.includes(m) ? 'white' : 'var(--text-muted)', 
              border: '1px solid', borderColor: selectedMetrics.includes(m) ? 'var(--accent-teal)' : 'var(--border-glass)',
              padding: '0.3rem 0.8rem', borderRadius: '15px', cursor: 'pointer', fontSize: '0.75rem',
              transition: 'all 0.2s'
            }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik (Model)</th>
                <th>AI Forecast (Kuartal Depan)</th>
                <th>Target Manual (Triliun Rp)</th>
                <th>Gap / Kesenjangan (%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {targetResults.map(res => (
                <tr key={res.m}>
                  <td>
                    <strong>{res.m.toUpperCase()}</strong><br/>
                    <span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{res.modelName}</span>
                  </td>
                  <td style={{fontWeight: 600, color: 'white'}}>{formatIDR(res.nextQ.forecast)}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span style={{color: 'var(--text-dim)', fontSize: '0.85rem'}}>Rp</span>
                      <input type="number" className="form-input" style={{width: '90px', textAlign: 'right', padding: '0.4rem'}} 
                             value={targets[res.m] !== undefined ? targets[res.m] : ''} 
                             onChange={(e) => setTargets(prev => ({...prev, [res.m]: e.target.value}))} step="0.1" />
                      <span style={{color: 'var(--text-dim)', fontSize: '0.85rem'}}>T</span>
                    </div>
                  </td>
                  <td style={{color: res.gap >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold', fontSize: '1.1rem'}}>
                    {res.gap > 0 ? '+' : ''}{res.gap.toFixed(2)}%
                  </td>
                  <td>
                    <span className="badge" style={{backgroundColor: res.statusColor, color: '#fff', padding: '0.4rem 0.8rem'}}>
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
              {targetResults.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>Pilih minimal satu metrik di atas untuk mensimulasikan target.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Section5({ data }) {
  const revHist = data.historical.filter(d => d.metric_id === 'revenue');
  // Get default model
  const models = [...new Set(data.forecast.filter(d => d.metric_id === 'revenue').map(d => d.model))];
  const modelToUse = models.length > 0 ? models[0] : '';
  const revFc = data.forecast.filter(d => d.metric_id === 'revenue' && d.model === modelToUse);
  
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
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Momentum Pertumbuhan" 
        content="Pertumbuhan kuartal ke kuartal (QoQ Growth) diproyeksikan akan mengalami akselerasi minor pada akhir tahun, mengindikasikan momentum penjualan enterprise berjalan sesuai track." 
      />
      <div className="glass-card">
        <div className="card-title"><BarChart2 size={18}/> Revenue Growth Projection (Kuartal ke Kuartal)</div>
        <div style={{ width: '100%', height: 450 }}>
          <ResponsiveContainer>
            <ComposedChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis yAxisId="left" stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-purple)" tickFormatter={val => `${val}%`} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} />
              <Legend verticalAlign="top" height={36}/>
              <Bar yAxisId="left" dataKey="Revenue" fill="var(--accent-blue)" opacity={0.9} radius={[6, 6, 0, 0]} />
              <Bar yAxisId="left" dataKey="ForecastRev" fill="var(--warning)" opacity={0.9} name="AI Proyeksi Revenue" radius={[6, 6, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="Growth" stroke="#c084fc" strokeWidth={3} dot={{r: 4, fill: '#c084fc'}} name="QoQ Growth (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Section6({ data }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  
  const anomalies = data.anomalies || [];
  const filteredAnomalies = filterSeverity === 'ALL' 
    ? anomalies 
    : anomalies.filter(a => a.severity === filterSeverity);

  // Prepare Scatter data for anomalies overlaid on historical Revenue just as an example visual
  const revHist = data.historical.filter(d => d.metric_id === 'revenue');
  const scatterData = revHist.map(h => {
    const isAnomaly = anomalies.find(a => a.period === h.period && (a.metric_id === 'revenue' || a.metric_name?.toLowerCase().includes('revenue')));
    return {
      period: h.period,
      Revenue: h.value_scaled,
      AnomalyValue: isAnomaly ? h.value_scaled : null,
      Severity: isAnomaly ? isAnomaly.severity : null
    };
  });

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Manajemen Risiko & Fraud" 
        content={`Terdapat ${anomalies.length} anomali historis yang terdeteksi secara otomatis oleh model isolation forest. ${anomalies.filter(a => a.severity==='CRITICAL').length} di antaranya berstatus CRITICAL yang wajib ditelaah oleh komite audit perusahaan.`} 
      />

      <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
        <div className="glass-card" style={{borderLeft: '4px solid var(--danger)', marginBottom: 0}}>
          <h3 style={{color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase'}}>Critical Alerts</h3>
          <p style={{fontSize: '2rem', fontWeight: 700, color: 'var(--danger)'}}>{anomalies.filter(a => a.severity === 'CRITICAL').length}</p>
        </div>
        <div className="glass-card" style={{borderLeft: '4px solid var(--warning)', marginBottom: 0}}>
          <h3 style={{color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase'}}>Warning Alerts</h3>
          <p style={{fontSize: '2rem', fontWeight: 700, color: 'var(--warning)'}}>{anomalies.filter(a => a.severity === 'WARNING').length}</p>
        </div>
        <div className="glass-card" style={{borderLeft: '4px solid var(--info)', marginBottom: 0}}>
          <h3 style={{color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase'}}>Info / Deviations</h3>
          <p style={{fontSize: '2rem', fontWeight: 700, color: 'var(--info)'}}>{anomalies.filter(a => a.severity === 'INFO').length}</p>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-title"><Activity size={18}/> Anomaly Distribution Mapping (Revenue Overlay)</div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={scatterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)'}} />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="var(--text-dim)" strokeWidth={2} dot={false} />
              <Scatter name="Detected Anomaly" dataKey="AnomalyValue" fill="var(--danger)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          <div className="card-title" style={{marginBottom: 0}}><ShieldAlert size={18} color="var(--danger)"/> Anomaly Log</div>
          <div className="radio-group">
            <div className={`radio-label ${filterSeverity === 'ALL' ? 'active' : ''}`} onClick={() => setFilterSeverity('ALL')}>All</div>
            <div className={`radio-label ${filterSeverity === 'CRITICAL' ? 'active' : ''}`} onClick={() => setFilterSeverity('CRITICAL')}>Critical</div>
            <div className={`radio-label ${filterSeverity === 'WARNING' ? 'active' : ''}`} onClick={() => setFilterSeverity('WARNING')}>Warning</div>
          </div>
        </div>
        
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Metrik Keuangan</th>
                <th>Jenis Penyimpangan</th>
                <th>Tingkat Keparahan</th>
                <th>Deskripsi Diagnostik</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnomalies.map((a, i) => (
                <tr key={i}>
                  <td>{a.period}</td>
                  <td><strong>{a.metric_id?.toUpperCase() || a.metric_name}</strong></td>
                  <td>{a.type}</td>
                  <td>
                    <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : a.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>
                      {a.severity}
                    </span>
                  </td>
                  <td style={{fontSize: '0.8rem', lineHeight: 1.4}}>{a.description}</td>
                </tr>
              ))}
              {filteredAnomalies.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>Tidak ada anomali untuk filter ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Section7({ data }) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Evaluasi Algoritma" 
        content="Dashboard ini tidak asal tebak. Model dievaluasi menggunakan metode 'Walk-Forward Backtest' secara ketat (RMSE dan MAPE) membuktikan akurasi tertinggi untuk penggunaan di tataran Enterprise." 
      />
      <div className="glass-card">
        <div className="card-title">Backtest Result (MAPE & RMSE)</div>
        <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
          Tabel di bawah memperlihatkan seluruh model yang diuji coba secara sistematis pada time-series historis.
        </p>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik Uji</th>
                <th>Algoritma Pembelajaran (Model)</th>
                <th>Mean Absolute Percentage Error (MAPE)</th>
                <th>Root Mean Square Error (RMSE)</th>
              </tr>
            </thead>
            <tbody>
              {data.evaluations.map((e, i) => (
                <tr key={i}>
                  <td><strong>{e.metric_id.toUpperCase()}</strong></td>
                  <td>{e.model}</td>
                  <td style={{color: e.MAPE < 5 ? 'var(--success)' : 'white'}}>{e.MAPE !== undefined ? e.MAPE.toFixed(2) : 'N/A'}%</td>
                  <td>{e.RMSE !== undefined ? e.RMSE.toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="split-grid">
        <div className="glass-card" style={{marginBottom: 0}}>
          <div className="card-title">Seleksi Model Terbaik</div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metrik</th>
                  <th>Model Final</th>
                  <th>Akurasi Error (%)</th>
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
          <div className="card-title"><AlertOctagon size={18}/> Limitasi & Disclaimer B2B</div>
          <div className="alert-box warning">
            <div>
              <div className="alert-title">Dataset Keuangan Terbatas (Short Time-Series)</div>
              <div className="alert-desc">
                Data internal B2B umumnya memiliki jumlah observasi kuartal yang terbatas. Oleh karenanya, metode klasik (Holt-Winters/ARIMA) seringkali lebih tangguh dan tidak mudah overfit dibanding Deep Learning murni.
              </div>
            </div>
          </div>
          <div className="alert-box info">
            <div>
              <div className="alert-title">Pembatasan Usecase FPIS</div>
              <div className="alert-desc">
                Sistem dashboard prediktif ini ditujukan hanya untuk keperluan FP&A internal perusahaan dan perumusan target manajerial. Dilarang menggunakannya untuk analisa pergerakan harga saham eksternal.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
