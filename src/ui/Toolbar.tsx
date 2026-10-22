import React from 'react';
import { useAppStore } from '../core/store';

export const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    sectionCutEnabled,
    sectionCutHeight,
    setSectionCut,
  } = useAppStore();

  return (
    <aside className="toolbar-panel">
      {/* Select */}
      <button
        className={`btn-icon ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => setActiveTool('select')}
        title="Select & Inspect (V)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 3 7 18 3-7 7-3L3 3z" />
          <path d="m13 13 6 6" />
        </svg>
      </button>

      {/* Wall */}
      <button
        className={`btn-icon ${activeTool === 'wall' ? 'active' : ''}`}
        onClick={() => setActiveTool('wall')}
        title="Draw Wall (W)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 12h20M7 4v8M17 4v8M12 12v8M7 16h0" />
        </svg>
      </button>

      {/* Door */}
      <button
        className={`btn-icon ${activeTool === 'door' ? 'active' : ''}`}
        onClick={() => setActiveTool('door')}
        title="Place Door (D)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17" />
          <path d="M14 12v.01" />
          <path d="M4 21h16" />
        </svg>
      </button>

      {/* Window */}
      <button
        className={`btn-icon ${activeTool === 'window' ? 'active' : ''}`}
        onClick={() => setActiveTool('window')}
        title="Place Window (N)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </button>

      {/* Furniture Object */}
      <button
        className={`btn-icon ${activeTool === 'object' ? 'active' : ''}`}
        onClick={() => setActiveTool('object')}
        title="Place Furniture (F)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
          <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
          <path d="M5 18v2M19 18v2" />
        </svg>
      </button>

      {/* Measure */}
      <button
        className={`btn-icon ${activeTool === 'measure' ? 'active' : ''}`}
        onClick={() => setActiveTool('measure')}
        title="Measure Distance (M)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>

      <div style={{ height: 1, width: 28, backgroundColor: 'var(--border-subtle)', margin: '6px 0' }} />

      {/* Dynamic Section Cut Plane Toggle */}
      <button
        className={`btn-icon ${sectionCutEnabled ? 'active' : ''}`}
        onClick={() => setSectionCut(!sectionCutEnabled)}
        title="Dynamic Section Cut Plane"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12h20" />
          <path d="M6 4l6 8-6 8" />
          <path d="M12 4l6 8-6 8" />
        </svg>
      </button>

      {sectionCutEnabled && (
        <div style={{ padding: '4px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <input
            type="range"
            min="0.2"
            max="4.0"
            step="0.1"
            value={sectionCutHeight}
            onChange={(e) => setSectionCut(true, parseFloat(e.target.value))}
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              width: 8,
              height: 70,
              cursor: 'pointer',
              accentColor: 'var(--accent-brass)',
            }}
            title={`Cut Height: ${sectionCutHeight.toFixed(1)}m`}
          />
          <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
            {sectionCutHeight.toFixed(1)}m
          </span>
        </div>
      )}
    </aside>
  );
};
