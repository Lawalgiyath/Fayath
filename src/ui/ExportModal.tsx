import React from 'react';
import { useAppStore } from '../core/store';
import { ProjectExporter } from '../export/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { doc } = useAppStore();

  if (!isOpen) return null;

  const handleExportDxf = () => {
    const dxf = ProjectExporter.exportDxf(doc);
    ProjectExporter.triggerDownload(`${doc.name.toLowerCase().replace(/\s+/g, '_')}_plan.dxf`, dxf);
  };

  const handleExportProjectJson = () => {
    const json = JSON.stringify(doc, null, 2);
    ProjectExporter.triggerDownload(`${doc.name.toLowerCase().replace(/\s+/g, '_')}.fayath`, json);
  };

  const handleCaptureStill = () => {
    // Find canvas in viewport
    const canvas = document.querySelector('.viewport-3d-container canvas') as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${doc.name.toLowerCase().replace(/\s+/g, '_')}_render.png`;
      link.click();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Export Architectural Deliverables</div>
          <button className="btn-icon" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Generate industry-standard deliverables for presentation, BIM coordination, and downstream documentation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. DXF 2D Plan */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>AutoCAD DXF 2D Floor Plan</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Standard layered CAD drawing (A-WALL, A-DOOR, A-WINDOW, A-ROOM)
                </div>
              </div>
              <button className="btn-text btn-primary" onClick={handleExportDxf}>
                Download .DXF
              </button>
            </div>

            {/* 2. Still Render PNG */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>High-Resolution 3D Still Render</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  PBR rendered snapshot from active camera view (PNG)
                </div>
              </div>
              <button className="btn-text" onClick={handleCaptureStill}>
                Capture Render
              </button>
            </div>

            {/* 3. Project File */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Fayath Project Document (.fayath)</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Complete parametric building model, materials, furniture & solar settings
                </div>
              </div>
              <button className="btn-text" onClick={handleExportProjectJson}>
                Save Project
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-text" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
