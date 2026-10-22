import React, { useState } from 'react';
import { useAppStore } from '../core/store';
import { DxfImporter, type DxfImportResult } from '../import/dxf';

interface DxfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DxfImportModal: React.FC<DxfModalProps> = ({ isOpen, onClose }) => {
  const { doc, activeLevelId, setDoc } = useAppStore();
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [unitScale, setUnitScale] = useState<number | undefined>(undefined);
  const [importResult, setImportResult] = useState<DxfImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileText(ev.target?.result as string);
    };
    reader.onerror = () => setErrorMsg('Failed to read file');
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!fileText) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await DxfImporter.parse(fileText, doc, activeLevelId, unitScale);
      setImportResult(res);
      setDoc(res.doc);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing DXF file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Import CAD DXF Plan</div>
          <button className="btn-icon" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Upload an AutoCAD or ArchiCAD 2D <code>.dxf</code> drawing. Fayath will automatically classify architectural layers, pair parallel double-line walls into parametric 3D elements, and host doors and windows.
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
              accept=".dxf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="dxf-file-input"
            />
            <label htmlFor="dxf-file-input" style={{ cursor: 'pointer' }}>
              <div style={{ color: 'var(--accent-brass)', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {fileName ? fileName : 'Click to select DXF CAD file'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Supports AutoCAD Release 12 through 2026 DXF formats
              </div>
            </label>
          </div>

          {/* Scale Unit Option */}
          <div className="prop-row">
            <span className="prop-label">CAD Drawing Units</span>
            <select
              className="prop-select"
              value={unitScale === undefined ? 'auto' : unitScale.toString()}
              onChange={(e) =>
                setUnitScale(e.target.value === 'auto' ? undefined : parseFloat(e.target.value))
              }
            >
              <option value="auto">Auto-Detect ($INSUNITS)</option>
              <option value="0.001">Millimeters (mm)</option>
              <option value="0.01">Centimeters (cm)</option>
              <option value="1.0">Meters (m)</option>
              <option value="0.0254">Inches (in)</option>
              <option value="0.3048">Feet (ft)</option>
            </select>
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--accent-red)', marginTop: 12, fontSize: 12 }}>
              {errorMsg}
            </div>
          )}

          {importResult && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 4,
                backgroundColor: 'rgba(152, 195, 121, 0.1)',
                border: '1px solid rgba(152, 195, 121, 0.3)',
                color: '#98c379',
                fontSize: 12,
              }}
            >
              Successfully converted <strong>{importResult.wallsAdded}</strong> walls and{' '}
              <strong>{importResult.openingsAdded}</strong> openings into 3D geometry!
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-text" onClick={onClose}>
            {importResult ? 'Done' : 'Cancel'}
          </button>
          {!importResult && (
            <button
              className="btn-text btn-primary"
              onClick={handleExecuteImport}
              disabled={!fileText || isProcessing}
              style={{ opacity: !fileText || isProcessing ? 0.5 : 1 }}
            >
              {isProcessing ? 'Converting to 3D...' : 'Reconstruct 3D Model'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
