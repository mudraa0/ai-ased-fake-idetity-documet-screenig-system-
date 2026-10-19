const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Performs Error Level Analysis (ELA) on an image file to detect JPEG tampering.
 * @param {string} imagePath - Path to original image file.
 * @returns {Promise<{ tamperScore: number, elaImagePath: string }>} Result object containing score and output image path.
 */
async function runELA(imagePath) {
  const uploadsDir = path.dirname(imagePath);
  const baseName = path.basename(imagePath);
  const ext = path.extname(baseName);
  const nameWithoutExt = path.basename(baseName, ext);

  const tempPath = path.join(uploadsDir, `temp_resaved_${nameWithoutExt}${ext || '.jpg'}`);
  const elaFileName = `ela_${nameWithoutExt}${ext || '.jpg'}`;
  const elaPath = path.join(uploadsDir, elaFileName);

  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // 1. Re-encode original image at 90% JPEG quality
    await sharp(imagePath)
      .jpeg({ quality: 90 })
      .toFile(tempPath);

    // 2. Extract raw RGB buffers for original and re-saved image
    const origBufferInfo = await sharp(imagePath)
      .resize(width, height, { fit: 'fill' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const resavedBufferInfo = await sharp(tempPath)
      .resize(width, height, { fit: 'fill' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const origData = origBufferInfo.data;
    const resavedData = resavedBufferInfo.data;
    const channels = origBufferInfo.info.channels; // 3 for RGB

    const diffData = Buffer.alloc(origData.length);
    let totalDiffBrightness = 0;

    // 8x8 Grid analysis
    const gridCols = 8;
    const gridRows = 8;
    const cellWidth = Math.floor(width / gridCols);
    const cellHeight = Math.floor(height / gridRows);
    const gridSums = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
    const gridCounts = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));

    // 3. Compute 15x amplified pixel differences
    for (let y = 0; y < height; y++) {
      const cellY = Math.min(Math.floor(y / cellHeight), gridRows - 1);
      for (let x = 0; x < width; x++) {
        const cellX = Math.min(Math.floor(x / cellWidth), gridCols - 1);
        const idx = (y * width + x) * channels;

        const rDiff = Math.abs(origData[idx] - resavedData[idx]);
        const gDiff = Math.abs(origData[idx + 1] - resavedData[idx + 1]);
        const bDiff = Math.abs(origData[idx + 2] - resavedData[idx + 2]);

        // 15x amplification
        const rAmplified = Math.min(255, rDiff * 15);
        const gAmplified = Math.min(255, gDiff * 15);
        const bAmplified = Math.min(255, bDiff * 15);

        diffData[idx] = rAmplified;
        diffData[idx + 1] = gAmplified;
        diffData[idx + 2] = bAmplified;

        const pixelBrightness = (rAmplified + gAmplified + bAmplified) / 3;
        totalDiffBrightness += pixelBrightness;

        gridSums[cellY][cellX] += pixelBrightness;
        gridCounts[cellY][cellX]++;
      }
    }

    // 4. Save amplified ELA image
    await sharp(diffData, {
      raw: {
        width,
        height,
        channels
      }
    })
      .jpeg({ quality: 95 })
      .toFile(elaPath);

    // 5. Calculate tamper score based on localized brightness deviations
    const totalPixels = width * height;
    const globalAvgBrightness = totalDiffBrightness / totalPixels;

    let totalSquareDev = 0;
    let maxCellBrightness = 0;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cellAvg = gridCounts[r][c] > 0 ? gridSums[r][c] / gridCounts[r][c] : 0;
        if (cellAvg > maxCellBrightness) {
          maxCellBrightness = cellAvg;
        }
        totalSquareDev += Math.pow(cellAvg - globalAvgBrightness, 2);
      }
    }

    const variance = totalSquareDev / (gridRows * gridCols);
    const stdDev = Math.sqrt(variance);

    let rawScore = (stdDev * 1.5) + (maxCellBrightness > globalAvgBrightness * 2.5 ? (maxCellBrightness - globalAvgBrightness) * 0.4 : 0);
    const tamperScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    return {
      tamperScore,
      elaImagePath: `/uploads/${elaFileName}`
    };
  } finally {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
  }
}

module.exports = {
  runELA
};
