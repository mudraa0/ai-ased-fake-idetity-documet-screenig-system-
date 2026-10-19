import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import Header from '../components/Header';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:5000/api/dashboard-stats');
        setStats(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        <Header title="Border Control Analytics & Operations Dashboard" />
        <div className="page-container">
          <div className="gov-card" style={{ fontFamily: 'var(--font-mono)' }}>[SYSTEM] Loading operational telemetry stats...</div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="main-content">
        <Header title="Border Control Analytics & Operations Dashboard" />
        <div className="page-container">
          <div className="gov-card flag-item">⚠️ {error || 'Failed to connect to backend server'}</div>
        </div>
      </div>
    );
  }

  const { totalScans, riskLevelCounts, averageRiskScore, last5Scans, averageSignalContribution } = stats;

  const pieData = [
    { name: 'LOW', value: riskLevelCounts.LOW || 0, color: '#10b981' },
    { name: 'MEDIUM', value: riskLevelCounts.MEDIUM || 0, color: '#f59e0b' },
    { name: 'HIGH', value: riskLevelCounts.HIGH || 0, color: '#ef4444' },
    { name: 'REQUIRES_MANUAL_REVIEW', value: riskLevelCounts.REQUIRES_MANUAL_REVIEW || 0, color: '#8b5cf6' }
  ].filter(d => d.value > 0);

  const barData = [
    { category: 'Checksum', avg: averageSignalContribution?.checksum || 0 },
    { category: 'Dates', avg: averageSignalContribution?.dates || 0 },
    { category: 'Tampering', avg: averageSignalContribution?.tampering || 0 },
    { category: 'Metadata', avg: averageSignalContribution?.metadata || 0 },
    { category: 'Face Match', avg: averageSignalContribution?.face || 0 }
  ];

  return (
    <div className="main-content">
      <Header title="Border Control Analytics & Operations Dashboard" />

      <div className="page-container">
        {/* Top Summary Stat Cards */}
        <div className="stats-cards-grid">
          <div className="gov-card stat-card">
            <span className="stat-card-label">TOTAL DOCUMENTS SCREENED</span>
            <span className="stat-card-value">{totalScans}</span>
            <span className="stat-card-sub">LIFETIME RECORD COUNT</span>
          </div>

          <div className="gov-card stat-card">
            <span className="stat-card-label">AVERAGE THREAT INDEX</span>
            <span className="stat-card-value" style={{ color: averageRiskScore >= 60 ? '#ef4444' : averageRiskScore >= 30 ? '#f59e0b' : '#10b981' }}>
              {averageRiskScore} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
            </span>
            <span className="stat-card-sub">MEAN FORENSIC SCORE</span>
          </div>

          <div className="gov-card stat-card">
            <span className="stat-card-label">PENDING MANUAL REVIEWS</span>
            <span className="stat-card-value" style={{ color: '#8b5cf6' }}>
              {riskLevelCounts.REQUIRES_MANUAL_REVIEW || 0}
            </span>
            <span className="stat-card-sub">DATA GAP / UNREADABLE SCANS</span>
          </div>
        </div>

        {totalScans === 0 ? (
          <div className="gov-card cannot-assess-card">
            <div className="cannot-assess-header">
              <span className="cannot-assess-icon">📊</span>
              <div>
                <h3 className="cannot-assess-title">NO SCREENING RECORDS PERSISTED YET</h3>
                <p className="cannot-assess-sub">DATABASE STATUS: READY FOR INTAKE</p>
              </div>
            </div>
            <div className="cannot-assess-body">
              <p style={{ color: 'var(--text-muted)' }}>
                No document verification scans have been recorded. Run your first document scan under the "Scan Document" tab to generate telemetry analytics.
              </p>
            </div>
          </div>
        ) : (
          <div className="desktop-results-grid">
            <div className="grid-cards-container">
              {/* Pie Chart of Risk Level Distribution (Col 6) */}
              <div className="gov-card col-span-6">
                <div className="gov-card-title">
                  <span>🍩 RISK LEVEL DISTRIBUTION</span>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>TOTAL: {totalScans}</span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070e1f', borderColor: '#253866', color: '#f8fafc', fontFamily: 'var(--font-mono)' }}
                        formatter={(value, name) => [`${value} Scans`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pie-legend-grid">
                  {pieData.map(item => (
                    <div className="pie-legend-item" key={item.name}>
                      <span className="pie-legend-dot" style={{ backgroundColor: item.color }} />
                      <span className="pie-legend-name">{item.name}:</span>
                      <span className="pie-legend-val">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Average Signal Contribution Bar Chart (Col 6) */}
              <div className="gov-card col-span-6">
                <div className="gov-card-title">
                  <span>📊 AVERAGE SIGNAL IMPACT BY CATEGORY</span>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>MEAN PENALTY PTS</span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={barData} margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                      <XAxis type="number" domain={[0, 35]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis type="category" dataKey="category" stroke="#64748b" tick={{ fill: '#f8fafc', fontSize: 11, fontFamily: 'var(--font-mono)' }} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070e1f', borderColor: '#253866', color: '#f8fafc', fontFamily: 'var(--font-mono)' }}
                        formatter={(value) => [`${value} avg pts`, 'Mean Penalty']}
                      />
                      <Bar dataKey="avg" fill="#d4af37" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table of 5 Most Recent Scans (Col 12) */}
              <div className="gov-card col-span-12">
                <div className="gov-card-title">📋 RECENT SCREENING ACTIVITY (LAST 5 SCANS)</div>
                <table className="gov-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-card)', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      <th style={{ textAlign: 'left', padding: '0.6rem' }}>TIMESTAMP</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem' }}>DOC TYPE</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem' }}>RISK LEVEL</th>
                      <th style={{ textAlign: 'right', padding: '0.6rem' }}>THREAT SCORE</th>
                      <th style={{ textAlign: 'center', padding: '0.6rem' }}>DECISION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {last5Scans.map(scan => (
                      <tr key={scan.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                        <td style={{ padding: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                          {new Date(scan.timestamp).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          {scan.docType}
                        </td>
                        <td style={{ padding: '0.6rem' }}>
                          <span className={`status-badge-flag ${scan.riskLevel.toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                            {scan.riskLevel}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {scan.riskScore} / 100
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <span className={`rec-badge rec-${(scan.recommendedAction || 'MANUAL_REVIEW').toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                            {scan.recommendedAction}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
