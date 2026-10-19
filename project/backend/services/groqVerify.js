const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) {
    return null;
  }
  return new Groq({ apiKey });
}

/**
 * Sends document image to Groq vision model for visual tampering and field cross-check.
 * @param {string} imagePath - Path to original image file.
 * @param {string} docType - Document type (passport, nationalID, visa).
 * @returns {Promise<object>} Parsed vision check result or error object.
 */
async function visionCrossCheck(imagePath, docType) {
  const groq = getGroqClient();
  if (!groq) {
    return {
      error: 'GROQ_API_KEY is not configured or is a placeholder in .env'
    };
  }

  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const base64Image = fileBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase().replace('.', '') || 'jpeg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const promptText = `You are an expert document forensics assistant inspecting a ${docType || 'identity'} document.
Look carefully at the document image and:
1. Extract visible name, document number, and date of birth if readable.
2. Inspect for visual signs of tampering (inconsistent fonts, misaligned text, lighting/shadow mismatches around photo, localized blurring or pixelation, mismatched paper texture).

Respond ONLY with a valid JSON object matching this exact shape (no markdown code blocks, no preamble, no commentary):
{
  "extractedFields": {
    "name": "string or null",
    "documentNumber": "string or null",
    "dateOfBirth": "string or null"
  },
  "visualTamperFlags": ["array of flag strings"],
  "confidenceNote": "string explanation"
}`;

    const chatCompletion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: dataUri } }
          ]
        }
      ],
      temperature: 0.2
    });

    let rawResponse = chatCompletion.choices[0]?.message?.content || '';
    // Strip markdown code fences if present
    rawResponse = rawResponse.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      return JSON.parse(rawResponse);
    } catch (parseErr) {
      return {
        error: 'Failed to parse JSON response from Groq vision model',
        rawResponse
      };
    }
  } catch (err) {
    return {
      error: err.message || 'Groq vision cross-check request failed'
    };
  }
}

/**
 * Generates a 3-4 sentence plain-English summary for a border security officer.
 * @param {object} fullResultObject - Complete backend response object.
 * @returns {Promise<string>} Summary text string.
 */
async function generateInvestigatorSummary(fullResultObject) {
  const groq = getGroqClient();
  if (!groq) {
    return 'Groq AI investigator summary unavailable (GROQ_API_KEY not configured in .env).';
  }

  try {
    const prompt = `You are an AI forensics assistant writing a concise 3-4 sentence plain-English summary report for a border security officer.
Analyze the following document screening data JSON:
${JSON.stringify(fullResultObject, null, 2)}

Explain IN SIMPLE TERMS:
1. Why this document received its overall risk score and risk level.
2. Reference specific signals by name: checksum/MRZ results, ELA tamper score, EXIF metadata flags, and biometric face match results if present.
Write directly to the officer in clear, professional language. Do NOT use JSON formatting, bullet points, or markdown code fences.`;

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an expert border security document forensics officer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });

    return chatCompletion.choices[0]?.message?.content?.trim() || 'Summary could not be generated.';
  } catch (err) {
    return `Investigator summary error: ${err.message || 'Groq API request failed'}`;
  }
}

module.exports = {
  visionCrossCheck,
  generateInvestigatorSummary
};
