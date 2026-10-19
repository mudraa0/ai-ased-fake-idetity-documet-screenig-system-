const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// ICAO 9303 7-3-1 weighting check-digit algorithm
function computeICAOCheckDigit(str) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    let val = 0;
    if (char >= '0' && char <= '9') {
      val = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      val = char.charCodeAt(0) - 65 + 10;
    } else {
      val = 0; // '<'
    }
    sum += val * weights[i % 3];
  }
  return (sum % 10).toString();
}

function drawBasePassportCanvas() {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 600, 400);

  // Border & Header
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 580, 380);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 10, 580, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PASSPORT / PASSEPORT - REPUBLIC OF DEMO', 30, 42);

  // Photo Box (Original)
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(30, 80, 130, 170);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText('PHOTO', 70, 170);

  // Document Text Fields
  ctx.fillStyle = '#0f172a';
  ctx.font = '14px monospace';

  ctx.fillText('Surname / Nom:', 180, 95);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('ERIKSSON', 180, 115);

  ctx.font = '14px monospace';
  ctx.fillText('Given Names / Prenoms:', 180, 140);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('ANNA MARIA', 180, 160);

  ctx.font = '14px monospace';
  ctx.fillText('Nationality:', 180, 185);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('USA', 180, 205);

  ctx.font = '14px monospace';
  ctx.fillText('Date of Birth / Date de naissance:', 180, 230);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('06 AUG 1969', 180, 250);

  ctx.font = '14px monospace';
  ctx.fillText('Passport No / No du passeport:', 400, 95);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('L898902C3', 400, 115);

  ctx.font = '14px monospace';
  ctx.fillText('Sex / Sexe:', 400, 140);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('F', 400, 160);

  ctx.font = '14px monospace';
  ctx.fillText('Date of Expiration:', 400, 185);
  ctx.font = 'bold 16px monospace';
  ctx.fillText('01 JAN 2030', 400, 205);

  // MRZ Section Divider
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 280);
  ctx.lineTo(580, 280);
  ctx.stroke();

  return { canvas, ctx };
}

function generateDemoSet() {
  const outputDir = path.join(__dirname, '..', 'test-images', 'demo-set');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Calculate valid check digits for MRZ Line 2
  const docNum = 'L898902C3';
  const docNumCheck = computeICAOCheckDigit(docNum); // 6
  const dob = '690806';
  const dobCheck = computeICAOCheckDigit(dob); // 1
  const exp = '300101';
  const expCheck = computeICAOCheckDigit(exp); // 5

  const mrzLine1 = 'P<USAERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
  const validMrzLine2 = `${docNum}${docNumCheck}USA${dob}${dobCheck}F${exp}${expCheck}ZE184226B<<<<<10`;
  const invalidMrzLine2 = `${docNum}9USA${dob}${dobCheck}F${exp}${expCheck}ZE184226B<<<<<10`; // corrupted check digit

  // 1. Generate genuine.jpg
  const { canvas: c1, ctx: ctx1 } = drawBasePassportCanvas();
  ctx1.fillStyle = '#0f172a';
  ctx1.font = 'bold 18px "Courier New", monospace';
  ctx1.fillText(mrzLine1, 30, 320);
  ctx1.fillText(validMrzLine2, 30, 350);
  fs.writeFileSync(path.join(outputDir, 'genuine.jpg'), c1.toBuffer('image/jpeg', { quality: 0.95 }));

  // 2. Generate tampered_photo.jpg (swapped photo region overlay)
  const { canvas: c2, ctx: ctx2 } = drawBasePassportCanvas();
  ctx2.fillStyle = '#0f172a';
  ctx2.font = 'bold 18px "Courier New", monospace';
  ctx2.fillText(mrzLine1, 30, 320);
  ctx2.fillText(validMrzLine2, 30, 350);
  // Paste swapped photo box with mismatched compression boundary
  ctx2.fillStyle = '#ef4444';
  ctx2.fillRect(35, 85, 120, 160);
  ctx2.fillStyle = '#ffffff';
  ctx2.font = 'bold 14px sans-serif';
  ctx2.fillText('TAMPERED', 55, 165);
  fs.writeFileSync(path.join(outputDir, 'tampered_photo.jpg'), c2.toBuffer('image/jpeg', { quality: 0.95 }));

  // 3. Generate tampered_text.jpg (overwritten text region)
  const { canvas: c3, ctx: ctx3 } = drawBasePassportCanvas();
  ctx3.fillStyle = '#0f172a';
  ctx3.font = 'bold 18px "Courier New", monospace';
  ctx3.fillText(mrzLine1, 30, 320);
  ctx3.fillText(validMrzLine2, 30, 350);
  // Overwrite Date of Birth in mismatched font style
  ctx3.fillStyle = '#f1f5f9';
  ctx3.fillRect(175, 235, 180, 22);
  ctx3.fillStyle = '#dc2626';
  ctx3.font = 'bold 20px "Comic Sans MS", Arial, sans-serif';
  ctx3.fillText('12 DEC 1999', 180, 252);
  fs.writeFileSync(path.join(outputDir, 'tampered_text.jpg'), c3.toBuffer('image/jpeg', { quality: 0.95 }));

  // 4. Generate invalid_checksum.jpg (corrupted MRZ check digit)
  const { canvas: c4, ctx: ctx4 } = drawBasePassportCanvas();
  ctx4.fillStyle = '#0f172a';
  ctx4.font = 'bold 18px "Courier New", monospace';
  ctx4.fillText(mrzLine1, 30, 320);
  ctx4.fillText(invalidMrzLine2, 30, 350);
  fs.writeFileSync(path.join(outputDir, 'invalid_checksum.jpg'), c4.toBuffer('image/jpeg', { quality: 0.95 }));

  console.log(`Successfully generated 4 synthetic demo passport images in ${outputDir}`);
}

generateDemoSet();
