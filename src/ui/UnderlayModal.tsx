import React, { useState } from 'react';
import { useAppStore } from '../core/store';
import { ImagePlanProcessor } from '../import/image';

interface UnderlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnderlayModal: React.FC<UnderlayModalProps> = ({ isOpen, onClose }) => {
  const {
    doc,
    activeLevelId,
    setDoc,
    showUnderlay,
    underlayOpacity,
    setToolOption,
  } = useAppStore();

  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [scaleVal, setScaleVal] = useState('0.02');
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedCount, setDetectedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = await ImagePlanProcessor.loadImage(file);
      setLoadedImg(img);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setDataUrl(src);

        // Attach as active underlay in project
        const underlay = ImagePlanProcessor.createUnderlay(
          activeLevelId,
          img,
          src,
          parseFloat(scaleVal) || 0.02
        );

        const cloned = JSON.parse(JSON.stringify(doc));
        cloned.underlays = cloned.underlays.filter((u: any) => u.levelId !== activeLevelId);
        cloned.underlays.push(underlay);
        setDoc(cloned);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to load image', err);
    }
  };

  const handleRunWallDetection = () => {
    if (!loadedImg) return;
    setIsVectorizing(true);
    setProgress(0.1);

    setTimeout(() => {
      const scaleNum = parseFloat(scaleVal) || 0.02;
      const walls = ImagePlanProcessor.detectWallsFromImage(
        loadedImg,
        scaleNum,
        activeLevelId,
        2.8,
        (p) => setProgress(p)
      );

      const cloned = JSON.parse(JSON.stringify(doc));
      cloned.walls.push(...walls);
      setDoc(cloned);

      setDetectedCount(walls.length);
      setIsVectorizing(false);
    }, 100);
  };

  const handleRemoveUnderlay = () => {
    const cloned = JSON.parse(JSON.stringify(doc));
    cloned.underlays = cloned.underlays.filter((u: any) => u.levelId !== activeLevelId);
    setDoc(cloned);
    setLoadedImg(null);
    setDataUrl(null);
    setDetectedCount(null);
  };

  const currentUnderlay = doc.underlays.find((u) => u.levelId === activeLevelId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Blueprint Image & PDF Underlay</div>
          <button className="btn-icon" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Import a scanned architectural blueprint, sketch, or PDF floor plan. You can use it as a 1:1 background trace reference or run automatic edge vectorization to detect walls.
          </p>

          {/* File Picker */}
          <div
            style={{
              border: '2px dashed var(--border-active)',
              borderRadius: 6,
              padding: 24,
              textAlign: 'center',
              backgroundColor: 'var(--bg-input)',
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="underlay-file-input"
            />
            <label htmlFor="underlay-file-input" style={{ cursor: 'pointer' }}>
              <div style={{ color: 'var(--accent-brass)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {currentUnderlay ? 'Blueprint Loaded (Click to replace)' : 'Click to upload blueprint image'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                PNG, JPEG, WebP, or TIFF architectural scans
              </div>
            </label>
          </div>

          {currentUnderlay && (
            <>
              {/* Opacity Slider */}
              <div className="prop-row">
                <span className="prop-label">Underlay Opacity ({Math.round(underlayOpacity * 100)}%)</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={underlayOpacity}
                  onChange={(e) => setToolOption('underlayOpacity', parseFloat(e.target.value))}
                  style={{ width: 140, accentColor: 'var(--accent-brass)' }}
                />
              </div>

              {/* Scale input */}
              <div className="prop-row">
                <span className="prop-label">Scale (Meters per pixel)</span>
                <input
                  type="text"
                  className="prop-input"
                  value={scaleVal}
                  onChange={(e) => setScaleVal(e.target.value)}
                />
              </div>

              {/* Automatic Vectorization Card */}
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 6,
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  Automatic Wall Extraction
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Isolates thick structural ink lines, extracts centerlines, and reconstructs 3D walls automatically.
                </p>

                <button
                  className="btn-text btn-primary"
                  onClick={handleRunWallDetection}
                  disabled={isVectorizing}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isVectorizing
                    ? `Processing Image (${Math.round(progress * 100)}%)...`
                    : 'Auto-Detect Walls from Blueprint'}
                </button>

                {detectedCount !== null && (
                  <div style={{ color: '#98c379', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                    Extracted {detectedCount} walls into the 3D model!
                  </div>
                )}
              </div>

              <button
                className="btn-text"
                onClick={handleRemoveUnderlay}
                style={{ width: '100%', marginTop: 16, color: 'var(--accent-red)', justifyContent: 'center' }}
              >
                Remove Underlay
              </button>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-text" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
