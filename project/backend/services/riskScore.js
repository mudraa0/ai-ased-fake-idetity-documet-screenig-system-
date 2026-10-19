/**
 * Calculates a combined document risk score (0-100), risk level, and data gap assessment.
 * @param {object} params - Input forensic signals.
 * @param {object|null} params.docData - Document extraction result.
 * @param {object|null} params.validationResult - Checksum & Date validation result.
 * @param {number} [params.tamperScore=0] - ELA tamper discrepancy score (0-100).
 * @param {object|null} params.metadata - Metadata inspection result.
 * @param {number|null} [params.faceMatchScore=null] - Face match percentage (0-100).
 * @param {boolean|null} [params.matchLikely=null] - Boolean face match status.
 * @returns {object} { riskScore, riskLevel, requiresManualReview, dataGaps, breakdown, signalStatuses }
 */
function calculateRiskScore({
  docData = null,
  validationResult = null,
  tamperScore = 0,
  metadata = null,
  faceMatchScore = null,
  matchLikely = null
}) {
  let checksumPenalty = 0;
  let datePenalty = 0;
  let tamperPenalty = 0;
  let metadataPenalty = 0;
  let facePenalty = 0;

  const dataGaps = [];
  const signalStatuses = {};

  // 1. OCR Substrate / Checksum Signal
  const docStatus = docData?.status || validationResult?.status || 'PASS';

  if (docData && docData.success === false) {
    signalStatuses.ocr = 'UNREADABLE';
    dataGaps.push('Document OCR text and Machine-Readable Zone could not be extracted (UNREADABLE)');
  } else {
    signalStatuses.ocr = 'PASS';
  }

  // Checksum Check
  const mrzValid = validationResult?.mrzValid;
  const checksumValid = validationResult?.checksum?.valid;

  if (docStatus === 'MRZ_NOT_DETECTED' || docStatus === 'UNREADABLE') {
    signalStatuses.checksum = 'UNREADABLE';
    dataGaps.push('Machine-Readable Checksum could not be validated due to unreadable OCR (UNREADABLE)');
  } else if (mrzValid === false || checksumValid === false || docStatus === 'MRZ_INVALID' || docStatus === 'FAIL') {
    signalStatuses.checksum = 'FAIL';
    checksumPenalty = 30; // Only FAIL adds points
  } else {
    signalStatuses.checksum = 'PASS';
  }

  // 2. Date Logic Signal
  const dates = validationResult?.dates;
  const hasDates = Boolean(
    docData?.fields?.birthDate ||
    docData?.fields?.expirationDate ||
    docData?.fields?.dateOfBirth ||
    docData?.fields?.entryValidUntil
  );

  if (!hasDates || !dates || dates.valid === false) {
    if (dates && Array.isArray(dates.flags) && dates.flags.length > 0) {
      signalStatuses.dates = 'FAIL';
      datePenalty = Math.min(20, dates.flags.length * 10);
    } else {
      signalStatuses.dates = 'UNREADABLE';
      dataGaps.push('Document expiration or birth dates missing or unparseable (UNREADABLE)');
    }
  } else {
    signalStatuses.dates = 'PASS';
  }

  // 3. ELA Tampering Signal
  if (typeof tamperScore === 'number' && tamperScore > 0) {
    tamperPenalty = Math.min(30, Math.round(tamperScore * 0.3));
    signalStatuses.tampering = tamperScore >= 50 ? 'FAIL' : 'PASS';
  } else {
    signalStatuses.tampering = 'PASS';
  }

  // 4. Metadata (EXIF) Signal
  if (!metadata || metadata.hasMetadata === false) {
    signalStatuses.metadata = 'NOT_AVAILABLE';
    dataGaps.push('Image EXIF metadata stripped or not available (NOT_AVAILABLE)');
  } else if (metadata.suspiciousFlags && metadata.suspiciousFlags.length > 0) {
    signalStatuses.metadata = 'FAIL';
    metadataPenalty = Math.min(15, metadata.suspiciousFlags.length * 5);
  } else {
    signalStatuses.metadata = 'PASS';
  }

  // 5. Face Verification Signal
  if (matchLikely === null && faceMatchScore === null) {
    signalStatuses.faceMatch = 'NOT_APPLICABLE'; // Selfie optional
  } else if (matchLikely === false || (faceMatchScore !== null && faceMatchScore < 40)) {
    signalStatuses.faceMatch = 'FAIL';
    facePenalty = 25;
  } else {
    signalStatuses.faceMatch = 'PASS';
  }

  // Compute total raw points (ONLY status FAIL or Tampering contributes)
  const rawTotal = checksumPenalty + datePenalty + tamperPenalty + metadataPenalty + facePenalty;
  const riskScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

  let riskLevel = 'LOW';
  if (riskScore >= 60) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 30) {
    riskLevel = 'MEDIUM';
  }

  // Rule 2: If more than 2 signals are UNREADABLE / NOT_AVAILABLE, force riskLevel = REQUIRES_MANUAL_REVIEW
  if (dataGaps.length > 2) {
    riskLevel = 'REQUIRES_MANUAL_REVIEW';
  }

  const requiresManualReview = (riskLevel === 'REQUIRES_MANUAL_REVIEW' || riskLevel === 'HIGH' || riskLevel === 'MEDIUM');

  return {
    riskScore,
    riskLevel,
    requiresManualReview,
    cannotAssess: dataGaps.length > 2 || docStatus === 'UNREADABLE' || docStatus === 'MRZ_NOT_DETECTED',
    dataGaps,
    signalStatuses,
    breakdown: {
      checksumPenalty,
      datePenalty,
      tamperPenalty,
      metadataPenalty,
      facePenalty
    }
  };
}

module.exports = {
  calculateRiskScore
};
