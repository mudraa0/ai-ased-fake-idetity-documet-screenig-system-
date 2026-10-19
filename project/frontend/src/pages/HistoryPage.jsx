import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import ScanResultDisplay from '../components/ScanResultDisplay';

function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected scan modal state
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [selectedScanData, setSelectedScanData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:5000/api/scans');
        setScans(res.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch scan history');
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  const handleRowClick = async (id) => {
    try {
      setSelectedScanId(id);
      setModalLoading(true);
      const res = await axios.get(`http://localhost:5000/api/scans/${id}`);
      setSelectedScanData(res.data);
    } catch (err) {
      alert('Failed to load scan details: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedScanId(null);
    setSelectedScanData(null);
  };

  const filteredScans = filterLevel === 'ALL'
    ? scans
    : scans.filter(s => (s.riskAssessment?.riskLevel || 'LOW') === filterLevel);

  return (
    <div className="main-content">
      <Header title="Historical Screening Records Audit Log" />

      <div className="page-container">
        {/* Controls & Filter Card */}
        <div className="gov-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              CLASSIFIED AUDIT LOG ({filteredScans.length} RECORDS)
            </span>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="riskFilterSelect" style={{ margin: 0 }}>Filter by Risk Level:</label>
            <select
              id="riskFilterSelect"
              className="gov-control"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{ padding: '0.4rem 0.75rem' }}
            >
              <option value="ALL">ALL RISK LEVELS</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="REQUIRES_MANUAL_REVIEW">REQUIRES MANUAL REVIEW</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="gov-card" style={{ fontFamily: 'var(--font-mono)' }}>[SYSTEM] Querying scan record database...</div>
        ) : error ? (
          <div className="gov-card flag-item">⚠️ {error}</div>
        ) : filteredScans.length === 0 ? (
          <div className="gov-card cannot-assess-card">
            <div className="cannot-assess-header">
              <span className="cannot-assess-icon">📋</span>
              <div>
                <h3 className="cannot-assess-title">NO MATCHING AUDIT RECORDS</h3>
                <p className="cannot-assess-sub">FILTER: {filterLevel}</p>
              </div>
            </div>
            <div className="cannot-assess-body">
              <p style={{ color: 'var(--text-muted)' }}>No historical scan records match the selected filter criteria.</p>
            </div>
          </div>
        ) : (
          <div className="gov-card">
            <table className="gov-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <th style={{ textAlign: 'left', padding: '0.65rem' }}>TIMESTAMP</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem' }}>DOC TYPE</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem' }}>RISK LEVEL</th>
                  <th style={{ textAlign: 'right', padding: '0.65rem' }}>SCORE</th>
                  <th style={{ textAlign: 'center', padding: '0.65rem' }}>RECOMMENDATION</th>
                  <th style={{ textAlign: 'center', padding: '0.65rem' }}>FLAG</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map(scan => {
                  const riskLevel = scan.riskAssessment?.riskLevel || 'LOW';
                  const rec = scan.aiNarrative?.recommendedAction || 'MANUAL_REVIEW';
                  const needsReview = Boolean(scan.riskAssessment?.requiresManualReview || riskLevel === 'REQUIRES_MANUAL_REVIEW');

                  return (
                    <tr
                      key={scan.id}
                      onClick={() => handleRowClick(scan.id)}
                      className="history-row-clickable"
                      style={{ borderBottom: '1px solid var(--border-card)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '0.65rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {new Date(scan.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.65rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        {scan.docType}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        <span className={`status-badge-flag ${riskLevel.toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                          {riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {scan.riskAssessment?.riskScore ?? 0} / 100
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                        <span className={`rec-badge rec-${rec.toLowerCase()}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                          {rec}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'center' }}>
                        {needsReview ? (
                          <span style={{ background: 'var(--status-warn-bg)', color: 'var(--status-warn-text)', border: '1px solid var(--status-warn-border)', padding: '0.15rem 0.5rem', borderRadius: '2px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700 }}>
                            ⚠️ NEEDS REVIEW
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      {selectedScanId && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">RECORD INSPECTOR — SCAN #{selectedScanId.slice(0, 8)}</span>
              <button className="modal-close-btn" onClick={closeModal}>✕ CLOSE</button>
            </div>
            <div className="modal-body">
              {modalLoading ? (
                <div style={{ fontFamily: 'var(--font-mono)', padding: '2rem', textAlign: 'center' }}>[SYSTEM] Retrieving forensic record payload...</div>
              ) : selectedScanData ? (
                <ScanResultDisplay backendResponse={selectedScanData} />
              ) : (
                <div>Failed to load record details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
