const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Preprocesses an image using sharp for optimal OCR readability.
 * Upscales to at least 1600px long edge, converts to grayscale, normalizes, and sharpens.
 */
async function preprocessImage(imagePath) {
  const dir = path.dirname(imagePath);
  const baseName = path.basename(imagePath);
  const tempPath = path.join(dir, `temp_preprocessed_${baseName}.png`);

  const metadata = await sharp(imagePath).metadata();
  let width = metadata.width || 800;
  let height = metadata.height || 600;

  const longEdge = Math.max(width, height);
  if (longEdge < 1600) {
    const scale = 1600 / longEdge;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  await sharp(imagePath)
    .resize(width, height, { fit: 'inside' })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toFile(tempPath);

  return tempPath;
}

/**
 * Extracts full-page OCR text using Tesseract.js on a preprocessed image.
 * @param {string} imagePath - Path to original image file.
 * @returns {Promise<string>}
 */
async function extractText(imagePath) {
  let preprocessedPath = null;
  let worker = null;
  try {
    preprocessedPath = await preprocessImage(imagePath);
    worker = await createWorker('eng', 1, { errorHandler: () => {} });
    const { data } = await worker.recognize(preprocessedPath);
    return data ? data.text : '';
  } catch (err) {
    throw new Error(err.message || 'Full-page OCR extraction failed');
  } finally {
    if (worker) {
      await worker.terminate();
    }
    if (preprocessedPath && fs.existsSync(preprocessedPath)) {
      try { fs.unlinkSync(preprocessedPath); } catch (e) {}
    }
  }
}

/**
 * Targeted OCR pass cropping bottom ~25% of passport for MRZ extraction with PSM 6.
 * @param {string} imagePath - Path to original image file.
 * @returns {Promise<string>}
 */
async function extractMRZText(imagePath) {
  const dir = path.dirname(imagePath);
  const baseName = path.basename(imagePath);
  const tempCropPath = path.join(dir, `temp_mrz_crop_${baseName}.png`);

  let worker = null;
  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    const cropTop = Math.floor(height * 0.72);
    const cropHeight = height - cropTop;

    await sharp(imagePath)
      .extract({ left: 0, top: cropTop, width, height: cropHeight })
      .resize(Math.round(width * 2.5), Math.round(cropHeight * 2.5))
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toFile(tempCropPath);

    worker = await createWorker('eng', 1, { errorHandler: () => {} });
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
    });

    const { data } = await worker.recognize(tempCropPath);
    return data ? data.text : '';
  } catch (err) {
    return '';
  } finally {
    if (worker) {
      await worker.terminate();
    }
    if (fs.existsSync(tempCropPath)) {
      try { fs.unlinkSync(tempCropPath); } catch (e) {}
    }
  }
}

module.exports = {
  extractText,
  extractMRZText
};
