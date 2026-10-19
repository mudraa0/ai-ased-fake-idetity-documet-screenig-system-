# AI Fake Detection - Full-Stack Document Screening & Forensic Dashboard

`ai_fake_detection` is a full-stack document screening and forensic verification application designed to detect identity document tampering, fake passports, and fraudulent national IDs. It combines automated OCR text extraction, checksum verification, Error Level Analysis (ELA) JPEG recompression forensics, EXIF metadata inspection, client-side biometric face verification, and an explainable risk scoring engine into a clean dashboard UI.

---

## Technical Architecture & Stack

### Backend (`/backend`)
- **Runtime & Framework**: Node.js, Express.js
- **File Uploads**: `multer` storing files to `/backend/uploads`
- **OCR Text Extraction**: `tesseract.js` (Tesseract OCR engine worker)
- **Image Processing & Forensics**: `sharp` (Error Level Analysis 15x recompression discrepancy detection & heatmaps)
- **EXIF Metadata Inspection**: `exifr` (Detecting editing software tags and timestamp anomalies)
- **Checksum Validation**: `node-verhoeff` (Verhoeff $D_5$ group algorithm for 12-digit IDs) & ICAO 9303 7-3-1 weighting algorithm for Passports
- **Synthetic Dataset Generator**: `canvas` script (`/backend/scripts/generateDemoSet.js`)

### Frontend (`/frontend`)
- **Framework & Tooling**: React, Vite
- **HTTP Client**: `axios`
- **Biometric Face Verification**: `face-api.js` (TensorFlow.js client-side face detection, landmark extraction, and 128-d vector Euclidean distance matching)
- **UI Design**: Modern Slate dark theme dashboard with status indicators (`LOW`, `MEDIUM`, `HIGH`) and explainable score breakdown.

---

## Local Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Backend Server Setup
```bash
cd backend
npm install
npm run dev
```
*The Express server will start on `http://localhost:5000`.*

### 2. Frontend Application Setup
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The Vite React dashboard will launch in your browser.*

### 3. Generate Synthetic Demo Document Dataset (Optional)
To generate synthetic passport test cases (`genuine.jpg`, `tampered_photo.jpg`, `tampered_text.jpg`, `invalid_checksum.jpg`):
```bash
cd backend
node scripts/generateDemoSet.js
```
The test images will be saved in `/backend/test-images/demo-set/`.

---

## Current Scope & Limitations

- **Supported Document Formats**: Demo workflows are tailored for 2-line ICAO 9303 TD3 Passports and 12-digit National ID cards.
- **Client-Side Face Verification**: Biometric face matching runs entirely inside the user's browser using `face-api.js`, keeping the stack lightweight without requiring a dedicated Python ML microservice.
- **Production Enhancements**: In a live enterprise or border-control deployment, this system would be augmented with:
  1. Direct government & national database lookups (e.g. passport registry / UIDAI verification APIs).
  2. Watchlist and global Interpol / Law Enforcement blacklist database checks.
  3. Server-side 3D passive liveness detection to prevent video replay / photo spoofing.
# ai-ased-fake-idetity-documet-screenig-system-
