import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarRadiusAxis
} from 'recharts';

function ScanResultDisplay({ backendResponse, documentPreview, selfiePreview, faceResult }) {
  if (!backendResponse) return null;

  const risk = backendResponse.riskAssessment;
  const cannotAssess = Boolean(risk?.cannotAssess || backendResponse?.passportData?.status === 'UNREADABLE' || backendResponse?.passportData?.status === 'MRZ_NOT_DETECTED');
  const docDataObj = backendResponse.idData || backendResponse.passportData || backendResponse.visaData;
  const idFields = docDataObj?.fields;
  const docReason = docDataObj?.reason;

  const validation = backendResponse.validation;
  const ela = backendResponse.ela;
  const metadata = backendResponse.metadata;
  const groq = backendResponse.groqVerification;
  const aiNarrative = backendResponse.aiNarrative;

  // Recharts RadialBarChart single-bar gauge data
  const radialData = [
    {
      name: 'Risk Score',
      value: risk ? Math.min(100, Math.max(0, risk.riskScore)) : 0,
      fill: risk?.riskLevel === 'REQUIRES_MANUAL_REVIEW'
        ? '#8b5cf6'
        : risk?.riskScore >= 60
        ? '#ef4444'
        : risk?.riskScore >= 30
        ? '#f59e0b'
        : '#10b981'
    }
  ];

  // Recharts RadarChart 5-axis signal breakdown (scaled 0-100% relative to category max: 30, 20, 30, 15, 25)
  const radarData = risk?.breakdown
    ? [
        {
          subject: 'Checksum',
          value: Math.round(((risk.breakdown.checksumPenalty || 0) / 30) * 100),
          rawPenalty: risk.breakdown.checksumPenalty || 0,
          maxPenalty: 30
        },
        {
          subject: 'Dates',
          value: Math.round(((risk.breakdown.datePenalty || 0) / 20) * 100),
          rawPenalty: risk.breakdown.datePenalty || 0,
          maxPenalty: 20
        },
        {
          subject: 'Tampering',
          value: Math.round(((risk.breakdown.tamperPenalty || 0) / 30) * 100),
          rawPenalty: risk.breakdown.tamperPenalty || 0,
          maxPenalty: 30
        },
        {
          subject: 'Metadata',
          value: Math.round(((risk.breakdown.metadataPenalty || 0) / 15) * 100),
          rawPenalty: risk.breakdown.metadataPenalty || 0,
          maxPenalty: 15
        },
        {
          subject: 'Face Match',
          value: Math.round(((risk.breakdown.facePenalty || 0) / 25) * 100),
          rawPenalty: risk.breakdown.facePenalty || 0,
          maxPenalty: 25
        }
      ]
    : [];

  // Recharts horizontal bar chart data array
  const chartData = risk?.breakdown
    ? [
        { name: 'Checksum', penalty: risk.breakdown.checksumPenalty || 0 },
        { name: 'Dates', penalty: risk.breakdown.datePenalty || 0 },
        { name: 'Tampering', penalty: risk.breakdown.tamperPenalty || 0 },
        { name: 'Metadata', penalty: risk.breakdown.metadataPenalty || 0 },
        { name: 'Face Match', penalty: risk.breakdown.facePenalty || 0 }
      ]
    : [];

  return (
    <div className="results-workspace">
      {cannotAssess ? (
        <div className="gov-card cannot-assess-card">
          <div className="cannot-assess-header">
            <span className="cannot-assess-icon">⚠️</span>
            <div>
              <h3 className="cannot-assess-title">UNREADABLE DOCUMENT / REQUIRES MANUAL REVIEW</h3>
              <p className="cannot-assess-sub">
                STATUS: UNREADABLE — Document Machine-Readable Zone or text could not be verified.
              </p>
            </div>
          </div>
          <div className="cannot-assess-body">
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--status-warn-text)', marginBottom: '0.75rem' }}>
              Could not read machine-readable zone — try a higher-resolution image or the synthetic test set.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              An unreadable scan is a data acquisition gap rather than proof of forgery. Penalty points have been suppressed and the status set to REQUIRES_MANUAL_REVIEW.
            </p>
            {risk?.dataGaps && risk.dataGaps.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ color: 'var(--accent-gold)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>IDENTIFIED DATA GAPS:</strong>
                <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                  {risk.dataGaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="desktop-results-grid">
          {/* Top Hero Row (Gauge: 4 cols, AI Narrative: 8 cols) */}
          <div className="grid-hero-row">
            {/* Risk Gauge Panel */}
            {risk && (
              <div className="gov-card risk-gauge-panel hero-gauge-card">
                <div className="radial-gauge-container" style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="100%"
                      barSize={14}
                      startAngle={90}
                      endAngle={-270}
                      data={radialData}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar
                        background={{ fill: '#070e1f' }}
                        dataKey="value"
                        cornerRadius={2}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div
                    className="radial-center-overlay"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: radialData[0].fill, lineHeight: 1 }}>
                      {risk.riskScore}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: '0.2rem' }}>
                      SCORE / 100
                    </span>
                  </div>
                </div>

                <div className="verdict-box" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <div>
                    <span className={`status-badge-flag ${risk.riskLevel.toLowerCase()}`}>
                      {risk.riskLevel === 'LOW'
                        ? '✓ LOW RISK [CLEAR FOR ENTRY]'
                        : risk.riskLevel === 'MEDIUM'
                        ? '⚠️ MEDIUM RISK [SECONDARY INSPECTION]'
                        : risk.riskLevel === 'REQUIRES_MANUAL_REVIEW'
                        ? '📋 REQUIRES MANUAL REVIEW'
                        : '🚨 HIGH RISK [INTERCEPT & DETAIN]'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.4rem' }}>
                    FORENSIC THREAT INDEX: {risk.riskScore}/100 ({risk.riskLevel})
                  </div>
                </div>
              </div>
            )}

            {/* Standalone AI Forensic Analysis Card */}
            {aiNarrative && (
              <div className={`gov-card ai-narrative-card hero-narrative-card rec-${(aiNarrative.recommendedAction || 'MANUAL_REVIEW').toLowerCase()}`}>
                <div className="ai-narrative-header">
                  <div className="ai-narrative-title-group">
                    <span className="ai-expert-icon">📝</span>
                    <div>
                      <h3 className="ai-narrative-card-title">AI FORENSIC ANALYSIS & NARRATIVE OPINION</h3>
                      <span className="ai-sub-tag">
                        SOURCE: {aiNarrative.source || 'LOCAL FALLBACK'} {aiNarrative.isAIGenerated ? '● AI GENERATED' : '○ DETERMINISTIC ENGINE'}
                      </span>
                    </div>
                  </div>

                  {aiNarrative.recommendedAction && (
                    <span className={`rec-badge rec-${aiNarrative.recommendedAction.toLowerCase()}`}>
                      {aiNarrative.recommendedAction === 'APPROVE'
                        ? '✓ RECOMMENDATION: APPROVE'
                        : aiNarrative.recommendedAction === 'MANUAL_REVIEW'
                        ? '⚠️ RECOMMENDATION: MANUAL REVIEW'
                        : '🚨 RECOMMENDATION: REJECT'}
                    </span>
                  )}
                </div>

                <div className="ai-narrative-content">
                  <div className="ai-verdict-sentence">
                    "{aiNarrative.overallAssessment}"
                  </div>
                  <p className="ai-narrative-paragraph">
                    {aiNarrative.riskExplanation}
                  </p>

                  {aiNarrative.suspiciousSignals && aiNarrative.suspiciousSignals.length > 0 && (
                    <div className="key-flags-container">
                      <span className="key-flags-label">CRITICAL ANOMALY SIGNALS:</span>
                      <div className="key-flags-chips">
                        {aiNarrative.suspiciousSignals.map((flag, idx) => (
                          <span key={idx} className="flag-chip">
                            🚩 {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 12-Column Grid Cards */}
          <div className="grid-cards-container">
            {/* Extracted Information Table (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">📋 OFFICIAL RECORD LOOKUP</div>
              {docDataObj && docDataObj.success === false ? (
                <div style={{ color: 'var(--status-fail-text)', padding: '0.75rem', backgroundColor: 'var(--status-fail-bg)', border: '1px solid var(--status-fail-border)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  ⚠️ <strong>PARSING FAILED:</strong> {docReason || 'No MRZ detected in OCR output'}
                </div>
              ) : idFields && Object.keys(idFields).length > 0 ? (
                <table className="gov-table">
                  <tbody>
                    {Object.entries(idFields).map(([key, val]) => (
                      <tr key={key}>
                        <td className="gov-td-label">{key}</td>
                        <td className="gov-td-val">{val || <span style={{ color: '#64748b' }}>N/A</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No structured fields extracted from document.</p>
              )}
            </div>

            {/* Checksum & Date Validation (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">🛡️ CHECKSUM & DATE VALIDATION</div>
              <div className="val-status-list">
                <div className="val-status-item">
                  {validation?.mrzValid === true || validation?.checksum?.valid === true ? (
                    <span className="val-tag-pass">[PASS]</span>
                  ) : validation?.status === 'UNREADABLE' ? (
                    <span style={{ color: 'var(--status-warn-text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>[UNREADABLE]</span>
                  ) : (
                    <span className="val-tag-fail">[FAIL]</span>
                  )}
                  <div>
                    <strong>Checksum Status:</strong>{' '}
                    {validation?.mrzValid === true
                      ? 'ICAO 9303 Checkdigits Validated'
                      : validation?.checksum?.valid === true
                      ? 'Verhoeff D5 Checksum Validated'
                      : validation?.mrzValid === false || validation?.status === 'MRZ_INVALID'
                      ? 'MRZ Checkdigit Validation Failed'
                      : 'Unreadable MRZ / Checksum unavailable'}
                  </div>
                </div>

                <div className="val-status-item">
                  {validation?.dates?.valid ? (
                    <span className="val-tag-pass">[PASS]</span>
                  ) : (
                    <span className="val-tag-fail">[WARN]</span>
                  )}
                  <div>
                    <strong>Date Logic Status:</strong>{' '}
                    {validation?.dates?.valid
                      ? 'All Dates Logically Valid'
                      : 'Date Validation Anomalies Found'}
                  </div>
                </div>

                {validation?.dates?.flags && validation.dates.flags.length > 0 && (
                  <div className="flag-list" style={{ marginTop: '0.5rem' }}>
                    {validation.dates.flags.map((flag, idx) => (
                      <div className="flag-item" key={idx}>⚠️ {flag}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ELA Tampering Inspector (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">🔍 SPECTRAL ELA SUBSTRATE INSPECTOR</div>
              {ela ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
                    <span>TAMPER DISCREPANCY SCORE</span>
                    <span>{ela.tamperScore} / 100</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#070e1f', border: '1px solid var(--border-card)', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${ela.tamperScore}%`,
                        backgroundColor: ela.tamperScore >= 60 ? 'var(--status-fail-border)' : ela.tamperScore >= 30 ? 'var(--status-warn-border)' : 'var(--status-pass-border)',
                        transition: 'width 0.5s ease'
                      }}
                    />
                  </div>

                  <div className="side-by-side-grid">
                    <figure className="img-panel-box">
                      <img src={documentPreview || (backendResponse.filename ? `http://localhost:5000/uploads/${backendResponse.filename}` : '')} alt="Original Upload" />
                      <figcaption>CHANNEL A: RAW SCAN</figcaption>
                    </figure>
                    <figure className="img-panel-box">
                      <img src={ela.elaImagePath ? `http://localhost:5000${ela.elaImagePath}` : ''} alt="ELA Heatmap" />
                      <figcaption>CHANNEL B: 15X ELA HEATMAP</figcaption>
                    </figure>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>ELA analysis unavailable.</p>
              )}
            </div>

            {/* EXIF Metadata Card (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">📁 EXIF METADATA ANALYSIS</div>
              {metadata ? (
                metadata.hasMetadata === false ? (
                  <div style={{ color: 'var(--status-warn-text)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', padding: '0.5rem', background: 'var(--status-warn-bg)', border: '1px solid var(--status-warn-border)' }}>
                    ⚠️ STATUS: NOT_AVAILABLE — Image EXIF metadata stripped or missing
                  </div>
                ) : metadata.suspiciousFlags && metadata.suspiciousFlags.length > 0 ? (
                  <div className="flag-list">
                    {metadata.suspiciousFlags.map((flag, idx) => (
                      <div className="flag-item" key={idx}>🚩 {flag}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--status-pass-text)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                    ✓ STATUS: PASS — No EXIF anomalies detected
                  </div>
                )
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Metadata analysis unavailable.</p>
              )}
            </div>

            {/* Biometric Face Verification Card (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">👤 BIOMETRIC FACE VERIFICATION</div>
              {selfiePreview || backendResponse.faceMatchScore !== undefined ? (
                <>
                  <div className="side-by-side-grid">
                    <figure className="img-panel-box">
                      <img src={documentPreview || (backendResponse.filename ? `http://localhost:5000/uploads/${backendResponse.filename}` : '')} alt="Doc Portrait" />
                      <figcaption>PASSPORT PORTRAIT</figcaption>
                    </figure>
                    <figure className="img-panel-box">
                      <img src={selfiePreview || documentPreview || ''} alt="Live Selfie" />
                      <figcaption>LIVE SELFIE</figcaption>
                    </figure>
                  </div>

                  {(faceResult || backendResponse.faceMatchScore !== undefined) && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      {faceResult?.error ? (
                        <div className="flag-item">⚠️ {faceResult.error}</div>
                      ) : (
                        <>
                          <span className={`status-badge-flag ${(faceResult?.matchLikely ?? backendResponse.matchLikely) ? 'low' : 'high'}`} style={{ fontSize: '0.88rem' }}>
                            {(faceResult?.matchLikely ?? backendResponse.matchLikely) ? '✓ MATCH CONFIRMED (SAME PERSON)' : '🚨 MATCH FAILED (DIFFERENT PERSON)'}
                          </span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', marginTop: '0.5rem', color: 'var(--text-main)' }}>
                            MATCH SCORE: {faceResult?.faceMatchScore ?? backendResponse.faceMatchScore}%
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', padding: '1rem', background: '#070e1f', border: '1px solid var(--border-card)' }}>
                  STATUS: NOT_APPLICABLE — Live selfie not uploaded for biometric cross-check.
                </div>
              )}
            </div>

            {/* Radar Spider Telemetry Chart (Col 6) */}
            <div className="gov-card col-span-6">
              <div className="gov-card-title">
                <span>🕸️ RISK FACTOR BREAKDOWN (SPIDER RADAR TELEMETRY)</span>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  RELATIVE IMPACT
                </span>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#253866" />
                    <PolarAngleAxis
                      dataKey="subject"
                      stroke="#94a3b8"
                      tick={{ fill: '#f8fafc', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar
                      name="Risk Impact"
                      dataKey="value"
                      stroke="#d4af37"
                      fill="#d4af37"
                      fillOpacity={0.4}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#070e1f', borderColor: '#253866', color: '#f8fafc', fontFamily: 'var(--font-mono)' }}
                      formatter={(value, name, item) => [
                        `${value}% (${item.payload.rawPenalty} / ${item.payload.maxPenalty} pts)`,
                        'Relative Impact'
                      ]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScanResultDisplay;
