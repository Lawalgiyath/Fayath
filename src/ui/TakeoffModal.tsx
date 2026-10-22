import React, { useState } from 'react';
import { TakeoffCalculator, type TakeoffReport } from '../analysis/takeoff';
import { useAppStore } from '../core/store';
import { ProjectExporter } from '../export/exporter';

interface TakeoffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TakeoffModal: React.FC<TakeoffModalProps> = ({ isOpen, onClose }) => {
  const { doc } = useAppStore();
  const [tab, setTab] = useState<'rooms' | 'materials' | 'openings'>('rooms');

  if (!isOpen) return null;

  const report = TakeoffCalculator.calculate(doc);

  const handleExportCsv = () => {
    const csv = TakeoffCalculator.exportCsv(report);
    ProjectExporter.triggerDownload('fayath_architectural_takeoff.csv', csv);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ width: 780 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 600, fontSize: 14 }}>Quantity Takeoff & Cost Estimation</div>
          <button className="btn-icon" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NET FLOOR AREA</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {report.totalFloorAreaM2} m²
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NET WALL FINISHES</div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {report.totalNetWallAreaM2} m²
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 4,
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL FINISHES ESTIMATE</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-brass)',
                  marginTop: 4,
                }}
              >
                {report.currency}
                {report.totalCost.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Subtabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <button
              className={`segmented-btn ${tab === 'rooms' ? 'active' : ''}`}
              onClick={() => setTab('rooms')}
            >
              Room Schedule ({report.rooms.length})
            </button>
            <button
              className={`segmented-btn ${tab === 'materials' ? 'active' : ''}`}
              onClick={() => setTab('materials')}
            >
              Material Quantities ({report.materials.length})
            </button>
            <button
              className={`segmented-btn ${tab === 'openings' ? 'active' : ''}`}
              onClick={() => setTab('openings')}
            >
              Doors & Windows ({report.openings.length})
            </button>
          </div>

          {/* Table Container */}
          <div
            style={{
              maxHeight: 340,
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
            }}
          >
            {tab === 'rooms' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Room</th>
                    <th style={{ padding: '8px 12px' }}>Level</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Net Area</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Perimeter</th>
                    <th style={{ padding: '8px 12px' }}>Floor Finish</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Floor Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rooms.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.name}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.level}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {r.netAreaM2} m²
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {r.perimeterM} m
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.floorMat}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {report.currency}
                        {r.floorCost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'materials' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Material</th>
                    <th style={{ padding: '8px 12px' }}>Category</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Rate / m²</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.materials.map((m) => (
                    <tr key={m.materialId} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{m.materialName}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{m.category}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {m.quantityM2} m²
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {report.currency}
                        {m.unitRate}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {report.currency}
                        {m.totalCost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'openings' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Opening Type</th>
                    <th style={{ padding: '8px 12px' }}>Style</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Count</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Area</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Rate</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {report.openings.map((o, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, textTransform: 'capitalize' }}>
                        {o.type}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {o.style}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {o.count}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {o.totalAreaM2} m²
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {report.currency}
                        {o.unitRate.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {report.currency}
                        {o.totalCost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-text" onClick={onClose}>
            Close
          </button>
          <button className="btn-text btn-primary" onClick={handleExportCsv}>
            Export Takeoff CSV
          </button>
        </div>
      </div>
    </div>
  );
};
