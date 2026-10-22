import React from 'react';
import { useAppStore } from '../core/store';

interface HeaderBarProps {
  onOpenDxfModal: () => void;
  onOpenUnderlayModal: () => void;
  onOpenTakeoffModal: () => void;
  onOpenExportModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenDxfModal,
  onOpenUnderlayModal,
  onOpenTakeoffModal,
  onOpenExportModal,
}) => {
  const {
    doc,
    activeSchemeId,
    setActiveScheme,
    viewMode,
    setViewMode,
    cameraMode,
    setCameraMode,
    undo,
    redo,
    undoStack,
    redoStack,
    sunStudyPlaying,
    toggleSunStudy,
  } = useAppStore();

  return (
    <header className="header-bar">
      {/* Brand & Project Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="brand-mark">
          <div className="brand-dot" />
          <span>FAYATH STUDIO</span>
        </div>

        <div style={{ height: 16, width: 1, backgroundColor: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {doc.name}
          </span>

          {/* Scheme Selector */}
          <select
            className="prop-select"
            style={{ width: 150, padding: '3px 6px', fontSize: 11 }}
            value={activeSchemeId}
            onChange={(e) => setActiveScheme(e.target.value)}
          >
            {doc.schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn-icon"
            onClick={undo}
            disabled={undoStack.length === 0}
            style={{ opacity: undoStack.length === 0 ? 0.35 : 1 }}
            title="Undo (Ctrl+Z)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button
            className="btn-icon"
            onClick={redo}
            disabled={redoStack.length === 0}
            style={{ opacity: redoStack.length === 0 ? 0.35 : 1 }}
            title="Redo (Ctrl+Y)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center: View Layout & Camera Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* View Layout Mode */}
        <div className="segmented-group">
          <button
            className={`segmented-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Split 2D Plan & 3D Space"
          >
            Split (2D | 3D)
          </button>
          <button
            className={`segmented-btn ${viewMode === '3d' ? 'active' : ''}`}
            onClick={() => setViewMode('3d')}
            title="Full 3D Space"
          >
            3D Space
          </button>
          <button
            className={`segmented-btn ${viewMode === '2d' ? 'active' : ''}`}
            onClick={() => setViewMode('2d')}
            title="2D CAD Plan"
          >
            2D Plan
          </button>
        </div>

        {/* Camera Navigation Mode */}
        <div className="segmented-group">
          <button
            className={`segmented-btn ${cameraMode === 'orbit' ? 'active' : ''}`}
            onClick={() => setCameraMode('orbit')}
            title="Orbit exterior"
          >
            Orbit
          </button>
          <button
            className={`segmented-btn ${cameraMode === 'walk' ? 'active' : ''}`}
            onClick={() => setCameraMode('walk')}
            title="First-person interior walkthrough"
          >
            Walk Inside
          </button>
          <button
            className={`segmented-btn ${cameraMode === 'fly' ? 'active' : ''}`}
            onClick={() => setCameraMode('fly')}
            title="Free fly elevation"
          >
            Fly
          </button>
          <button
            className={`segmented-btn ${cameraMode === 'plan' ? 'active' : ''}`}
            onClick={() => setCameraMode('plan')}
            title="Top-down 3D plan"
          >
            Top Plan
          </button>
        </div>

        {/* Sun Study Timelapse Toggle */}
        <button
          className={`btn-text ${sunStudyPlaying ? 'active' : ''}`}
          onClick={toggleSunStudy}
          style={{
            borderColor: sunStudyPlaying ? 'var(--accent-brass)' : 'var(--border-subtle)',
            color: sunStudyPlaying ? 'var(--accent-brass)' : 'var(--text-secondary)',
          }}
          title="Simulate solar diurnal cycle (Sun Study)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          {sunStudyPlaying ? 'Sun Timelapse Active' : 'Sun Study'}
        </button>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn-text" onClick={onOpenDxfModal} title="Import CAD DXF floor plan">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Import DXF
        </button>

        <button className="btn-text" onClick={onOpenUnderlayModal} title="Blueprint image / PDF underlay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Underlay
        </button>

        <button className="btn-text" onClick={onOpenTakeoffModal} title="Room schedules and quantity takeoff">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Takeoff & Cost
        </button>

        <button className="btn-text btn-primary" onClick={onOpenExportModal} title="Export high-res still, OBJ, or DXF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Export
        </button>
      </div>
    </header>
  );
};
