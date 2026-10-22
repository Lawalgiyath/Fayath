import React, { useEffect, useRef, useState, useCallback } from 'react';
import { dist, len, norm, perp, sub } from '../core/geometry';
import { detectRooms } from '../core/rooms';
import { useAppStore } from '../core/store';
import type { Vec2, Wall } from '../core/types';

export const PlanCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    doc,
    activeLevelId,
    activeTool,
    selection,
    setSelection,
    createWall,
    removeWall,
    createOpening,
    createObject,
    wallThickness,
    showUnderlay,
    underlayOpacity,
  } = useAppStore();

  // Canvas Viewport transform: (world + pan) * zoom = screen
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(45); // pixels per meter
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Vec2>({ x: 0, y: 0 });

  // Interactive drawing states
  const [wallStart, setWallStart] = useState<Vec2 | null>(null);
  const [mousePosWorld, setMousePosWorld] = useState<Vec2>({ x: 0, y: 0 });
  const [hoveredWall, setHoveredWall] = useState<{ wall: Wall; t: number; point: Vec2 } | null>(null);
  const [measurePts, setMeasurePts] = useState<Vec2[]>([]);

  // Underlay image cache
  const underlayImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const underlay = doc.underlays.find((u) => u.levelId === activeLevelId);
    if (underlay && underlay.src) {
      const img = new Image();
      img.src = underlay.src;
      img.onload = () => {
        underlayImgRef.current = img;
      };
    } else {
      underlayImgRef.current = null;
    }
  }, [doc.underlays, activeLevelId]);

  // World to screen and screen to world
  const worldToScreen = useCallback(
    (p: Vec2, width: number, height: number): Vec2 => ({
      x: width / 2 + (p.x + pan.x) * zoom,
      y: height / 2 + (p.y + pan.y) * zoom,
    }),
    [pan, zoom]
  );

  const screenToWorld = useCallback(
    (sp: Vec2, width: number, height: number): Vec2 => ({
      x: (sp.x - width / 2) / zoom - pan.x,
      y: (sp.y - height / 2) / zoom - pan.y,
    }),
    [pan, zoom]
  );

  // Snapping logic: snaps to 0.1m grid or nearby wall nodes
  const snapPoint = useCallback(
    (p: Vec2): Vec2 => {
      // 1. Check nearby wall endpoints (0.25m threshold)
      for (const w of doc.walls) {
        if (w.levelId !== activeLevelId) continue;
        if (dist(p, w.a) < 0.25) return { ...w.a };
        if (dist(p, w.b) < 0.25) return { ...w.b };
      }
      // 2. Grid snap to 0.1m
      return {
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
      };
    },
    [doc.walls, activeLevelId]
  );

  // Main rendering loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // 1. Background Drafting Grid
    ctx.fillStyle = '#16181b';
    ctx.fillRect(0, 0, width, height);

    // Minor & Major grid
    const startW = screenToWorld({ x: 0, y: 0 }, width, height);
    const endW = screenToWorld({ x: width, y: height }, width, height);

    ctx.lineWidth = 1;
    // Minor grid (0.5m)
    ctx.strokeStyle = '#202328';
    ctx.beginPath();
    for (let x = Math.floor(startW.x * 2) / 2; x <= endW.x; x += 0.5) {
      const sp = worldToScreen({ x, y: 0 }, width, height);
      ctx.moveTo(sp.x, 0);
      ctx.lineTo(sp.x, height);
    }
    for (let y = Math.floor(startW.y * 2) / 2; y <= endW.y; y += 0.5) {
      const sp = worldToScreen({ x: 0, y }, width, height);
      ctx.moveTo(0, sp.y);
      ctx.lineTo(width, sp.y);
    }
    ctx.stroke();

    // Major grid (1.0m)
    ctx.strokeStyle = '#2b2f36';
    ctx.beginPath();
    for (let x = Math.floor(startW.x); x <= endW.x; x += 1.0) {
      const sp = worldToScreen({ x, y: 0 }, width, height);
      ctx.moveTo(sp.x, 0);
      ctx.lineTo(sp.x, height);
    }
    for (let y = Math.floor(startW.y); y <= endW.y; y += 1.0) {
      const sp = worldToScreen({ x: 0, y }, width, height);
      ctx.moveTo(0, sp.y);
      ctx.lineTo(width, sp.y);
    }
    ctx.stroke();

    // Origin crosshair
    const orig = worldToScreen({ x: 0, y: 0 }, width, height);
    ctx.strokeStyle = '#4a505b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(orig.x - 12, orig.y);
    ctx.lineTo(orig.x + 12, orig.y);
    ctx.moveTo(orig.x, orig.y - 12);
    ctx.lineTo(orig.x, orig.y + 12);
    ctx.stroke();

    // 2. Underlay Blueprint Image
    const underlay = doc.underlays.find((u) => u.levelId === activeLevelId);
    if (showUnderlay && underlay && underlayImgRef.current && underlay.visible) {
      ctx.save();
      ctx.globalAlpha = underlay.opacity ?? underlayOpacity;
      const sp = worldToScreen(underlay.origin, width, height);
      const imgW = underlay.widthPx * underlay.scale * zoom;
      const imgH = underlay.heightPx * underlay.scale * zoom;
      ctx.drawImage(underlayImgRef.current, sp.x, sp.y, imgW, imgH);
      ctx.restore();
    }

    // 3. Detected Rooms
    const rooms = detectRooms(doc);
    for (const room of rooms) {
      if (room.levelId !== activeLevelId || room.poly.length < 3) continue;

      ctx.beginPath();
      const p0 = worldToScreen(room.poly[0], width, height);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < room.poly.length; i++) {
        const pt = worldToScreen(room.poly[i], width, height);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      // Subtle architectural room tint
      const isSelected = selection?.kind === 'room' && selection.key === room.key;
      ctx.fillStyle = isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)';
      ctx.fill();

      // Room label tag
      const centerScreen = worldToScreen(room.center, width, height);
      ctx.font = '600 11px "IBM Plex Sans", Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#cfd3dc';
      ctx.fillText(room.name, centerScreen.x, centerScreen.y - 6);

      ctx.font = '400 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#8a92a0';
      ctx.fillText(`${room.netArea.toFixed(1)} m²`, centerScreen.x, centerScreen.y + 8);
    }

    // 4. Walls
    for (const w of doc.walls) {
      if (w.levelId !== activeLevelId) continue;

      const d = norm(sub(w.b, w.a));
      const n = perp(d);
      const ht = w.thickness / 2;

      const aL = worldToScreen({ x: w.a.x + n.x * ht, y: w.a.y + n.y * ht }, width, height);
      const bL = worldToScreen({ x: w.b.x + n.x * ht, y: w.b.y + n.y * ht }, width, height);
      const bR = worldToScreen({ x: w.b.x - n.x * ht, y: w.b.y - n.y * ht }, width, height);
      const aR = worldToScreen({ x: w.a.x - n.x * ht, y: w.a.y - n.y * ht }, width, height);

      const isSelected = selection?.kind === 'wall' && selection.id === w.id;

      ctx.beginPath();
      ctx.moveTo(aL.x, aL.y);
      ctx.lineTo(bL.x, bL.y);
      ctx.lineTo(bR.x, bR.y);
      ctx.lineTo(aR.x, aR.y);
      ctx.closePath();

      ctx.fillStyle = isSelected ? '#3d3420' : '#24272e';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#d4af37' : '#5c6370';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // Centerline
      const sa = worldToScreen(w.a, width, height);
      const sb = worldToScreen(w.b, width, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Openings (Doors & Windows)
    for (const op of doc.openings) {
      const wall = doc.walls.find((w) => w.id === op.wallId);
      if (!wall || wall.levelId !== activeLevelId) continue;

      const d = norm(sub(wall.b, wall.a));
      const n = perp(d);
      const center = { x: wall.a.x + d.x * op.t, y: wall.a.y + d.y * op.t };
      const halfW = op.width / 2;

      const p1 = worldToScreen({ x: center.x - d.x * halfW, y: center.y - d.y * halfW }, width, height);
      const p2 = worldToScreen({ x: center.x + d.x * halfW, y: center.y + d.y * halfW }, width, height);

      const isSelected = selection?.kind === 'opening' && selection.id === op.id;

      if (op.type === 'door') {
        // Door leaf & swing arc
        ctx.strokeStyle = isSelected ? '#d4af37' : '#e5c07b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Swing Arc
        const rScreen = op.width * zoom;
        const angle = Math.atan2(d.y, d.x);
        ctx.strokeStyle = isSelected ? '#d4af37' : 'rgba(229, 192, 123, 0.4)';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, rScreen, angle, angle + Math.PI / 2);
        ctx.stroke();
      } else {
        // Window line double glazing
        ctx.strokeStyle = isSelected ? '#d4af37' : '#61afef';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 6. Furniture Outlines
    for (const obj of doc.objects) {
      if (obj.levelId !== activeLevelId) continue;
      const sp = worldToScreen(obj.position, width, height);
      const wPx = 1.2 * zoom;
      const dPx = 0.8 * zoom;

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(obj.rotation);

      const isSelected = selection?.kind === 'object' && selection.id === obj.id;
      ctx.fillStyle = isSelected ? 'rgba(212, 175, 55, 0.25)' : 'rgba(152, 195, 121, 0.15)';
      ctx.strokeStyle = isSelected ? '#d4af37' : '#98c379';
      ctx.lineWidth = 1.5;

      ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);
      ctx.strokeRect(-wPx / 2, -dPx / 2, wPx, dPx);
      ctx.restore();
    }

    // 7. Active Drawing Previews
    if (activeTool === 'wall' && wallStart) {
      const p1 = worldToScreen(wallStart, width, height);
      const p2 = worldToScreen(mousePosWorld, width, height);
      const wallLen = dist(wallStart, mousePosWorld);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = wallThickness * zoom;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Dimension text
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 12 };
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${wallLen.toFixed(2)} m`, mid.x, mid.y);
    }

    // Hovered wall for door/window placement preview
    if ((activeTool === 'door' || activeTool === 'window') && hoveredWall) {
      const sp = worldToScreen(hoveredWall.point, width, height);
      ctx.fillStyle = activeTool === 'door' ? '#e5c07b' : '#61afef';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Measure tool
    if (activeTool === 'measure' && measurePts.length > 0) {
      const p1 = worldToScreen(measurePts[0], width, height);
      const target = measurePts.length > 1 ? measurePts[1] : mousePosWorld;
      const p2 = worldToScreen(target, width, height);

      ctx.strokeStyle = '#e06c75';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const mDist = dist(measurePts[0], target);
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#e06c75';
      ctx.fillText(`Distance: ${mDist.toFixed(3)} m`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 10);
    }

    ctx.restore();
  }, [
    pan,
    zoom,
    doc,
    activeLevelId,
    activeTool,
    selection,
    wallStart,
    mousePosWorld,
    hoveredWall,
    measurePts,
    wallThickness,
    showUnderlay,
    underlayOpacity,
    worldToScreen,
    screenToWorld,
  ]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth ? canvas.parentElement.clientWidth * window.devicePixelRatio : 800;
      canvas.height = canvas.parentElement?.clientHeight ? canvas.parentElement.clientHeight * window.devicePixelRatio : 600;
      renderCanvas();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      // Middle or right click pan
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(mouseScreen, rect.width, rect.height);
    const snapped = snapPoint(rawWorld);

    if (activeTool === 'wall') {
      if (!wallStart) {
        setWallStart(snapped);
      } else {
        if (dist(wallStart, snapped) > 0.1) {
          createWall(wallStart, snapped);
        }
        setWallStart(null);
      }
    } else if (activeTool === 'door' || activeTool === 'window') {
      if (hoveredWall) {
        createOpening(hoveredWall.wall.id, hoveredWall.t);
      }
    } else if (activeTool === 'object') {
      createObject(snapped);
    } else if (activeTool === 'measure') {
      if (measurePts.length === 0) {
        setMeasurePts([snapped]);
      } else {
        setMeasurePts([]);
      }
    } else if (activeTool === 'select') {
      // Select wall or object
      let hit = false;
      for (const w of doc.walls) {
        if (w.levelId !== activeLevelId) continue;
        const d = dist(w.a, w.b);
        const dir = norm(sub(w.b, w.a));
        const proj = (snapped.x - w.a.x) * dir.x + (snapped.y - w.a.y) * dir.y;
        if (proj >= 0 && proj <= d) {
          const perpDist = Math.abs((snapped.x - w.a.x) * -dir.y + (snapped.y - w.a.y) * dir.x);
          if (perpDist <= w.thickness / 2 + 0.15) {
            setSelection({ kind: 'wall', id: w.id });
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        setSelection(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isPanning) {
      const dx = (e.clientX - panStart.x) / zoom;
      const dy = (e.clientY - panStart.y) / zoom;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(mouseScreen, rect.width, rect.height);
    const snapped = snapPoint(rawWorld);
    setMousePosWorld(snapped);

    // Hover detection for door/window hosting
    if (activeTool === 'door' || activeTool === 'window') {
      let found: { wall: Wall; t: number; point: Vec2 } | null = null;
      for (const w of doc.walls) {
        if (w.levelId !== activeLevelId) continue;
        const d = dist(w.a, w.b);
        const dir = norm(sub(w.b, w.a));
        const proj = (rawWorld.x - w.a.x) * dir.x + (rawWorld.y - w.a.y) * dir.y;
        if (proj >= 0.2 && proj <= d - 0.2) {
          const perpDist = Math.abs((rawWorld.x - w.a.x) * -dir.y + (rawWorld.y - w.a.y) * dir.x);
          if (perpDist <= w.thickness / 2 + 0.2) {
            found = {
              wall: w,
              t: proj,
              point: { x: w.a.x + dir.x * proj, y: w.a.y + dir.y * proj },
            };
            break;
          }
        }
      }
      setHoveredWall(found);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.max(10, Math.min(250, prev * factor)));
  };

  return (
    <div className="plan-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: '100%', height: '100%', display: 'block', cursor: isPanning ? 'grabbing' : 'crosshair' }}
      />
      <div
        className="canvas-hud"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          padding: '6px 12px',
          background: 'rgba(22, 24, 27, 0.85)',
          border: '1px solid #333842',
          borderRadius: 4,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          color: '#abb2bf',
          pointerEvents: 'none',
        }}
      >
        X: {mousePosWorld.x.toFixed(2)}m &nbsp;|&nbsp; Y: {mousePosWorld.y.toFixed(2)}m &nbsp;|&nbsp; Zoom: {zoom.toFixed(0)} px/m
      </div>
    </div>
  );
};
