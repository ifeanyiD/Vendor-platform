import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { API } from '../../config/api';
import './AnalyticsChart.scss';

const StatCard = ({ label, value, icon, trend }) => (
  <div className="stat-card">
    <div className="stat-card__icon">{icon}</div>
    <div className="stat-card__body">
      <p className="stat-card__label">{label}</p>
      <h3 className="stat-card__value">{value.toLocaleString()}</h3>
    </div>
    {trend !== undefined && (
      <div className={`stat-card__trend ${trend >= 0 ? 'up' : 'down'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'storeViews' ? '👁 Views' : '💬 WhatsApp Taps'}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    API.get(`/analytics/summary?days=${period}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  // Format dates for display
  const chartData = data?.daily?.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
  })) || [];

  return (
    <div className="analytics-tab fade-in">
      <div className="analytics-header">
        <h3>Store Analytics</h3>
        <div className="period-btns">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={`period-btn ${period === d ? 'active' : ''}`}
              onClick={() => setPeriod(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stat-cards">
            <StatCard
              icon="👁"
              label={`Store Views (${period}d)`}
              value={data?.totals?.storeViews || 0}
            />
            <StatCard
              icon="💬"
              label={`WhatsApp Taps (${period}d)`}
              value={data?.totals?.whatsappTaps || 0}
            />
            <StatCard
              icon="📈"
              label="Conversion Rate"
              value={data?.totals?.storeViews
                ? `${((data.totals.whatsappTaps / data.totals.storeViews) * 100).toFixed(1)}%`
                : '0%'}
            />
          </div>

          <div className="analytics-card">
            <h4>Views & WhatsApp Taps Over Time</h4>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--gray-400)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--gray-400)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="storeViews"
                    stroke="var(--green-light)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="whatsappTaps"
                    stroke="var(--gold)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <span>📊</span>
                <p>No data yet — share your store link to start seeing analytics!</p>
              </div>
            )}
            <div className="chart-legend">
              <span><span className="legend-dot" style={{ background: 'var(--green-light)' }} /> Store Views</span>
              <span><span className="legend-dot" style={{ background: 'var(--gold)' }} /> WhatsApp Taps</span>
            </div>
          </div>

          {data?.topProducts?.length > 0 && (
            <div className="analytics-card">
              <h4>Top Products by WhatsApp Taps</h4>
              <div className="top-products">
                {data.topProducts.map((p, i) => (
                  <div key={p.productId} className="top-product-row">
                    <span className="top-product-rank">#{i + 1}</span>
                    <span className="top-product-id">{p.productId}</span>
                    <div className="top-product-bar-wrap">
                      <div
                        className="top-product-bar"
                        style={{ width: `${(p.taps / data.topProducts[0].taps) * 100}%` }}
                      />
                    </div>
                    <span className="top-product-count">{p.taps} taps</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
