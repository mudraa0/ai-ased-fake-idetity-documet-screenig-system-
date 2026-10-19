const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, '../data');
const dbFile = path.join(dataDir, 'scans.json');

// Ensure /backend/data directory and scans.json file exist on init
function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify([], null, 2), 'utf8');
  }
}

initDb();

/**
 * Reads all scans synchronously from scans.json file.
 * @returns {Array} Array of scan records.
 */
function readScansFromFile() {
  try {
    initDb();
    const raw = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('[DB Read Error]:', err.message);
    return [];
  }
}

/**
 * Writes scans array synchronously to scans.json file.
 * @param {Array} scans 
 */
function writeScansToFile(scans) {
  try {
    initDb();
    fs.writeFileSync(dbFile, JSON.stringify(scans, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB Write Error]:', err.message);
  }
}

/**
 * Saves a new scan payload into scans.json.
 * @param {object} scanData - The scan payload from /api/upload.
 * @returns {object} Saved scan record with id and timestamp.
 */
function saveScan(scanData) {
  const scans = readScansFromFile();
  const record = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...scanData
  };
  scans.push(record);
  writeScansToFile(scans);
  return record;
}

/**
 * Returns all saved scans, sorted newest-first.
 * @returns {Array} Array of scan records sorted newest-first.
 */
function getAllScans() {
  const scans = readScansFromFile();
  return scans.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Retrieves a single scan by UUID id.
 * @param {string} id - The scan UUID.
 * @returns {object|null} Scan record or null if not found.
 */
function getScanById(id) {
  const scans = readScansFromFile();
  return scans.find(s => s.id === id) || null;
}

module.exports = {
  saveScan,
  getAllScans,
  getScanById
};
