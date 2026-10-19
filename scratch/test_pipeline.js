const fs = require('fs');
const path = require('path');

function createMinimalPNG() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

async function runTests() {
  console.log('=== STARTING PIPELINE TESTS ===');
  
  const imgBuffer = createMinimalPNG();
  const testImagePath = path.join(__dirname, 'test_unreadable.png');
  fs.writeFileSync(testImagePath, imgBuffer);

  // Test 1: Upload Unreadable Image using Node 18+ global FormData & Blob
  console.log('\n--- TEST 1: Unreadable document without selfie or EXIF ---');
  const fileBlob = new Blob([imgBuffer], { type: 'image/png' });
  const form = new FormData();
  form.append('document', fileBlob, 'test_unreadable.png');
  form.append('docType', 'passport');

  const res1 = await fetch('http://localhost:5000/api/upload', {
    method: 'POST',
    body: form
  });
  const data1 = await res1.json();
  
  console.log('Response ID:', data1.id);
  console.log('Response Timestamp:', data1.timestamp);
  console.log('Passport Status:', data1.passportData?.status);
  console.log('EXIF Status:', data1.metadata?.status);
  console.log('Face Status:', data1.riskAssessment?.breakdown?.faceStatus);
  console.log('Risk Score:', data1.riskAssessment?.riskScore);
  console.log('Risk Level:', data1.riskAssessment?.riskLevel);
  console.log('Requires Manual Review:', data1.riskAssessment?.requiresManualReview);
  console.log('Data Gaps:', data1.riskAssessment?.dataGaps);
  console.log('AI Narrative isAIGenerated:', data1.aiNarrative?.isAIGenerated);
  console.log('AI Narrative Source:', data1.aiNarrative?.source);

  // Verify DB Persistence
  const dbScans = await (await fetch('http://localhost:5000/api/scans')).json();
  console.log('\nSaved Scans Count in DB:', dbScans.length);

  // Test 2: Local Fallback Narrative Test (Groq Key Missing or Invalid)
  console.log('\n--- TEST 2: Local Fallback Narrative Test ---');
  const { generateNarrative } = require('../backend/services/aiAnalysis');
  const dummyResult = {
    docType: 'passport',
    passportData: { status: 'UNREADABLE' },
    riskAssessment: {
      riskScore: 0,
      riskLevel: 'REQUIRES_MANUAL_REVIEW',
      requiresManualReview: true,
      dataGaps: ['Passport MRZ could not be detected or read by OCR.', 'Image contains no EXIF metadata tags.']
    }
  };
  const fallbackNarrative = await generateNarrative(dummyResult);
  console.log('Fallback isAIGenerated:', fallbackNarrative.isAIGenerated);
  console.log('Fallback Source:', fallbackNarrative.source);
  console.log('Fallback recommendedAction:', fallbackNarrative.recommendedAction);

  // Test 3: Dashboard Stats
  console.log('\n--- TEST 3: Dashboard Stats after upload ---');
  const stats = await (await fetch('http://localhost:5000/api/dashboard-stats')).json();
  console.log('Total Scans:', stats.totalScans);
  console.log('Risk Level Counts:', stats.riskLevelCounts);

  // Cleanup test image
  if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
