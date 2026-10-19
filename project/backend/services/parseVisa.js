/**
 * Parses generic Visa document OCR text using keyword-proximity & regex matching.
 * @param {string} rawText - Raw OCR text output.
 * @returns {object} Object with success flag and extracted fields.
 */
function parseVisaDocument(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      fields: {
        visaNumber: null,
        visaType: null,
        entryValidUntil: null,
        stayDuration: null
      }
    };
  }

  const fields = {
    visaNumber: null,
    visaType: null,
    entryValidUntil: null,
    stayDuration: null
  };

  // 1. Visa Number
  const visaNumRegex = /(?:Visa\s+(?:No|Num|Number)|Control\s+No|VISA\s+NO)[\s:]*([A-Za-z0-9-]{6,15})/i;
  const visaNumMatch = rawText.match(visaNumRegex);
  if (visaNumMatch) {
    fields.visaNumber = visaNumMatch[1].trim();
  } else {
    const fallbackNum = rawText.match(/\b([A-Z]{1,2}\d{7,9})\b/);
    if (fallbackNum) {
      fields.visaNumber = fallbackNum[1].trim();
    }
  }

  // 2. Visa Type / Class
  const typeRegex = /(?:Type|Visa\s+Type|Class)[\s:]*([A-Za-z0-9\/-]{1,15})/i;
  const typeMatch = rawText.match(typeRegex);
  if (typeMatch) {
    fields.visaType = typeMatch[1].trim();
  }

  // 3. Entry Valid Until / Expiry Date
  const validUntilRegex = /(?:Valid\s+Until|Expiry\s+Date|Valid\s+to|Until)[\s:]*([0-3]?\d[\/\.-][0-1]?\d[\/\.-](?:19|20)\d{2}|(?:19|20)\d{2}[\/\.-][0-1]?\d[\/\.-][0-3]?\d)/i;
  const validUntilMatch = rawText.match(validUntilRegex);
  if (validUntilMatch) {
    fields.entryValidUntil = validUntilMatch[1].trim();
  } else {
    const dateFallback = rawText.match(/\b([0-3]?\d[\/\.-][0-1]?\d[\/\.-](?:20)\d{2})\b/);
    if (dateFallback) {
      fields.entryValidUntil = dateFallback[1].trim();
    }
  }

  // 4. Stay Duration / Period of Stay
  const stayRegex = /(?:Duration\s+of\s+Stay|Period\s+of\s+Stay|Stay|Entries)[\s:]*([^\n\r]+)/i;
  const stayMatch = rawText.match(stayRegex);
  if (stayMatch) {
    fields.stayDuration = stayMatch[1].trim();
  }

  const success = Object.values(fields).some(val => val !== null);

  return {
    success,
    fields
  };
}

module.exports = {
  parseVisaDocument
};
