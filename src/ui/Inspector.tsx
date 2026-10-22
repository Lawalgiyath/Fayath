import React, { useState } from 'react';
import { dist } from '../core/geometry';
import { detectRooms } from '../core/rooms';
import { useAppStore } from '../core/store';
import { CATEGORIES, LIBRARY, LIB_MAP, type MatCategory } from '../materials/library';
import { matManager } from '../materials/manager';
import { CATALOG, CATALOG_MAP } from '../objects/catalog';

export const Inspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'properties' | 'materials' | 'catalog'>('properties');
  const [matCategory, setMatCategory] = useState<MatCategory | 'All'>('All');
  const [searchMat, setSearchMat] = useState('');

  const {
    doc,
    activeLevelId,
    selection,
    removeWall,
    updateWallMat,
    updateOpening,
    removeOpening,
    updateObject,
    removeObject,
    updateRoomMat,
    setSunTime,
    setToolOption,
  } = useAppStore();

  const selectedWall = selection?.kind === 'wall' ? doc.walls.find((w) => w.id === selection.id) : null;
  const selectedOpening = selection?.kind === 'opening' ? doc.openings.find((o) => o.id === selection.id) : null;
  const selectedObject = selection?.kind === 'object' ? doc.objects.find((obj) => obj.id === selection.id) : null;

  const detectedRooms = detectRooms(doc);
  const selectedRoom = selection?.kind === 'room' ? detectedRooms.find((r) => r.key === selection.key) : null;

  // Filtered materials
  const filteredMaterials = LIBRARY.filter((m) => {
    const matchCat = matCategory === 'All' || m.category === matCategory;
    const matchSearch = !searchMat || m.name.toLowerCase().includes(searchMat.toLowerCase());
    return matchCat && matchSearch;
  });

  // Solar Time formatting
  const sunMinutes = doc.site.minutes;
  const hours = Math.floor(sunMinutes / 60);
  const mins = Math.floor(sunMinutes % 60);
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const display12h = `${hours % 12 || 12}:${mins.toString().padStart(2, '0')} ${ampm}`;

  const applyMaterialToSelection = (matId: string) => {
    if (selectedWall) {
      updateWallMat(selectedWall.id, 'matL', matId);
    } else if (selectedRoom) {
      updateRoomMat(selectedRoom.key, 'floorMat', matId);
    } else if (selectedObject) {
      const catDef = CATALOG_MAP.get(selectedObject.kind);
      const firstSlot = catDef?.materialSlots[0]?.slot || 'primary';
      updateObject(selectedObject.id, {
        materials: { ...selectedObject.materials, [firstSlot]: matId },
      });
    }
  };

  return (
    <aside className="inspector-panel">
      {/* Inspector Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          className={`segmented-btn ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 0 }}
        >
          Properties
        </button>
        <button
          className={`segmented-btn ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('materials')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 0 }}
        >
          Materials ({LIBRARY.length})
        </button>
        <button
          className={`segmented-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 0 }}
        >
          Catalog
        </button>
      </div>

      {/* TAB 1: PROPERTIES */}
      {activeTab === 'properties' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* WALL SELECTED */}
          {selectedWall && (
            <div className="inspector-section">
              <div className="inspector-title">Wall Parameters</div>
              <div className="prop-row">
                <span className="prop-label">Length</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {dist(selectedWall.a, selectedWall.b).toFixed(2)} m
                </span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Height</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedWall.height.toFixed(2)} m</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Thickness</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedWall.thickness.toFixed(2)} m</span>
              </div>

              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '14px 0' }} />
              <div className="inspector-title">Wall Finishes</div>

              <div className="prop-row">
                <span className="prop-label">Left Face</span>
                <select
                  className="prop-select"
                  value={selectedWall.matL || doc.settings.defaultWallMat}
                  onChange={(e) => updateWallMat(selectedWall.id, 'matL', e.target.value)}
                >
                  {LIBRARY.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="prop-row">
                <span className="prop-label">Right Face</span>
                <select
                  className="prop-select"
                  value={selectedWall.matR || doc.settings.defaultWallMat}
                  onChange={(e) => updateWallMat(selectedWall.id, 'matR', e.target.value)}
                >
                  {LIBRARY.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-text"
                onClick={() => removeWall(selectedWall.id)}
                style={{ width: '100%', marginTop: 16, color: 'var(--accent-red)', justifyContent: 'center' }}
              >
                Delete Wall
              </button>
            </div>
          )}

          {/* OPENING SELECTED */}
          {selectedOpening && (
            <div className="inspector-section">
              <div className="inspector-title">
                {selectedOpening.type === 'door' ? 'Door Parameters' : 'Window Parameters'}
              </div>
              <div className="prop-row">
                <span className="prop-label">Style</span>
                <select
                  className="prop-select"
                  value={selectedOpening.style}
                  onChange={(e) => updateOpening(selectedOpening.id, { style: e.target.value as any })}
                >
                  {selectedOpening.type === 'door' ? (
                    <>
                      <option value="single">Single Leaf</option>
                      <option value="double">Double Leaf</option>
                      <option value="slider">Pocket Slider</option>
                      <option value="pivot">Architectural Pivot</option>
                      <option value="cased">Cased Opening</option>
                    </>
                  ) : (
                    <>
                      <option value="casement">Casement</option>
                      <option value="fixed">Fixed Panoramic</option>
                      <option value="grid">Multi-Grid</option>
                      <option value="awning">Awning</option>
                    </>
                  )}
                </select>
              </div>

              <div className="prop-row">
                <span className="prop-label">Width</span>
                <input
                  type="number"
                  step="0.05"
                  className="prop-input"
                  value={selectedOpening.width}
                  onChange={(e) => updateOpening(selectedOpening.id, { width: parseFloat(e.target.value) || 0.9 })}
                />
              </div>

              <div className="prop-row">
                <span className="prop-label">Height</span>
                <input
                  type="number"
                  step="0.05"
                  className="prop-input"
                  value={selectedOpening.height}
                  onChange={(e) => updateOpening(selectedOpening.id, { height: parseFloat(e.target.value) || 2.1 })}
                />
              </div>

              {selectedOpening.type === 'window' && (
                <div className="prop-row">
                  <span className="prop-label">Sill Height</span>
                  <input
                    type="number"
                    step="0.05"
                    className="prop-input"
                    value={selectedOpening.sill}
                    onChange={(e) => updateOpening(selectedOpening.id, { sill: parseFloat(e.target.value) || 0.9 })}
                  />
                </div>
              )}

              <div className="prop-row">
                <span className="prop-label">Frame Material</span>
                <select
                  className="prop-select"
                  value={selectedOpening.frameMat || 'steel-black'}
                  onChange={(e) => updateOpening(selectedOpening.id, { frameMat: e.target.value })}
                >
                  {LIBRARY.filter((m) => m.category === 'Metal' || m.category === 'Wood').map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-text"
                onClick={() => removeOpening(selectedOpening.id)}
                style={{ width: '100%', marginTop: 16, color: 'var(--accent-red)', justifyContent: 'center' }}
              >
                Delete Opening
              </button>
            </div>
          )}

          {/* ROOM SELECTED */}
          {selectedRoom && (
            <div className="inspector-section">
              <div className="inspector-title">Room Schedule</div>
              <div className="prop-row">
                <span className="prop-label">Name</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedRoom.name}</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Net Floor Area</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedRoom.netArea.toFixed(1)} m²</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Perimeter</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedRoom.perimeter.toFixed(1)} m</span>
              </div>

              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '14px 0' }} />
              <div className="inspector-title">Room Finishes</div>

              <div className="prop-row">
                <span className="prop-label">Floor Finish</span>
                <select
                  className="prop-select"
                  value={selectedRoom.label?.floorMat || doc.settings.defaultFloorMat}
                  onChange={(e) => updateRoomMat(selectedRoom.key, 'floorMat', e.target.value)}
                >
                  {LIBRARY.filter((m) => ['Wood', 'Stone', 'Tile', 'Concrete'].includes(m.category)).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="prop-row">
                <span className="prop-label">Ceiling Finish</span>
                <select
                  className="prop-select"
                  value={selectedRoom.label?.ceilingMat || doc.settings.defaultCeilingMat}
                  onChange={(e) => updateRoomMat(selectedRoom.key, 'ceilingMat', e.target.value)}
                >
                  {LIBRARY.filter((m) => ['Paint', 'Wood', 'Concrete'].includes(m.category)).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* OBJECT SELECTED */}
          {selectedObject && (
            <div className="inspector-section">
              <div className="inspector-title">Object Properties</div>
              <div className="prop-row">
                <span className="prop-label">Catalog Item</span>
                <span style={{ fontWeight: 600 }}>{CATALOG_MAP.get(selectedObject.kind)?.name}</span>
              </div>

              <div className="prop-row">
                <span className="prop-label">Rotation ({Math.round((selectedObject.rotation * 180) / Math.PI)}°)</span>
                <input
                  type="range"
                  min="0"
                  max={Math.PI * 2}
                  step="0.05"
                  value={selectedObject.rotation}
                  onChange={(e) => updateObject(selectedObject.id, { rotation: parseFloat(e.target.value) })}
                  style={{ width: 120, accentColor: 'var(--accent-brass)' }}
                />
              </div>

              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '14px 0' }} />
              <div className="inspector-title">Material Slots</div>

              {CATALOG_MAP.get(selectedObject.kind)?.materialSlots.map((slot) => (
                <div key={slot.slot} className="prop-row">
                  <span className="prop-label">{slot.label}</span>
                  <select
                    className="prop-select"
                    value={selectedObject.materials[slot.slot] || slot.defaultMat}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        materials: { ...selectedObject.materials, [slot.slot]: e.target.value },
                      })
                    }
                  >
                    {LIBRARY.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <button
                className="btn-text"
                onClick={() => removeObject(selectedObject.id)}
                style={{ width: '100%', marginTop: 16, color: 'var(--accent-red)', justifyContent: 'center' }}
              >
                Delete Object
              </button>
            </div>
          )}

          {/* GLOBAL SOLAR & SITE SETTINGS (Shown when nothing is selected) */}
          {!selectedWall && !selectedOpening && !selectedRoom && !selectedObject && (
            <>
              <div className="inspector-section">
                <div className="inspector-title">Solar & Environmental Study</div>
                <div className="prop-row">
                  <span className="prop-label">Time of Day</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-brass)' }}>
                    {display12h} ({timeFormatted})
                  </span>
                </div>
                <input
                  type="range"
                  min="360"
                  max="1260"
                  step="5"
                  value={sunMinutes}
                  onChange={(e) => setSunTime(parseInt(e.target.value))}
                  style={{ width: '100%', margin: '8px 0 16px 0', accentColor: 'var(--accent-brass)' }}
                />

                <div className="prop-row">
                  <span className="prop-label">Date</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.site.date}</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Latitude</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.site.latitude}° N</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Project North</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.site.northAngle}°</span>
                </div>
              </div>

              <div className="inspector-section">
                <div className="inspector-title">Active Level</div>
                <div className="prop-row">
                  <span className="prop-label">Elevation</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {doc.levels.find((l) => l.id === activeLevelId)?.elevation.toFixed(2)} m
                  </span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Ceiling Height</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {doc.levels.find((l) => l.id === activeLevelId)?.height.toFixed(2)} m
                  </span>
                </div>
              </div>

              <div className="inspector-section">
                <div className="inspector-title">Project Spatial Summary</div>
                <div className="prop-row">
                  <span className="prop-label">Total Walls</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.walls.length}</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Total Openings</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.openings.length}</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Detected Rooms</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{detectedRooms.length}</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Furnishings</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.objects.length}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: MATERIAL BROWSER */}
      {activeTab === 'materials' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search & Category Filter */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              type="text"
              placeholder="Search materials..."
              className="prop-input"
              value={searchMat}
              onChange={(e) => setSearchMat(e.target.value)}
              style={{ width: '100%', textAlign: 'left', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  className={`segmented-btn ${matCategory === cat ? 'active' : ''}`}
                  onClick={() => setMatCategory(cat as any)}
                  style={{ whiteSpace: 'nowrap', fontSize: 10, padding: '3px 8px' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Materials */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div className="material-grid">
              {filteredMaterials.map((mat) => {
                const swatchUrl = matManager.getQuickSwatchDataUrl(mat.id, 64);
                return (
                  <div
                    key={mat.id}
                    className="material-card"
                    onClick={() => applyMaterialToSelection(mat.id)}
                    title={`${mat.name} ($${mat.cost}/m2) - Click to apply to selected`}
                  >
                    <div
                      className="material-swatch"
                      style={{
                        backgroundImage: swatchUrl ? `url(${swatchUrl})` : undefined,
                        backgroundColor: '#2a2f3a',
                      }}
                    />
                    <div className="material-name">{mat.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--accent-brass)', marginTop: 2 }}>
                      ${mat.cost}/m²
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FURNITURE CATALOG */}
      {activeTab === 'catalog' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATALOG.map((item) => (
              <div
                key={item.key}
                className="material-card"
                onClick={() => {
                  setToolOption('catalogKey', item.key);
                  setToolOption('activeTool', 'object');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: 'var(--bg-input)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-brass)',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
                    <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {item.defaultDims.w}m × {item.defaultDims.d}m × {item.defaultDims.h}m &bull; {item.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
