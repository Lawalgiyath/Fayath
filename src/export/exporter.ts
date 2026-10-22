import * as THREE from 'three';
import { dist, norm, perp, sub } from '../core/geometry';
import { detectRooms } from '../core/rooms';
import type { ProjectDoc } from '../core/types';

export class ProjectExporter {
  /**
   * Captures high-res still image from Three.js renderer.
   */
  public static captureImage(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width = 2560,
    height = 1440
  ): string {
    const origSize = new THREE.Vector2();
    renderer.getSize(origSize);
    const origPixelRatio = renderer.getPixelRatio();

    // Resize renderer temporarily for high-res render
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Restore original size
    renderer.setPixelRatio(origPixelRatio);
    renderer.setSize(origSize.x, origSize.y, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = origSize.x / origSize.y;
      camera.updateProjectionMatrix();
    }

    return dataUrl;
  }

  /**
   * Exports 2D floor plan as a standard CAD DXF string.
   */
  public static exportDxf(doc: ProjectDoc): string {
    const lines: string[] = [];

    // DXF Header
    lines.push('0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC');

    // TABLES: Layers
    lines.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '4');
    const addLayer = (name: string, color: number) => {
      lines.push('0', 'LAYER', '2', name, '70', '0', '62', color.toString(), '6', 'CONTINUOUS');
    };
    addLayer('A-WALL', 7); // white
    addLayer('A-DOOR', 4); // cyan
    addLayer('A-WINDOW', 3); // green
    addLayer('A-ROOM', 1); // red
    lines.push('0', 'ENDTAB', '0', 'ENDSEC');

    // ENTITIES
    lines.push('0', 'SECTION', '2', 'ENTITIES');

    // 1. Walls as double lines based on thickness
    for (const w of doc.walls) {
      const d = norm(sub(w.b, w.a));
      const n = perp(d);
      const ht = w.thickness / 2;

      const p1 = { x: w.a.x + n.x * ht, y: -w.a.y - n.y * ht };
      const p2 = { x: w.b.x + n.x * ht, y: -w.b.y - n.y * ht };
      const p3 = { x: w.a.x - n.x * ht, y: -w.a.y + n.y * ht };
      const p4 = { x: w.b.x - n.x * ht, y: -w.b.y + n.y * ht };

      // Line 1
      lines.push('0', 'LINE', '8', 'A-WALL', '10', p1.x.toFixed(4), '20', p1.y.toFixed(4), '30', '0.0');
      lines.push('11', p2.x.toFixed(4), '21', p2.y.toFixed(4), '31', '0.0');

      // Line 2
      lines.push('0', 'LINE', '8', 'A-WALL', '10', p3.x.toFixed(4), '20', p3.y.toFixed(4), '30', '0.0');
      lines.push('11', p4.x.toFixed(4), '21', p4.y.toFixed(4), '31', '0.0');
    }

    // 2. Openings
    for (const op of doc.openings) {
      const wall = doc.walls.find((w) => w.id === op.wallId);
      if (!wall) continue;

      const d = norm(sub(wall.b, wall.a));
      const cx = wall.a.x + d.x * op.t;
      const cy = -(wall.a.y + d.y * op.t);

      const halfW = op.width / 2;
      const ox1 = cx - d.x * halfW;
      const oy1 = cy + d.y * halfW;
      const ox2 = cx + d.x * halfW;
      const oy2 = cy - d.y * halfW;

      const layer = op.type === 'door' ? 'A-DOOR' : 'A-WINDOW';
      lines.push('0', 'LINE', '8', layer, '10', ox1.toFixed(4), '20', oy1.toFixed(4), '30', '0.0');
      lines.push('11', ox2.toFixed(4), '21', oy2.toFixed(4), '31', '0.0');
    }

    // 3. Room text labels
    const rooms = detectRooms(doc);
    for (const r of rooms) {
      lines.push('0', 'TEXT', '8', 'A-ROOM');
      lines.push('10', r.center.x.toFixed(4), '20', (-r.center.y).toFixed(4), '30', '0.0');
      lines.push('40', '0.35'); // text height 350mm
      lines.push('1', `${r.name} (${r.netArea.toFixed(1)}m2)`);
    }

    lines.push('0', 'ENDSEC', '0', 'EOF');
    return lines.join('\n');
  }

  /**
   * Exports 3D scene geometry as Wavefront OBJ format.
   */
  public static exportObj(sceneGroup: THREE.Group): string {
    const objLines: string[] = ['# Fayath Studio 3D Architectural Model'];
    let vOffset = 1;

    sceneGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) {
        const geo = child.geometry;
        if (!geo || !geo.attributes.position) return;

        const posAttr = geo.attributes.position;
        const normAttr = geo.attributes.normal;
        const uvAttr = geo.attributes.uv;

        objLines.push(`o ${child.name || 'ArchElement'}`);

        // Vertices transformed to world coords
        const matrixWorld = child.matrixWorld;
        const v = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
          v.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld);
          objLines.push(`v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`);
        }

        // Texture coordinates
        if (uvAttr) {
          for (let i = 0; i < uvAttr.count; i++) {
            objLines.push(`vt ${uvAttr.getX(i).toFixed(4)} ${uvAttr.getY(i).toFixed(4)}`);
          }
        }

        // Normals
        if (normAttr) {
          const n = new THREE.Vector3();
          for (let i = 0; i < normAttr.count; i++) {
            n.fromBufferAttribute(normAttr, i).transformDirection(matrixWorld);
            objLines.push(`vn ${n.x.toFixed(4)} ${n.y.toFixed(4)} ${n.z.toFixed(4)}`);
          }
        }

        // Faces (1-indexed)
        const hasUv = !!uvAttr;
        const hasNorm = !!normAttr;

        if (geo.index) {
          const index = geo.index;
          for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i) + vOffset;
            const b = index.getX(i + 1) + vOffset;
            const c = index.getX(i + 2) + vOffset;
            if (hasUv && hasNorm) {
              objLines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
            } else {
              objLines.push(`f ${a} ${b} ${c}`);
            }
          }
        } else {
          for (let i = 0; i < posAttr.count; i += 3) {
            const a = i + vOffset;
            const b = i + 1 + vOffset;
            const c = i + 2 + vOffset;
            if (hasUv && hasNorm) {
              objLines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
            } else {
              objLines.push(`f ${a} ${b} ${c}`);
            }
          }
        }

        vOffset += posAttr.count;
      }
    });

    return objLines.join('\n');
  }

  /**
   * Initiates browser file download.
   */
  public static triggerDownload(filename: string, content: string | Blob) {
    const blob = typeof content === 'string' ? new Blob([content], { type: 'text/plain' }) : content;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
