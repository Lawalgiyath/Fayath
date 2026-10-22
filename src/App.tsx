import React, { useState, useEffect } from 'react';
import { useAppStore } from './core/store';
import { PlanCanvas } from './editor2d/PlanCanvas';
import { Viewport3D } from './engine/Viewport3D';
import { HeaderBar } from './ui/HeaderBar';
import { Toolbar } from './ui/Toolbar';
import { Inspector } from './ui/Inspector';
import { DxfImportModal } from './ui/DxfImportModal';
import { UnderlayModal } from './ui/UnderlayModal';
import { TakeoffModal } from './ui/TakeoffModal';
import { ExportModal } from './ui/ExportModal';
import './styles/workbench.css';

export const App: React.FC = () => {
  const { viewMode, setViewMode, setActiveTool, undo, redo } = useAppStore();

  const [dxfModalOpen, setDxfModalOpen] = useState(false);
  const [underlayModalOpen, setUnderlayModalOpen] = useState(false);
  const [takeoffModalOpen, setTakeoffModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'w':
          setActiveTool('wall');
          break;
        case 'd':
          setActiveTool('door');
          break;
        case 'n':
          setActiveTool('window');
          break;
        case 'f':
          setActiveTool('object');
          break;
        case 'm':
          setActiveTool('measure');
          break;
        case '1':
          setViewMode('3d');
          break;
        case '2':
          setViewMode('2d');
          break;
        case '3':
          setViewMode('split');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setActiveTool, setViewMode]);

  return (
    <div className="app-shell">
      {/* Top Header */}
      <HeaderBar
        onOpenDxfModal={() => setDxfModalOpen(true)}
        onOpenUnderlayModal={() => setUnderlayModalOpen(true)}
        onOpenTakeoffModal={() => setTakeoffModalOpen(true)}
        onOpenExportModal={() => setExportModalOpen(true)}
      />

      {/* Main Workstation */}
      <main className="main-workstation">
        {/* Left Toolbar */}
        <Toolbar />

        {/* Viewport Workspace */}
        <div className="viewport-split-container">
          {/* 2D Plan Canvas */}
          {(viewMode === '2d' || viewMode === 'split') && (
            <div className="viewport-pane">
              <PlanCanvas />
            </div>
          )}

          {/* 3D Immersive Viewport */}
          {(viewMode === '3d' || viewMode === 'split') && (
            <div className="viewport-pane">
              <Viewport3D />
            </div>
          )}
        </div>

        {/* Right Inspector & Material Browser */}
        <Inspector />
      </main>

      {/* Modals */}
      <DxfImportModal isOpen={dxfModalOpen} onClose={() => setDxfModalOpen(false)} />
      <UnderlayModal isOpen={underlayModalOpen} onClose={() => setUnderlayModalOpen(false)} />
      <TakeoffModal isOpen={takeoffModalOpen} onClose={() => setTakeoffModalOpen(false)} />
      <ExportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} />
    </div>
  );
};

export default App;
