import DxfParser from 'dxf-parser';
import { add, dist, dot, len, mul, norm, perp, sub } from '../core/geometry';
import { healLevel, uid } from '../core/ops';
import type { Opening, ProjectDoc, Wall } from '../core/types';

export interface DxfLayerStats {
  name: string;
  count: number;
  color?: string;
  role: 'wall' | 'door' | 'window' | 'ignore';
}

export interface DxfImportResult {
  doc: ProjectDoc;
  wallsAdded: number;
  openingsAdded: number;
  layersDetected: DxfLayerStats[];
}

export class DxfImporter {
  /**
   * Automatically ingests a DXF file, normalizes scale, extracts walls and openings.
   */
  public static async parse(
    fileText: string,
    existingDoc: ProjectDoc,
    levelId: string,
    unitScaleOverride?: number
  ): Promise<DxfImportResult> {
    const parser = new DxfParser();
    let dxfData: any;
    try {
      dxfData = parser.parseSync(fileText);
    } catch (err: any) {
      throw new Error(`Failed to parse DXF: ${err.message}`);
    }

    if (!dxfData || !dxfData.entities) {
      throw new Error('DXF file contains no entities');
    }

    // 1. Determine Unit Scale (Default to meters)
    let unitScale = unitScaleOverride;
    if (!unitScale) {
      const insUnits = dxfData.header?.$INSUNITS;
      switch (insUnits) {
        case 1: // inches
          unitScale = 0.0254;
          break;
        case 2: // feet
          unitScale = 0.3048;
          break;
        case 4: // mm
          unitScale = 0.001;
          break;
        case 5: // cm
          unitScale = 0.01;
          break;
        case 6: // meters
          unitScale = 1.0;
          break;
        default:
          // Heuristic based on bounding coordinates
          unitScale = this.guessUnitScale(dxfData.entities);
      }
    }

    // 2. Classify Layers
    const layerStats = new Map<string, DxfLayerStats>();
    for (const ent of dxfData.entities) {
      const lay = ent.layer || '0';
      if (!layerStats.has(lay)) {
        layerStats.set(lay, {
          name: lay,
          count: 0,
          role: this.classifyLayer(lay),
        });
      }
      layerStats.get(lay)!.count++;
    }

    // 3. Extract line segments for wall layers
    const wallLines: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
    const openingEntities: any[] = [];

    for (const ent of dxfData.entities) {
      const lay = ent.layer || '0';
      const role = layerStats.get(lay)?.role || 'ignore';

      if (role === 'wall') {
        if (ent.type === 'LINE') {
          wallLines.push({
            a: { x: ent.vertices[0].x * unitScale, y: -ent.vertices[0].y * unitScale },
            b: { x: ent.vertices[1].x * unitScale, y: -ent.vertices[1].y * unitScale },
          });
        } else if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
          const v = ent.vertices;
          for (let i = 0; i + 1 < v.length; i++) {
            wallLines.push({
              a: { x: v[i].x * unitScale, y: -v[i].y * unitScale },
              b: { x: v[i + 1].x * unitScale, y: -v[i + 1].y * unitScale },
            });
          }
          if (ent.shape) {
            // Closed polyline
            wallLines.push({
              a: { x: v[v.length - 1].x * unitScale, y: -v[v.length - 1].y * unitScale },
              b: { x: v[0].x * unitScale, y: -v[0].y * unitScale },
            });
          }
        }
      } else if (role === 'door' || role === 'window') {
        openingEntities.push({ ent, role });
      }
    }

    // 4. Pair parallel double-line walls into centerlines, or use directly if single-line
    const { walls: resolvedWalls, defaultThickness } = this.processWallGeometry(
      wallLines,
      levelId,
      existingDoc.levels.find((l) => l.id === levelId)?.height || 2.8
    );

    // Clone doc and append new walls
    const newDoc: ProjectDoc = JSON.parse(JSON.stringify(existingDoc));
    newDoc.walls.push(...resolvedWalls);

    // Heal intersections so T-junctions become clean nodes
    healLevel(newDoc, levelId);

    // 5. Extract doors and windows and attach to host walls
    let openingsAdded = 0;
    for (const op of openingEntities) {
      const pt = this.getEntityCenter(op.ent, unitScale);
      if (!pt) continue;

      // Find closest wall
      let bestWall: Wall | null = null;
      let bestDist = Infinity;
      let bestT = 0;

      for (const w of newDoc.walls) {
        if (w.levelId !== levelId) continue;
        const d = dist(w.a, w.b);
        if (d < 0.2) continue;
        const dir = norm(sub(w.b, w.a));
        const proj = dot(sub(pt, w.a), dir);
        if (proj >= 0 && proj <= d) {
          const closest = add(w.a, mul(dir, proj));
          const distance = dist(pt, closest);
          if (distance < bestDist && distance < 0.8) {
            bestDist = distance;
            bestWall = w;
            bestT = proj;
          }
        }
      }

      if (bestWall) {
        const isDoor = op.role === 'door';
        const width = this.estimateOpeningWidth(op.ent, unitScale) || (isDoor ? 0.9 : 1.4);
        const opening: Opening = {
          id: uid('op'),
          wallId: bestWall.id,
          type: isDoor ? 'door' : 'window',
          style: isDoor ? 'single' : 'casement',
          t: bestT,
          width,
          height: isDoor ? 2.1 : 1.3,
          sill: isDoor ? 0 : 0.9,
        };
        newDoc.openings.push(opening);
        openingsAdded++;
      }
    }

    return {
      doc: newDoc,
      wallsAdded: resolvedWalls.length,
      openingsAdded,
      layersDetected: Array.from(layerStats.values()),
    };
  }

  private static classifyLayer(layerName: string): 'wall' | 'door' | 'window' | 'ignore' {
    const l = layerName.toUpperCase();
    if (l.includes('WALL') || l.includes('MUR') || l.includes('WAND') || l.includes('MURO')) {
      return 'wall';
    }
    if (l.includes('DOOR') || l.includes('PORTE') || l.includes('TUER') || l.includes('PORTA')) {
      return 'door';
    }
    if (l.includes('WIN') || l.includes('FEN') || l.includes('FENSTER') || l.includes('GLAS')) {
      return 'window';
    }
    return 'ignore';
  }

  private static guessUnitScale(entities: any[]): number {
    let minX = Infinity,
      maxX = -Infinity;
    for (const ent of entities.slice(0, 500)) {
      if (ent.vertices) {
        for (const v of ent.vertices) {
          if (v.x < minX) minX = v.x;
          if (v.x > maxX) maxX = v.x;
        }
      }
    }
    const span = Math.abs(maxX - minX);
    if (span > 5000) return 0.001; // likely millimeters
    if (span > 500) return 0.01; // likely centimeters
    if (span > 100) return 0.3048; // likely inches/feet
    return 1.0; // likely meters
  }

  /**
   * Groups parallel lines (double-line architectural walls) into single centerlines with thickness.
   */
  private static processWallGeometry(
    lines: { a: { x: number; y: number }; b: { x: number; y: number } }[],
    levelId: string,
    wallHeight: number
  ): { walls: Wall[]; defaultThickness: number } {
    const paired = new Set<number>();
    const walls: Wall[] = [];
    const defaultThickness = 0.2;

    for (let i = 0; i < lines.length; i++) {
      if (paired.has(i)) continue;
      const l1 = lines[i];
      const d1 = sub(l1.b, l1.a);
      const len1 = len(d1);
      if (len1 < 0.1) continue;

      const n1 = perp(norm(d1));
      let matchIdx = -1;
      let matchDist = 0;

      for (let j = i + 1; j < lines.length; j++) {
        if (paired.has(j)) continue;
        const l2 = lines[j];
        const d2 = sub(l2.b, l2.a);
        const len2 = len(d2);

        // Check if nearly parallel
        const dotProd = Math.abs(dot(norm(d1), norm(d2)));
        if (dotProd > 0.98) {
          // Check lateral separation (wall thickness between 0.08m and 0.55m)
          const lateral1 = Math.abs(dot(sub(l2.a, l1.a), n1));
          const lateral2 = Math.abs(dot(sub(l2.b, l1.a), n1));
          const lat = (lateral1 + lateral2) / 2;

          if (lat >= 0.08 && lat <= 0.55) {
            // Overlapping range
            matchIdx = j;
            matchDist = lat;
            break;
          }
        }
      }

      if (matchIdx !== -1) {
        paired.add(i);
        paired.add(matchIdx);
        const l2 = lines[matchIdx];

        // Centerline
        const ca = mul(add(l1.a, l2.a), 0.5);
        const cb = mul(add(l1.b, l2.b), 0.5);

        walls.push({
          id: uid('w'),
          levelId,
          a: ca,
          b: cb,
          thickness: Math.round(matchDist * 100) / 100,
          height: wallHeight,
        });
      } else {
        // Single line wall
        walls.push({
          id: uid('w'),
          levelId,
          a: l1.a,
          b: l1.b,
          thickness: defaultThickness,
          height: wallHeight,
        });
      }
    }

    return { walls, defaultThickness };
  }

  private static getEntityCenter(ent: any, unitScale: number): { x: number; y: number } | null {
    if (ent.position) {
      return { x: ent.position.x * unitScale, y: -ent.position.y * unitScale };
    }
    if (ent.vertices && ent.vertices.length > 0) {
      let sx = 0,
        sy = 0;
      for (const v of ent.vertices) {
        sx += v.x;
        sy += v.y;
      }
      return {
        x: (sx / ent.vertices.length) * unitScale,
        y: -(sy / ent.vertices.length) * unitScale,
      };
    }
    return null;
  }

  private static estimateOpeningWidth(ent: any, unitScale: number): number | null {
    if (ent.vertices && ent.vertices.length >= 2) {
      return dist(
        { x: ent.vertices[0].x * unitScale, y: -ent.vertices[0].y * unitScale },
        { x: ent.vertices[1].x * unitScale, y: -ent.vertices[1].y * unitScale }
      );
    }
    return null;
  }
}
