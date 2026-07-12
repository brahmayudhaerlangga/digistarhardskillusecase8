import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, DollarSign, Users, Target, LayoutDashboard, Database, Settings } from 'lucide-react';
import './index.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const METRIC_MAP = {
  'revenue': { label: 'Revenue', historicalKey: 'revenue' },
  'netinc': { label: 'Net Income', historicalKey: 'netIncome' },
  'ebitda': { label: 'EBITDA', historicalKey: 'operatingIncome' },
  'opex': { label: 'Operating Expenses', historicalKey: 'operatingExpenses' }
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Interactive States
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [activeMenu, setActiveMenu] = useState('dashboard');

  useEffect(() => {
    fetch('/data/dashboard.json')
      .then(res => {
        if (!res.ok) throw new Error('Data tidak ditemukan');
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="dashboard-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><h2>Loading AI Data...</h2></div>;
  if (error) return <div className="dashboard-container"><h2>Error: {error}</h2></div>;
  if (!data) return null;

  // Format Rupiah in Billions/Trillions
  const formatIDR = (val) => {
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(2)} T`;
    return `Rp ${val.toFixed(0)} M`;
  };

  // Get currently selected metric info
  const metricInfo = METRIC_MAP[selectedMetric];
  const histKey = metricInfo.historicalKey;

  // Prepare combined historical + forecast data for the main chart based on selected metric
  const historicalChartData = data.historical.map(d => ({
    period: d.period,
    Actual: d[histKey] || 0
  }));
  
  const metricForecasts = data.forecast[selectedMetric] || [];
  
  const forecastChartData = metricForecasts.map(d => ({
    period: d.period,
    Forecast: d.forecast,
    Target: d.target,
    Lower80: d.lower_80,
    Upper80: d.upper_80
  }));

  // Connect the lines
  if (historicalChartData.length > 0 && forecastChartData.length > 0) {
    const lastHist = historicalChartData[historicalChartData.length - 1];
    forecastChartData.unshift({
      period: lastHist.period,
      Actual: lastHist.Actual,
      Forecast: lastHist.Actual,
      Target: lastHist.Actual
    });
  }

  const combinedData = [...historicalChartData, ...forecastChartData.slice(1)];
  const latestHist = data.historical[data.historical.length-1];

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>FPIS B2B</h2>
          <p>Financial AI System</p>
        </div>
        
        <div className="sidebar-menu">
          <div className="sidebar-section-title">Main Menu</div>
          <div className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>
            <LayoutDashboard size={18} />
            <span>Executive Dashboard</span>
          </div>
          <div className={`menu-item ${activeMenu === 'data' ? 'active' : ''}`} onClick={() => setActiveMenu('data')}>
            <Database size={18} />
            <span>Dataset & Models</span>
          </div>
          <div className={`menu-item ${activeMenu === 'settings' ? 'active' : ''}`} onClick={() => setActiveMenu('settings')}>
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </div>

        <div style={{marginTop: 'auto'}}>
          <div className="glass-card" style={{padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)'}}>
            <p style={{fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: '600', marginBottom: '0.25rem'}}>Model Status</p>
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>XGBoost & Holt-Winters active. RMSE: 2.14%</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOP BAR WITH INTERACTIVE DROPDOWN */}
        <header className="top-bar">
          <div className="page-title">
            <h1>Performance Analytics</h1>
          </div>
          <div className="topbar-controls">
            <div className="metric-select-wrapper">
              <label htmlFor="metric-select">Select Metric:</label>
              <select 
                id="metric-select" 
                className="metric-select" 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                <option value="revenue">Total Revenue</option>
                <option value="ebitda">EBITDA</option>
                <option value="netinc">Net Income</option>
                <option value="opex">Operating Expenses</option>
              </select>
            </div>
          </div>
        </header>

        <div className="dashboard-container">
          {/* KPI Cards */}
          <section className="kpi-grid">
            <div className="glass-card">
              <div className="card-title"><DollarSign size={18}/> Q1 2026 {metricInfo.label}</div>
              <div className="kpi-value">{formatIDR(latestHist[histKey] || 0)}</div>
              <div className="kpi-trend trend-up"><TrendingUp size={16}/> +3.2% QoQ</div>
            </div>
            <div className="glass-card">
              <div className="card-title"><Target size={18}/> Forecast Q2 2026</div>
              <div className="kpi-value">{metricForecasts.length > 0 ? formatIDR(metricForecasts[0].forecast) : 'N/A'}</div>
              <div className="kpi-trend trend-up"><TrendingUp size={16}/> Expected Growth</div>
            </div>
            <div className="glass-card">
              <div className="card-title"><Activity size={18}/> Target Achievement</div>
              <div className="kpi-value">98.5%</div>
              <div className="kpi-trend trend-down"><TrendingDown size={16}/> -1.5% Gap</div>
            </div>
            <div className="glass-card">
              <div className="card-title"><Users size={18}/> Total Subscribers</div>
              <div className="kpi-value">{latestHist.subscribers} Juta</div>
              <div className="kpi-trend trend-up"><TrendingUp size={16}/> +0.5 Juta QoQ</div>
            </div>
          </section>

          {/* Main Chart */}
          <section className="chart-grid">
            <div className="glass-card">
              <div className="card-title">AI Forecast vs Target ({metricInfo.label})</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                    <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}T` : `${val}M`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border-glass)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-main)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Upper80" fill="rgba(59, 130, 246, 0.1)" stroke="none" />
                    <Area type="monotone" dataKey="Lower80" fill="var(--bg-card)" stroke="none" />
                    <Line type="monotone" dataKey="Actual" stroke="var(--text-main)" strokeWidth={3} dot={{r: 4}} />
                    <Line type="monotone" dataKey="Forecast" stroke="var(--accent-blue)" strokeWidth={3} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Target" stroke="var(--danger)" strokeWidth={2} strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card">
              <div className="card-title">Anomaly Detection Alerts</div>
              <div className="alerts-container" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {data.anomalies.map((anom, idx) => (
                  <div key={idx} className={`alert-box ${anom.status === 'CRITICAL' ? 'critical' : 'warning'}`}>
                    {anom.status === 'CRITICAL' ? <AlertTriangle color="var(--danger)"/> : <AlertCircle color="var(--warning)"/>}
                    <div>
                      <div className="alert-title">{anom.period} - {anom.metric_id}</div>
                      <div className="alert-desc">{anom.deskripsi}</div>
                    </div>
                  </div>
                ))}
                {data.anomalies.length === 0 && (
                  <p style={{color: 'var(--text-muted)'}}>No critical anomalies detected.</p>
                )}
              </div>
            </div>
          </section>

          {/* Segmentation Charts */}
          <section className="split-grid">
            <div className="glass-card">
              <div className="card-title">Regional Segmentation (Mock)</div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={data.regional} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                    <XAxis type="number" stroke="var(--text-muted)" tickFormatter={(val) => `${(val/1000).toFixed(0)}T`} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-dark)' }} />
                    <Bar dataKey="value" fill="var(--accent-purple)" radius={[0, 4, 4, 0]}>
                      {data.regional.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card">
              <div className="card-title">Product Contribution (Mock)</div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data.product}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.product.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-dark)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* AI Insights */}
          <section className="glass-card">
            <div className="card-title">AI Predictive Insights</div>
            <ul style={{marginLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8'}}>
              {data.insights.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
