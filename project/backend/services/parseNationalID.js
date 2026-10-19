/**
 * Parses generic 12-digit national ID card text using keyword-proximity & regex matching.
 * @param {string} rawText - Raw OCR text output.
 * @returns {object} Object with success flag and extracted fields.
 */
function parseIDDocument(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      fields: {
        name: null,
        idNumber: null,
        dateOfBirth: null,
        gender: null,
        address: null
      }
    };
  }

  const fields = {
    name: null,
    idNumber: null,
    dateOfBirth: null,
    gender: null,
    address: null
  };

  // 1. 12-digit ID Number (allowing spaces or hyphens every 4 digits)
  const idRegex = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/;
  const idMatch = rawText.match(idRegex);
  if (idMatch) {
    fields.idNumber = idMatch[1].replace(/[\s-]/g, '');
  }

  // 2. Name
  const nameRegex = /(?:Full\s+Name|Name)[\s:]*([A-Za-z\s\.\'-]{2,40})/i;
  const nameMatch = rawText.match(nameRegex);
  if (nameMatch) {
    const rawName = nameMatch[1].trim();
    if (!/^(gender|dob|sex|address|id|number|date)$/i.test(rawName)) {
      fields.name = rawName.split(/\r?\n/)[0].trim();
    }
  }

  // 3. Date of Birth
  const dobRegex = /(?:DOB|Date\s+of\s+Birth|Birth\s+Date)[\s:]*([0-3]?\d[\/\.-][0-1]?\d[\/\.-](?:19|20)\d{2}|(?:19|20)\d{2}[\/\.-][0-1]?\d[\/\.-][0-3]?\d)/i;
  const dobMatch = rawText.match(dobRegex);
  if (dobMatch) {
    fields.dateOfBirth = dobMatch[1].trim();
  } else {
    // Fallback date pattern
    const fallbackDateMatch = rawText.match(/\b([0-3]?\d[\/\.-][0-1]?\d[\/\.-](?:19|20)\d{2})\b/);
    if (fallbackDateMatch) {
      fields.dateOfBirth = fallbackDateMatch[1].trim();
    }
  }

  // 4. Gender / Sex
  const genderRegex = /(?:Gender|Sex)[\s:]*(Male|Female|M|F)\b/i;
  const genderMatch = rawText.match(genderRegex);
  if (genderMatch) {
    const g = genderMatch[1].trim().toUpperCase();
    fields.gender = g.startsWith('M') ? 'Male' : 'Female';
  } else {
    const standaloneGender = rawText.match(/\b(Male|Female)\b/i);
    if (standaloneGender) {
      fields.gender = standaloneGender[1].charAt(0).toUpperCase() + standaloneGender[1].slice(1).toLowerCase();
    }
  }

  // 5. Address
  const addressRegex = /(?:Address|ADDR)[\s:]*([^\n\r]+(?:\r?\n[^\n\r]+)?)/i;
  const addressMatch = rawText.match(addressRegex);
  if (addressMatch) {
    fields.address = addressMatch[1].trim();
  }

  const success = Object.values(fields).some(val => val !== null);

  return {
    success,
    fields
  };
}

module.exports = {
  parseIDDocument
};
