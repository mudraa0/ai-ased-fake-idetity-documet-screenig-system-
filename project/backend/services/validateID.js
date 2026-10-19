const verhoeff = require('node-verhoeff');

/**
 * Validates a 12-digit National ID number using the Verhoeff checksum algorithm.
 * @param {string} idNumber - The ID number to validate.
 * @returns {object} { valid: boolean, reason: string | null }
 */
function validateIDChecksum(idNumber) {
  if (!idNumber || typeof idNumber !== 'string') {
    return { valid: false, reason: 'ID number is missing or invalid type' };
  }

  const cleanId = idNumber.replace(/[\s-]/g, '');

  if (!/^\d{12}$/.test(cleanId)) {
    return { valid: false, reason: 'Not a 12-digit number' };
  }

  const isValid = verhoeff.validate(cleanId) || verhoeff.validateAadhaar(cleanId);

  if (!isValid) {
    return { valid: false, reason: 'Verhoeff checksum validation failed' };
  }

  return { valid: true, reason: null };
}

/**
 * Helper to parse various date formats (DD/MM/YYYY, YYYY-MM-DD, or YYMMDD MRZ string).
 */
function parseDate(dateStr, isExpiry = false) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();

  // 6-digit MRZ date (YYMMDD)
  if (/^\d{6}$/.test(clean)) {
    const yy = parseInt(clean.slice(0, 2), 10);
    const mm = parseInt(clean.slice(2, 4), 10) - 1;
    const dd = parseInt(clean.slice(4, 6), 10);
    const currentYear = new Date().getFullYear();
    const currentYY = currentYear % 100;

    let fullYear;
    if (isExpiry) {
      fullYear = yy <= currentYY + 30 ? 2000 + yy : 1900 + yy;
    } else {
      fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
    }
    const d = new Date(fullYear, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  // Split DD/MM/YYYY or YYYY-MM-DD
  const parts = clean.split(/[\/\.-]/);
  if (parts.length === 3) {
    let year, month, day;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else if (parts[2].length === 4) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
    if (year && month !== undefined && day) {
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Validates date of birth and optional expiration date logic.
 * @param {string|null} dateOfBirth - Birth date string.
 * @param {string|null} expiryDate - Expiration date string.
 * @returns {object} { valid: boolean, flags: string[] }
 */
function validateDates(dateOfBirth, expiryDate) {
  const flags = [];
  const now = new Date();

  let dobObj = null;
  let expObj = null;

  if (dateOfBirth) {
    dobObj = parseDate(dateOfBirth, false);
    if (!dobObj) {
      flags.push('Invalid date of birth format');
    } else {
      const ageDiff = now.getTime() - dobObj.getTime();
      const ageYears = ageDiff / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 0) {
        flags.push('Date of birth is in the future');
      } else if (ageYears > 120) {
        flags.push('Age exceeds 120 years');
      }
    }
  }

  if (expiryDate) {
    expObj = parseDate(expiryDate, true);
    if (!expObj) {
      flags.push('Invalid expiry date format');
    } else {
      if (expObj.getTime() < now.getTime()) {
        flags.push('Document is expired');
      }
      if (dobObj && expObj.getTime() < dobObj.getTime()) {
        flags.push('Expiry date is before date of birth');
      }
    }
  }

  return {
    valid: flags.length === 0,
    flags
  };
}

module.exports = {
  validateIDChecksum,
  validateDates
};
