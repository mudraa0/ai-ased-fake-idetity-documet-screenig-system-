import { useState, useEffect } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import Header from '../components/Header';
import ScanResultDisplay from '../components/ScanResultDisplay';

function ScanPage() {
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [docType, setDocType] = useState('passport');

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendResponse, setBackendResponse] = useState(null);
  const [faceResult, setFaceResult] = useState(null);

  // Load face-api.js models from /models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
      }
    };
    loadModels();
  }, []);

  const handleDocumentChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentFile(file);
      setDocumentPreview(URL.createObjectURL(file));
    }
  };

  const handleSelfieChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const detectFaceDescriptor = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
          resolve(detection);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!documentFile) {
      alert('Please select a document image for verification.');
      return;
    }

    setLoading(true);
    setBackendResponse(null);
    setFaceResult(null);

    let clientFaceMatchScore = null;
    let clientMatchLikely = null;

    // Perform client-side face verification if selfie is uploaded
    if (selfieFile && modelsLoaded) {
      try {
        const [docDetection, selfieDetection] = await Promise.all([
          detectFaceDescriptor(documentFile),
          detectFaceDescriptor(selfieFile)
        ]);

        if (!docDetection) {
          setFaceResult({ error: 'No face detected in document photo.' });
        } else if (!selfieDetection) {
          setFaceResult({ error: 'No face detected in selfie photo.' });
        } else {
          const distance = faceapi.euclideanDistance(docDetection.descriptor, selfieDetection.descriptor);
          clientFaceMatchScore = Math.max(0, Math.round(100 - (distance * 100)));
          clientMatchLikely = distance < 0.6;

          setFaceResult({
            faceMatchScore: clientFaceMatchScore,
            matchLikely: clientMatchLikely,
            distance: Number(distance.toFixed(4)),
            error: null
          });
        }
      } catch (faceErr) {
        setFaceResult({ error: faceErr.message || 'Face detection failed.' });
      }
    }

    // Submit FormData payload to backend
    const formData = new FormData();
    formData.append('document', documentFile);
    formData.append('docType', docType);
    if (clientFaceMatchScore !== null) {
      formData.append('faceMatchScore', clientFaceMatchScore);
    }
    if (clientMatchLikely !== null) {
      formData.append('matchLikely', clientMatchLikely);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBackendResponse(res.data);
    } catch (err) {
      setBackendResponse(err.response ? err.response.data : { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Header title="National Document Verification System" />

      <div className="page-container">
        {!modelsLoaded && (
          <div className="model-banner">
            [SYSTEM] Loading face-api.js models into local memory...
          </div>
        )}

        {/* Record Intake / Upload Form Card */}
        <div className="gov-card">
          <div className="gov-card-title">
            <span>DOCUMENT INTAKE & OPTICAL ACQUISITION</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--status-pass-text)' }}>
              ● READY FOR SUBSTRATE
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="intake-form-grid">
              <div className="form-group">
                <label htmlFor="docTypeSelect">Document Type</label>
                <select
                  id="docTypeSelect"
                  className="gov-control"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="passport">PASSPORT (ICAO 9303 TD3)</option>
                  <option value="nationalID">NATIONAL ID (12-DIGIT VERHOEFF)</option>
                  <option value="visa">ENTRY VISA (TRAVEL PERMIT)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="docFileInput">Document File</label>
                <input
                  id="docFileInput"
                  type="file"
                  className="gov-control"
                  accept="image/*"
                  onChange={handleDocumentChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="selfieFileInput">Live Selfie (Optional)</label>
                <input
                  id="selfieFileInput"
                  type="file"
                  className="gov-control"
                  accept="image/*"
                  onChange={handleSelfieChange}
                />
              </div>
            </div>

            <button type="submit" className="gov-btn-primary" disabled={loading}>
              {loading ? 'RUNNING FORENSIC SCAN & VERIFICATION PIPELINE...' : 'RUN VERIFICATION SCAN'}
            </button>
          </form>
        </div>

        {/* Scan Results Workspace */}
        {backendResponse && (
          <ScanResultDisplay
            backendResponse={backendResponse}
            documentPreview={documentPreview}
            selfiePreview={selfiePreview}
            faceResult={faceResult}
          />
        )}
      </div>
    </div>
  );
}

export default ScanPage;
