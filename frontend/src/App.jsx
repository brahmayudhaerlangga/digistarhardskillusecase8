import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Activity, DollarSign, Users, Target } from 'lucide-react';
import './index.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Prepare combined historical + forecast data for the main chart
  const historicalChartData = data.historical.map(d => ({
    period: d.period,
    Actual: d.revenue
  }));
  
  const forecastChartData = data.forecast.map(d => ({
    period: d.period,
    Forecast: d.forecast,
    Target: d.target,
    Lower80: d.lower_80,
    Upper80: d.upper_80
  }));

  // To connect the lines, we need the last historical point in the forecast array
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

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-title">
          <h1>FPIS B2B Dashboard</h1>
          <p>Financial Performance Intelligence System - Digistar Usecase 8</p>
        </div>
        <div className="header-badge glass-card" style={{padding: '0.5rem 1rem'}}>
          <span style={{color: 'var(--success)', fontWeight: 'bold'}}>● AI Model Active</span>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <div className="glass-card">
          <div className="card-title"><DollarSign size={18}/> Q1 2026 Revenue</div>
          <div className="kpi-value">{formatIDR(data.historical[data.historical.length-1].revenue)}</div>
          <div className="kpi-trend trend-up"><TrendingUp size={16}/> +3.2% vs last quarter</div>
        </div>
        <div className="glass-card">
          <div className="card-title"><Activity size={18}/> Q1 2026 EBITDA (Est)</div>
          <div className="kpi-value">{formatIDR(data.historical[data.historical.length-1].operatingIncome)}</div>
          <div className="kpi-trend trend-down"><TrendingDown size={16}/> -1.1% vs last quarter</div>
        </div>
        <div className="glass-card">
          <div className="card-title"><Target size={18}/> Forecast Q2 2026</div>
          <div className="kpi-value">{formatIDR(data.forecast[0].forecast)}</div>
          <div className="kpi-trend trend-up"><TrendingUp size={16}/> Expected Growth</div>
        </div>
        <div className="glass-card">
          <div className="card-title"><Users size={18}/> Total Subscribers</div>
          <div className="kpi-value">{data.historical[data.historical.length-1].subscribers} Juta</div>
          <div className="kpi-trend trend-up"><TrendingUp size={16}/> +0.5 Juta QoQ</div>
        </div>
      </section>

      {/* Main Charts */}
      <section className="chart-grid">
        <div className="glass-card">
          <div className="card-title">AI Forecast vs Target (Revenue)</div>
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
  );
}

export default App;
