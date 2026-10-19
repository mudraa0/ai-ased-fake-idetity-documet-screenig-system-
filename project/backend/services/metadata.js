const exifr = require('exifr');

/**
 * Analyzes EXIF, TIFF, and XMP metadata from an image file.
 * @param {string} imagePath - Path to the image file.
 * @returns {Promise<{ hasMetadata: boolean, suspiciousFlags: string[], rawMetadata: object | null }>}
 */
async function analyzeMetadata(imagePath) {
  const suspiciousFlags = [];
  let rawMetadata = null;

  try {
    rawMetadata = await exifr.parse(imagePath, true);
  } catch (err) {
    rawMetadata = null;
  }

  if (!rawMetadata || Object.keys(rawMetadata).length === 0) {
    suspiciousFlags.push('No EXIF metadata found (may indicate image re-saving or stripping)');
    return {
      hasMetadata: false,
      suspiciousFlags,
      rawMetadata: null
    };
  }

  // 1. Check Software tag for known editing applications
  const softwareTag = rawMetadata.Software || rawMetadata.software || rawMetadata.ProcessingSoftware;
  if (softwareTag && typeof softwareTag === 'string') {
    const knownEditingTools = ['photoshop', 'gimp', 'canva', 'paint', 'editor', 'snapseed', 'lightroom', 'pixlr'];
    const lowerSoftware = softwareTag.toLowerCase();
    const foundTool = knownEditingTools.find(tool => lowerSoftware.includes(tool));
    if (foundTool) {
      suspiciousFlags.push(`Editing software detected in EXIF: ${softwareTag}`);
    }
  }

  // 2. Check creation vs modification timestamp mismatches
  const creationDate = rawMetadata.DateTimeOriginal || rawMetadata.CreateDate;
  const modifyDate = rawMetadata.ModifyDate || rawMetadata.Modify;

  if (creationDate && modifyDate) {
    const createTime = new Date(creationDate).getTime();
    const modifyTime = new Date(modifyDate).getTime();

    if (!isNaN(createTime) && !isNaN(modifyTime) && Math.abs(modifyTime - createTime) > 5000) {
      suspiciousFlags.push('Creation and modification timestamps do not match');
    }
  }

  return {
    hasMetadata: true,
    suspiciousFlags,
    rawMetadata
  };
}

module.exports = {
  analyzeMetadata
};
