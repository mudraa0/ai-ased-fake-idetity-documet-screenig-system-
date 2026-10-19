import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import Header from '../components/Header';

function AnalyticsPage() {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [scansRes, statsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/scans'),
          axios.get('http://localhost:5000/api/dashboard-stats')
        ]);
        setScans(scansRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        <Header title="Longitudinal Threat Analytics & Trend Telemetry" />
        <div className="page-container">
          <div className="gov-card" style={{ fontFamily: 'var(--font-mono)' }}>[SYSTEM] Computing longitudinal forensic telemetry...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <Header title="Longitudinal Threat Analytics & Trend Telemetry" />
        <div className="page-container">
          <div className="gov-card flag-item">⚠️ {error}</div>
        </div>
      </div>
    );
  }

  // Check if fewer than 2 scans exist
  if (scans.length < 2) {
    return (
      <div className="main-content">
        <Header title="Longitudinal Threat Analytics & Trend Telemetry" />
        <div className="page-container">
          <div className="gov-card cannot-assess-card">
            <div className="cannot-assess-header">
              <span className="cannot-assess-icon">📈</span>
              <div>
                <h3 className="cannot-assess-title">INSUFFICIENT TELEMETRY DATA</h3>
                <p className="cannot-assess-sub">CURRENT RECORD COUNT: {scans.length} SCAN(S)</p>
              </div>
            </div>
            <div className="cannot-assess-body">
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--status-warn-text)' }}>
                Run a few more scans to populate trend analytics.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                Longitudinal trend telemetry and stacked document comparison charts require at least 2 saved scan records to plot over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Line Chart Data: riskScore over time (chronological)
  const lineData = scans.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((scan, idx) => ({
    scanNum: `#${idx + 1}`,
    time: new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: scan.riskAssessment?.riskScore ?? 0,
    docType: (scan.docType || 'passport').toUpperCase()
  }));

  // 2. Stacked Bar Chart Data: riskLevelCounts by docType
  const docTypeMap = {
    passport: { docType: 'PASSPORT', LOW: 0, MEDIUM: 0, HIGH: 0, REQUIRES_MANUAL_REVIEW: 0 },
    nationalID: { docType: 'NATIONAL ID', LOW: 0, MEDIUM: 0, HIGH: 0, REQUIRES_MANUAL_REVIEW: 0 },
    visa: { docType: 'VISA', LOW: 0, MEDIUM: 0, HIGH: 0, REQUIRES_MANUAL_REVIEW: 0 }
  };

  scans.forEach(scan => {
    const dt = scan.docType || 'passport';
    const level = scan.riskAssessment?.riskLevel || 'LOW';
    if (docTypeMap[dt]) {
      if (docTypeMap[dt][level] !== undefined) {
        docTypeMap[dt][level]++;
      } else {
        docTypeMap[dt].LOW++;
      }
    }
  });

  const stackedBarData = Object.values(docTypeMap);

  // 3. Averaged 5-axis Radar Chart Data
  const avgContrib = stats?.averageSignalContribution || {};
  const radarData = [
    { subject: 'Checksum', value: Math.round(((avgContrib.checksum || 0) / 30) * 100), rawAvg: avgContrib.checksum || 0, maxPenalty: 30 },
    { subject: 'Dates', value: Math.round(((avgContrib.dates || 0) / 20) * 100), rawAvg: avgContrib.dates || 0, maxPenalty: 20 },
    { subject: 'Tampering', value: Math.round(((avgContrib.tampering || 0) / 30) * 100), rawAvg: avgContrib.tampering || 0, maxPenalty: 30 },
    { subject: 'Metadata', value: Math.round(((avgContrib.metadata || 0) / 15) * 100), rawAvg: avgContrib.metadata || 0, maxPenalty: 15 },
    { subject: 'Face Match', value: Math.round(((avgContrib.face || 0) / 25) * 100), rawAvg: avgContrib.face || 0, maxPenalty: 25 }
  ];

  return (
    <div className="main-content">
      <Header title="Longitudinal Threat Analytics & Trend Telemetry" />

      <div className="page-container">
        <div className="desktop-results-grid">
          <div className="grid-cards-container">
            {/* LineChart of riskScore over time (Col 12) */}
            <div className="gov-card col-span-12">
              <div className="gov-card-title">
                <span>📈 CHRONOLOGICAL THREAT INDEX TREND (RISK SCORE OVER TIME)</span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  TOTAL SAMPLES: {scans.length}
                </span>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2b4c" />
                    <XAxis dataKey="scanNum" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#070e1f', borderColor: '#253866', color: '#f8fafc', fontFamily: 'var(--font-mono)' }}
                      formatter={(val, name, item) => [`Score: ${val}/100 (${item.payload.docType})`, 'Threat Score']}
                    />
                    <Line type="monotone" dataKey="score" stroke="#d4af37" strokeWidth={3} dot={{ fill: '#d4af37', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stacked BarChart of riskLevelCounts by docType (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">
                <span>📊 RISK CLASSIFICATION BY DOCUMENT TYPE</span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>STACKED BREAKDOWN</span>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedBarData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2b4c" />
                    <XAxis dataKey="docType" stroke="#64748b" tick={{ fill: '#f8fafc', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#070e1f', borderColor: '#253866', color: '#f8fafc', fontFamily: 'var(--font-mono)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }} />
                    <Bar dataKey="LOW" stackId="a" fill="#10b981" />
                    <Bar dataKey="MEDIUM" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="HIGH" stackId="a" fill="#ef4444" />
                    <Bar dataKey="REQUIRES_MANUAL_REVIEW" stackId="a" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Averaged 5-axis Radar Chart (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">
                <span>🕸️ MEAN SIGNAL IMPACT PROFILE (AVERAGED RADAR)</span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>HISTORICAL AVERAGE</span>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#253866" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#f8fafc', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar name="Mean Impact" dataKey="value" stroke="#d4af37" fill="#d4af37" fillOpacity={0.4} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#070e1f', borderColor: '#253866', color: '#f8fafc', fontFamily: 'var(--font-mono)' }}
                      formatter={(val, name, item) => [`${val}% (${item.payload.rawAvg} avg pts)`, 'Mean Impact']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
