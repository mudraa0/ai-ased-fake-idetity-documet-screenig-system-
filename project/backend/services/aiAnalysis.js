/**
 * Deterministic local fallback generator for document forensic narrative.
 * Used when Groq API key is missing, network fails, or request times out.
 * Returns the exact same JSON schema as the LLM, with isAIGenerated: false.
 * @param {object} screeningResult 
 * @returns {object} Structured forensic analysis payload.
 */
function generateLocalFallbackNarrative(screeningResult) {
  const risk = screeningResult.riskAssessment || {};
  const riskScore = risk.riskScore ?? 0;
  const riskLevel = risk.riskLevel || 'LOW';
  const signalStatuses = risk.signalStatuses || {};
  const dataGaps = risk.dataGaps || [];
  const metadataFlags = screeningResult.metadata?.suspiciousFlags || [];

  const passedChecks = [];
  const failedChecks = [];
  const positiveSignals = [];
  const suspiciousSignals = [];
  const limitations = [...dataGaps];

  // Evaluate passed vs failed checks
  if (signalStatuses.ocr === 'PASS') passedChecks.push('Optical Character Recognition (OCR)');
  if (signalStatuses.checksum === 'PASS') {
    passedChecks.push('Substrate Checksum / MRZ Checkdigit');
    positiveSignals.push('Valid document checkdigits verified');
  } else if (signalStatuses.checksum === 'FAIL') {
    failedChecks.push('MRZ / Verhoeff Checksum Failure');
  }

  if (signalStatuses.dates === 'PASS') {
    passedChecks.push('Date Sequence & Expiry Validity');
    positiveSignals.push('Document dates logically consistent and unexpired');
  } else if (signalStatuses.dates === 'FAIL') {
    failedChecks.push('Date Sequence Anomaly');
  }

  if (signalStatuses.tampering === 'FAIL' || (screeningResult.ela?.tamperScore >= 40)) {
    suspiciousSignals.push(`Spectral ELA high discrepancy score (${screeningResult.ela?.tamperScore}/100)`);
    failedChecks.push('Error Level Analysis Substrate Tampering');
  } else {
    passedChecks.push('Error Level Substrate Compression Uniformity');
    positiveSignals.push('Substrate ELA compression pattern uniform');
  }

  if (signalStatuses.metadata === 'FAIL') {
    metadataFlags.forEach(f => suspiciousSignals.push(`EXIF: ${f}`));
    failedChecks.push('Image Editing Software Tag in EXIF Metadata');
  } else if (signalStatuses.metadata === 'PASS') {
    passedChecks.push('EXIF Metadata Inspection');
    positiveSignals.push('No image editing software signatures found in EXIF');
  }

  if (signalStatuses.faceMatch === 'PASS') {
    passedChecks.push('Biometric Face Verification');
    positiveSignals.push(`Biometric facial match confirmed (${screeningResult.faceMatchScore}%)`);
  } else if (signalStatuses.faceMatch === 'FAIL') {
    failedChecks.push('Biometric Facial Verification Failure');
    suspiciousSignals.push('Live selfie facial geometry does not match passport photo');
  }

  let recommendedAction = 'APPROVE';
  if (riskLevel === 'HIGH' || failedChecks.length > 1) {
    recommendedAction = 'REJECT';
  } else if (riskLevel === 'MEDIUM' || riskLevel === 'REQUIRES_MANUAL_REVIEW' || failedChecks.length === 1 || dataGaps.length > 0) {
    recommendedAction = 'MANUAL_REVIEW';
  }

  let overallAssessment = `Document assessment completed with ${riskLevel} threat classification (Score: ${riskScore}/100).`;
  if (riskLevel === 'REQUIRES_MANUAL_REVIEW') {
    overallAssessment = `Document requires mandatory officer manual review due to ${dataGaps.length} unreadable or missing verification signals.`;
  }

  let riskExplanation = `The document yielded a threat index of ${riskScore}/100. `;
  if (failedChecks.length > 0) {
    riskExplanation += `Forensic check failures detected: ${failedChecks.join(', ')}. `;
  }
  if (suspiciousSignals.length > 0) {
    riskExplanation += `Anomalies observed: ${suspiciousSignals.join('; ')}. `;
  }
  if (dataGaps.length > 0) {
    riskExplanation += `Assessment contains data gaps: ${dataGaps.join('; ')}.`;
  }
  if (failedChecks.length === 0 && suspiciousSignals.length === 0 && dataGaps.length === 0) {
    riskExplanation += `All forensic checks passed clean with no substrate tampering or metadata anomalies.`;
  }

  return {
    isAIGenerated: false,
    source: 'local-fallback-analysis',
    overallAssessment,
    positiveSignals,
    suspiciousSignals,
    failedChecks,
    passedChecks,
    riskExplanation,
    recommendedAction,
    limitations
  };
}

/**
 * Generates an AI-driven forensic narrative using Groq Llama-3.3 70B.
 * Falls back deterministically to generateLocalFallbackNarrative when API key is missing or fails.
 * @param {object} screeningResult 
 * @returns {Promise<object>} Structured narrative response.
 */
async function generateNarrative(screeningResult) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_key_here' || apiKey.startsWith('gsk_demo')) {
    return generateLocalFallbackNarrative(screeningResult);
  }

  const compactSummary = {
    docType: screeningResult.docType || 'unknown',
    extractedFields: screeningResult.idData?.fields || screeningResult.passportData?.fields || screeningResult.visaData?.fields || null,
    checksumValidation: screeningResult.validation?.mrzValid ?? screeningResult.validation?.checksum ?? null,
    dateValidation: screeningResult.validation?.dates || null,
    tamperScore: screeningResult.ela?.tamperScore ?? 0,
    metadataFlags: screeningResult.metadata?.suspiciousFlags || [],
    faceMatchScore: screeningResult.faceMatchScore ?? null,
    matchLikely: screeningResult.matchLikely ?? null,
    riskScore: screeningResult.riskAssessment?.riskScore ?? 0,
    riskLevel: screeningResult.riskAssessment?.riskLevel ?? 'LOW',
    dataGaps: screeningResult.riskAssessment?.dataGaps || []
  };

  const systemPrompt = `You are a senior document forensic examiner for a border security agency. You are given structured signals already computed by a forensic pipeline (OCR, checksum validation, image tamper analysis, metadata analysis, face match). You do NOT re-analyze the image yourself — you ONLY interpret the structured signals provided. Respond ONLY with a JSON object with EXACTLY these keys:
- overallAssessment (string: 1 short sentence summary)
- positiveSignals (array of strings: verified genuine signals)
- suspiciousSignals (array of strings: anomalies or tampering flags)
- failedChecks (array of strings: explicit validation failures)
- passedChecks (array of strings: explicit validation passes)
- riskExplanation (string: 2-4 sentences explaining WHY the risk level was assigned)
- recommendedAction (string: exactly one of "APPROVE", "MANUAL_REVIEW", or "REJECT")
- limitations (array of strings: data gaps, unreadable fields, or missing metadata)

CRITICAL INSTRUCTION: Only reference signals actually present in the input. Never invent findings or assume details not provided in the input summary.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(compactSummary) }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Groq AI] HTTP Error ${response.status}: ${response.statusText}`);
      return generateLocalFallbackNarrative(screeningResult);
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;

    if (!content) {
      return generateLocalFallbackNarrative(screeningResult);
    }

    const parsed = JSON.parse(content);
    return {
      isAIGenerated: true,
      source: 'groq-llama-3.3-70b',
      overallAssessment: parsed.overallAssessment || 'Forensic analysis completed.',
      positiveSignals: Array.isArray(parsed.positiveSignals) ? parsed.positiveSignals : [],
      suspiciousSignals: Array.isArray(parsed.suspiciousSignals) ? parsed.suspiciousSignals : [],
      failedChecks: Array.isArray(parsed.failedChecks) ? parsed.failedChecks : [],
      passedChecks: Array.isArray(parsed.passedChecks) ? parsed.passedChecks : [],
      riskExplanation: parsed.riskExplanation || 'Forensic signals processed.',
      recommendedAction: ['APPROVE', 'MANUAL_REVIEW', 'REJECT'].includes(parsed.recommendedAction)
        ? parsed.recommendedAction
        : 'MANUAL_REVIEW',
      limitations: Array.isArray(parsed.limitations) ? parsed.limitations : []
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[Groq AI Exception]:', err.message);
    return generateLocalFallbackNarrative(screeningResult);
  }
}

module.exports = {
  generateNarrative,
  generateLocalFallbackNarrative
};
