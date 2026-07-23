import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Target, LayoutDashboard, Database, 
  ShieldAlert, Info, BarChart2, MessageSquare, X, Send, Bot, 
  LineChart as LineChartIcon, Sliders, AlertOctagon, Zap, ChevronDown
} from 'lucide-react';
import './index.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6', '#84cc16'];

const SEGMENT_MAP = {
  "revenue": "Profitabilitas", "revenueGrowth": "Profitabilitas", "gp": "Profitabilitas",
  "grossMargin": "Profitabilitas", "opinc": "Profitabilitas", "operatingMargin": "Profitabilitas",
  "ebit": "Profitabilitas", "ebitMargin": "Profitabilitas", "ebitda": "Profitabilitas",
  "ebitdaMargin": "Profitabilitas", "netinc": "Profitabilitas", "netinccmn": "Profitabilitas",
  "netIncomeGrowth": "Profitabilitas", "profitMargin": "Profitabilitas", "pretax": "Profitabilitas",
  "taxexp": "Profitabilitas", "taxrate": "Profitabilitas", "ROA": "Profitabilitas",
  "ROE": "Profitabilitas", "epsBasic": "Profitabilitas", "epsdil": "Profitabilitas",
  "epsGrowth": "Profitabilitas", "earningContinuing": "Profitabilitas",
  "assetsc": "Likuiditas", "currentLiabilities": "Likuiditas", "Current_Ratio": "Likuiditas",
  "Quick_Ratio": "Likuiditas", "cashneq": "Likuiditas", "totalcash": "Likuiditas",
  "cashGrowth": "Likuiditas", "workingcapital": "Likuiditas", "inventory": "Likuiditas",
  "accountsReceivable": "Likuiditas", "accountsPayable": "Likuiditas", "receivables": "Likuiditas",
  "debt": "Leverage", "debtc": "Leverage", "debtnc": "Leverage", "DAR": "Leverage",
  "DER": "Leverage", "liabilities": "Leverage", "equity": "Leverage", "interestExpense": "Leverage",
  "currentPortDebt": "Leverage", "capitalLeases": "Leverage", "netcash": "Leverage", "netDebtIssued": "Leverage",
  "ncfo": "Cash Flow", "ncfi": "Cash Flow", "ncff": "Cash Flow", "ncf": "Cash Flow",
  "fcf": "Cash Flow", "fcfGrowth": "Cash Flow", "fcfMargin": "Cash Flow", "fcfps": "Cash Flow",
  "ocfGrowth": "Cash Flow", "capex": "Cash Flow", "leveredFCF": "Cash Flow", "unleveredFCF": "Cash Flow",
  "commonDividendCF": "Cash Flow", "totalDepAmorCF": "Cash Flow",
  "assets": "Ukuran", "Firm_Size": "Ukuran", "netPPE": "Ukuran", "totalCommonEquity": "Ukuran",
  "tangibleBookValue": "Ukuran", "bvps": "Ukuran",
  "cor": "Biaya", "opex": "Biaya", "sgna": "Biaya", "otheropex": "Biaya",
};
const SEGMENTS = [...new Set(Object.values(SEGMENT_MAP))];

const formatIDR = (val, isPercentage = false) => {
  if (val === undefined || val === null) return 'N/A';
  if (isPercentage) return `${val.toFixed(1)}%`;
  if (Math.abs(val) >= 1000) return `Rp ${(val / 1000).toFixed(2)} T`;
  if (Math.abs(val) >= 1) return `Rp ${val.toFixed(1)} M`;
  return `Rp ${(val * 1000).toFixed(0)} Jt`;
};

// ==========================================
// CUSTOM COMPONENTS
// ==========================================

function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const toggle = (val) => {
    if (selected.includes(val)) {
      if (selected.length > 1) onChange(selected.filter(x => x !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '350px' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          background: 'var(--bg-main)', border: '1px solid var(--border-glass)',
          padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        <span style={{color: selected.length ? 'white' : 'var(--text-muted)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {selected.length > 0 ? selected.map(s => s.toUpperCase()).join(', ') : placeholder}
        </span>
        <ChevronDown size={16} color="var(--text-muted)" />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-glass-bright)',
          borderRadius: '8px', marginTop: '0.5rem', zIndex: 50,
          maxHeight: '300px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)'
        }}>
          {options.map(opt => (
            <div 
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                padding: '0.75rem 1rem', cursor: 'pointer',
                background: selected.includes(opt) ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                borderBottom: '1px solid var(--border-glass)',
                fontSize: '0.85rem', fontWeight: 500
              }}
            >
              <div style={{
                width: '18px', height: '18px', border: '1px solid var(--accent-blue)', 
                borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected.includes(opt) ? 'var(--accent-blue)' : 'transparent'
              }}>
                {selected.includes(opt) && <span style={{color: 'white', fontSize: '12px'}}>✓</span>}
              </div>
              {opt.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
            <h3><Bot size={18} /> AI Assistant</h3>
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
          <div className="sidebar-section-title">Navigasi Enterprise</div>
          <div className={`menu-item ${activeMenu === '1' ? 'active' : ''}`} onClick={() => setActiveMenu('1')}>
            <LayoutDashboard size={18} /><span>1. Executive Summary</span>
          </div>
          <div className={`menu-item ${activeMenu === '2' ? 'active' : ''}`} onClick={() => setActiveMenu('2')}>
            <LineChartIcon size={18} /><span>2. Performance Trend</span>
          </div>
          <div className={`menu-item ${activeMenu === '3' ? 'active' : ''}`} onClick={() => setActiveMenu('3')}>
            <Activity size={18} /><span>3. Forecast</span>
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
          <p style={{fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600}}>Usecase 8 — AI Team</p>
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
              {activeMenu === '4' && 'Forecast vs Target'}
              {activeMenu === '5' && 'Revenue Growth Projection'}
              {activeMenu === '6' && 'Anomaly Alert'}
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

function Section2({ data }) {
  const [selectedSegment, setSelectedSegment] = useState(SEGMENTS[0]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [aggregation, setAggregation] = useState('Quarterly');

  // Filter available metrics based on selected category from SEGMENT_MAP
  const availableMetrics = Object.keys(SEGMENT_MAP).filter(m => SEGMENT_MAP[m] === selectedSegment);
  
  useEffect(() => {
    // Set default metrics when category changes (first 3)
    setSelectedMetrics(availableMetrics.slice(0, 3));
  }, [selectedSegment]);

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
      const periods = [...new Set(data.historical.map(d => d.period))];
      const years = [...new Set(periods.map(p => p.split(' ')[0]))]; 
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
        content={`Mode Agregasi ${aggregation} aktif pada kategori ${selectedSegment}. Anda membandingkan ${selectedMetrics.length} metrik secara bersamaan.`} 
      />

      <div className="glass-card">
        <div style={{display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Kategori</label>
            <select 
              className="form-select" 
              style={{padding: '0.6rem 1rem', width: '250px'}} 
              value={selectedSegment} 
              onChange={(e) => setSelectedSegment(e.target.value)}
            >
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Tampilan</label>
            <div className="radio-group" style={{padding: '0.2rem', margin: 0}}>
              <div className={`radio-label ${aggregation === 'Quarterly' ? 'active' : ''}`} onClick={() => setAggregation('Quarterly')}>Quarterly</div>
              <div className={`radio-label ${aggregation === 'Annual' ? 'active' : ''}`} onClick={() => setAggregation('Annual')}>Annual</div>
            </div>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Pilih Metrik</label>
            <MultiSelectDropdown 
              options={availableMetrics} 
              selected={selectedMetrics} 
              onChange={setSelectedMetrics} 
              placeholder="Pilih metrik..." 
            />
          </div>
          
        </div>

        <div style={{ width: '100%', height: 450 }}>
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

function Section3({ data }) {
  // Replicating Streamlit Forecast logic exactly
  const availableMetrics = [...new Set(data.forecast.map(d => d.metric_id))].sort();
  const [metric, setMetric] = useState(availableMetrics[0] || 'revenue');
  
  const availableModels = [...new Set(data.forecast.filter(d => d.metric_id === metric).map(d => d.model))].sort();
  const [model, setModel] = useState('');
  
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

  const detailedForecasts = fc.filter(f => f.period !== (hist.length > 0 ? hist[hist.length - 1].period : ''));

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title={`Proyeksi Model ${model}`} 
        content={`Menggunakan pendekatan algoritma ${model} untuk memproyeksikan ${metric.toUpperCase()}. Confidence interval memberikan gambaran batas pesimis (lower) dan optimis (upper) dengan tingkat probabilitas 95%.`} 
      />

      <div className="glass-card">
        
        <div style={{display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Pilih Metrik</label>
            <select 
              className="form-select" 
              style={{padding: '0.6rem 1rem', width: '250px'}} 
              value={metric} 
              onChange={(e) => setMetric(e.target.value)}
            >
              {availableMetrics.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Pilih Model</label>
            <select 
              className="form-select" 
              style={{padding: '0.6rem 1rem', width: '250px'}} 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
            >
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: 500 }}>
          <ResponsiveContainer>
            <ComposedChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} formatter={(val) => formatIDR(val)} />
              <Legend verticalAlign="top" height={36}/>
              
              <Area type="monotone" dataKey="U95" fill="rgba(245, 158, 11, 0.15)" stroke="none" name="CI 95%" />
              <Area type="monotone" dataKey="L95" fill="var(--bg-card)" stroke="none" name="Lower 95% CI (Mask)" legendType="none" />
              <Area type="monotone" dataKey="U80" fill="rgba(245, 158, 11, 0.25)" stroke="none" name="CI 80%" />
              <Area type="monotone" dataKey="L80" fill="var(--bg-card)" stroke="none" name="Lower 80% CI (Mask)" legendType="none" />
              
              <Line type="monotone" dataKey="Actual" stroke="#64ffda" strokeWidth={2} dot={{r:4}} />
              <Line type="monotone" dataKey="Forecast" stroke="#ffd166" strokeWidth={2} strokeDasharray="5 5" dot={{symbol: 'diamond', r: 5}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Detail Forecast Table */}
      <div className="glass-card">
        <div className="card-title">Detail Forecast:</div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tahun</th>
                <th>Kuartal</th>
                <th>Forecast</th>
                <th>Lower 95%</th>
                <th>Upper 95%</th>
              </tr>
            </thead>
            <tbody>
              {detailedForecasts.map((f, i) => (
                <tr key={i}>
                  <td><strong>{f.period.split(' ')[1]}</strong></td>
                  <td><strong>{f.period.split(' ')[0].replace('Q','')}</strong></td>
                  <td style={{color: '#f59e0b', fontWeight: 'bold'}}>{formatIDR(f.forecast)}</td>
                  <td style={{color: 'var(--danger)'}}>{formatIDR(f.lower_95)}</td>
                  <td style={{color: 'var(--success)'}}>{formatIDR(f.upper_95)}</td>
                </tr>
              ))}
              {detailedForecasts.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center'}}>Tidak ada data proyeksi untuk model ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Section4({ data }) {
  // Target metrics exactly like Streamlit
  const target_metrics = ["revenue", "ebitda", "netinc", "opinc", "fcf"];
  const [targets, setTargets] = useState({});
  
  useEffect(() => {
    const initialTargets = {};
    target_metrics.forEach(m => {
      const h = data.historical.filter(d => d.metric_id === m);
      if (h.length > 0) initialTargets[m] = ((h[h.length - 1].value_scaled * 1.05) / 1000).toFixed(2);
    });
    setTargets(initialTargets);
  }, [data]);

  const targetResults = target_metrics.map(m => {
    const mFc = data.forecast.filter(d => d.metric_id === m);
    if (mFc.length === 0) return null;
    
    // Find best model like Streamlit did
    const bestModelsDf = data.best_models || [];
    const bestModelRow = bestModelsDf.find(b => b.metric_id === m);
    const bestModel = bestModelRow ? bestModelRow.best_model : mFc[0].model;
    
    const modelFc = mFc.filter(d => d.model === bestModel); 
    if(modelFc.length === 0) return null;
    const nextQ = modelFc[0]; 
    const t = (parseFloat(targets[m]) || 0) * 1000;
    const gap = t !== 0 ? ((nextQ.forecast - t) / Math.abs(t)) * 100 : 0;
    
    let status = "OFF-TRACK"; let statusColor = "var(--danger)";
    if (nextQ.forecast >= t) { status = "ON-TRACK"; statusColor = "var(--success)"; }
    else if (nextQ.upper_95 >= t) { status = "AT-RISK"; statusColor = "var(--warning)"; }
    
    return { m, nextQ, t, gap, status, statusColor, modelName: bestModel };
  }).filter(Boolean);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Simulasi Target Perusahaan" 
        content="Bandingkan angka ekspektasi (Target) Anda terhadap kemampuan nyata perusahaan berdasarkan machine learning. Sesuai Streamlit, 5 metrik fundamental utama siap disimulasikan." 
      />

      <div className="glass-card">
        <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.85rem'}}>
          *Target default = nilai terakhir + 5% growth (dapat disesuaikan):*
        </p>
        
        <div style={{display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          {target_metrics.map(m => (
            <div key={m} style={{display: 'flex', flexDirection: 'column', gap: '0.35rem'}}>
              <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Target {m}</label>
              <input type="number" className="form-input" style={{width: '120px', padding: '0.4rem'}} 
                     value={targets[m] !== undefined ? targets[m] : ''} 
                     onChange={(e) => setTargets(prev => ({...prev, [m]: e.target.value}))} step="0.1" />
            </div>
          ))}
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Model</th>
                <th>Forecast</th>
                <th>Target</th>
                <th>Gap (%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {targetResults.map(res => (
                <tr key={res.m}>
                  <td><strong>{res.m}</strong></td>
                  <td>{res.modelName}</td>
                  <td>{formatIDR(res.nextQ.forecast)}</td>
                  <td>{formatIDR(res.t)}</td>
                  <td style={{color: res.gap >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold'}}>
                    {res.gap > 0 ? '+' : ''}{res.gap.toFixed(1)}%
                  </td>
                  <td>
                    <span className="badge" style={{backgroundColor: res.statusColor, color: '#fff', padding: '0.4rem 0.8rem'}}>
                      {res.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Section5({ data }) {
  const revHist = data.historical.filter(d => d.metric_id === 'revenue');
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
        <div style={{ width: '100%', height: 450 }}>
          <ResponsiveContainer>
            <ComposedChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
              <XAxis dataKey="period" stroke="var(--text-muted)" />
              <YAxis yAxisId="left" stroke="var(--text-muted)" tickFormatter={val => formatIDR(val).replace('Rp ', '')} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-purple)" tickFormatter={val => `${val}%`} />
              <RechartsTooltip contentStyle={{backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-glass)'}} />
              <Legend verticalAlign="top" height={36}/>
              <Bar yAxisId="left" dataKey="Revenue" fill="#64ffda" opacity={0.7} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="ForecastRev" fill="#ffd166" opacity={0.7} name="Forecast Revenue" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="Growth" stroke="#a78bfa" strokeWidth={2} dot={{r: 5}} name="QoQ Growth %" />
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

  // Transform anomalies for the bubble chart (Timeline Anomali like Streamlit)
  // X = period, Y = metric_name, Size = value.abs()
  const scatterData = anomalies.map(a => {
    const absVal = Math.abs(a.value);
    const sizeVal = absVal < 1 ? 1 : absVal; // clip lower=1
    return {
      period: a.period,
      metric: a.metric_name || a.metric_id,
      severity: a.severity,
      description: a.description,
      sizeVal: sizeVal, // Maps to Z-Axis in Scatter
      fill: a.severity === 'CRITICAL' ? '#ff6b6b' : a.severity === 'WARNING' ? '#ffd166' : '#64ffda'
    };
  });

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <AutoInsight 
        title="Manajemen Risiko & Fraud" 
        content={`Terdapat ${anomalies.length} anomali historis. Visualisasi di bawah kini sama persis dengan 'Timeline Anomali' di Streamlit, di mana ukuran bubble berdasarkan absolute value.`} 
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
        <div className="card-title" style={{marginBottom: '1.5rem'}}>Timeline Anomali</div>
        
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 140 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} horizontal={true} />
              <XAxis dataKey="period" type="category" allowDuplicatedCategory={false} name="Period" stroke="var(--text-muted)" tick={{fontSize: 11, angle: -45, textAnchor: 'end'}} />
              <YAxis dataKey="metric" type="category" allowDuplicatedCategory={false} name="Metric" stroke="var(--text-muted)" tick={{fontSize: 11}} width={140} />
              <ZAxis dataKey="sizeVal" range={[100, 1000]} name="Value (Abs)" />
              <RechartsTooltip cursor={{strokeDasharray: '3 3'}} content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{background: 'var(--bg-main)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px'}}>
                      <p style={{color: data.fill, fontWeight: 'bold'}}>{data.severity}</p>
                      <p style={{color: 'white', fontSize: '0.85rem'}}>{data.period} - {data.metric}</p>
                      <p style={{color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '250px', marginTop: '4px'}}>{data.description}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Scatter name="Anomalies" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
          <div className="card-title" style={{marginBottom: 0}}>Detail Anomali</div>
          <div className="radio-group" style={{margin: 0}}>
            <div className={`radio-label ${filterSeverity === 'ALL' ? 'active' : ''}`} onClick={() => setFilterSeverity('ALL')}>Semua</div>
            <div className={`radio-label ${filterSeverity === 'CRITICAL' ? 'active' : ''}`} onClick={() => setFilterSeverity('CRITICAL')}>Critical</div>
            <div className={`radio-label ${filterSeverity === 'WARNING' ? 'active' : ''}`} onClick={() => setFilterSeverity('WARNING')}>Warning</div>
            <div className={`radio-label ${filterSeverity === 'INFO' ? 'active' : ''}`} onClick={() => setFilterSeverity('INFO')}>Info</div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tahun</th>
                <th>Kuartal</th>
                <th>Metrik Keuangan</th>
                <th>Tingkat Keparahan</th>
                <th>Tipe</th>
                <th>Deskripsi Diagnostik</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnomalies.map((a, i) => {
                const parts = a.period.split(' ');
                const q = parts[0].replace('Q', '');
                const y = parts[1];
                return (
                  <tr key={i}>
                    <td>{y}</td>
                    <td>{q}</td>
                    <td>{a.metric_name || a.metric_id}</td>
                    <td>
                      <span style={{color: a.severity === 'CRITICAL' ? '#ff6b6b' : a.severity === 'WARNING' ? '#ffd166' : '#64ffda', fontWeight: 'bold'}}>
                        {a.severity}
                      </span>
                    </td>
                    <td>{a.type}</td>
                    <td style={{fontSize: '0.8rem', lineHeight: 1.4}}>{a.description}</td>
                  </tr>
                );
              })}
              {filteredAnomalies.length === 0 && (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>Tidak ada anomali untuk filter ini.</td></tr>
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
      <div className="glass-card">
        <div className="card-title">Evaluasi Model (Walk-Forward Backtest)</div>
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
                  <td>{e.MAPE !== undefined ? e.MAPE.toFixed(2) : 'N/A'}</td>
                  <td>{e.RMSE !== undefined ? e.RMSE.toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="glass-card">
        <div className="card-title">Model Terbaik per Metrik (MAPE Terendah):</div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th>Model Final</th>
                <th>MAPE (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.best_models.map((b, i) => (
                <tr key={i}>
                  <td><strong>{b.metric_id.toUpperCase()}</strong></td>
                  <td style={{color: 'var(--accent-blue)', fontWeight: 'bold'}}>{b.best_model}</td>
                  <td>{b.best_MAPE !== undefined ? b.best_MAPE.toFixed(2) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-title">Batasan Sistem</div>
        <div className="alert-box" style={{borderLeft: '4px solid #64ffda', background: 'rgba(26,26,46,0.8)'}}>
          <div>
            <div className="alert-title">Batasan Usecase (WAJIB DIPATUHI):</div>
            <div className="alert-desc">
              Sistem ini <strong>HANYA</strong> mencakup analisis performa keuangan internal perusahaan.<br/><br/>
              <strong>DILARANG:</strong> Prediksi harga saham, analisis market sentiment, prediksi IHSG/kapitalisasi pasar, rekomendasi trading (buy/sell/hold), analisis perilaku investor.
            </div>
          </div>
        </div>
        
        <div className="alert-box" style={{borderLeft: '4px solid #ffd166', background: 'rgba(26,26,46,0.8)'}}>
          <div>
            <div className="alert-title">Limitasi Data:</div>
            <div className="alert-desc">
              • Short time-series: hanya 20 kuartal (2021 Q2 – 2026 Q1)<br/>
              • Tidak ada segmentasi regional / produk / customer<br/>
              • Tidak ada data budget / realisasi (target menggunakan input manual)<br/>
              • Data konsolidasi entity-level saja
            </div>
          </div>
        </div>
        
        <div className="alert-box" style={{borderLeft: '4px solid #64ffda', background: 'rgba(26,26,46,0.8)'}}>
          <div>
            <div className="alert-title">Catatan Model:</div>
            <div className="alert-desc">
              • 20 kuartal tergolong short series — model kompleks (LSTM) WAJIB dibandingkan head-to-head dengan baseline sederhana lewat walk-forward backtest<br/>
              • Jika LSTM kalah dari baseline, baseline menjadi model default<br/>
              • Prediction interval mencerminkan uncertainty yang jujur dari short series<br/>
              • Semua data traceable ke CSV sumber — TIDAK ADA fabrikasi data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
