const { parse } = require('mrz');

/**
 * Parses and validates ICAO 9303 2-line Passport MRZ from raw OCR text.
 * Distinguishes between MRZ_NOT_DETECTED, MRZ_INVALID (found but checkdigits failed), and MRZ_VALID.
 * @param {string} rawText - Raw OCR text output.
 * @returns {object} Result object containing success, status, fields, mrzValid, and details.
 */
function parsePassportDocument(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    console.log('[MRZ Detection Failed]: Empty or non-string raw OCR text provided.');
    return {
      success: false,
      status: 'MRZ_NOT_DETECTED',
      reason: 'No MRZ detected in OCR output',
      fields: null,
      mrzValid: false
    };
  }

  // Clean lines: uppercase and strip characters outside A-Z, 0-9, <
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim().toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter(l => l.length >= 25);

  const candidateLines = lines.filter(l => l.includes('<') || l.length >= 35);

  let mrzLines = null;

  // Search for two candidate lines (Line 1 starting with P or containing MRZ delimiters)
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i];
    const l2 = lines[i + 1];

    if ((l1.startsWith('P') || l1.includes('<<')) && l1.length >= 35 && l2.length >= 35) {
      let cleanL1 = l1;
      let cleanL2 = l2;

      if (cleanL1.length < 44) cleanL1 = cleanL1.padEnd(44, '<');
      if (cleanL1.length > 44) cleanL1 = cleanL1.slice(0, 44);

      if (cleanL2.length < 44) cleanL2 = cleanL2.padEnd(44, '<');
      if (cleanL2.length > 44) cleanL2 = cleanL2.slice(0, 44);

      mrzLines = [cleanL1, cleanL2];
      break;
    }
  }

  if (!mrzLines) {
    console.log('[MRZ Detection Failed] Raw OCR text received:\n', rawText);
    console.log('[MRZ Candidate Lines Found (Malformed or Discarded)]:\n', candidateLines);
    return {
      success: false,
      status: 'MRZ_NOT_DETECTED',
      reason: 'No MRZ detected in OCR output',
      fields: null,
      mrzValid: false
    };
  }

  try {
    const result = parse(mrzLines);
    const isValid = Boolean(result.valid);
    const status = isValid ? 'MRZ_VALID' : 'MRZ_INVALID';

    if (!isValid) {
      console.log('[MRZ Found But Checkdigits Invalid] Candidate MRZ lines:', mrzLines);
      console.log('[MRZ Details]:', result.details);
    }

    return {
      success: isValid,
      status,
      fields: result.fields || {},
      mrzValid: isValid,
      details: result.details || [],
      rawMrzLines: mrzLines
    };
  } catch (err) {
    console.log('[MRZ Parse Exception] Candidate MRZ lines:', mrzLines);
    console.log('[MRZ Parse Error]:', err.message);
    return {
      success: false,
      status: 'MRZ_INVALID',
      reason: err.message || 'MRZ checkdigit validation failed',
      fields: null,
      mrzValid: false,
      rawMrzLines: mrzLines
    };
  }
}

module.exports = {
  parsePassportDocument
};

