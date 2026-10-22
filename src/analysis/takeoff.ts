import { dist } from '../core/geometry';
import { detectRooms, type DetectedRoom } from '../core/rooms';
import type { ProjectDoc } from '../core/types';
import { LIB_MAP } from '../materials/library';

export interface RoomTakeoffItem {
  id: string;
  name: string;
  level: string;
  netAreaM2: number;
  perimeterM: number;
  floorMat: string;
  ceilingMat: string;
  floorCost: number;
}

export interface MaterialTakeoffItem {
  materialId: string;
  materialName: string;
  category: string;
  quantityM2: number;
  unitRate: number;
  totalCost: number;
}

export interface OpeningTakeoffItem {
  type: 'door' | 'window';
  style: string;
  count: number;
  totalWidthM: number;
  totalAreaM2: number;
  unitRate: number;
  totalCost: number;
}

export interface TakeoffReport {
  rooms: RoomTakeoffItem[];
  materials: MaterialTakeoffItem[];
  openings: OpeningTakeoffItem[];
  totalFloorAreaM2: number;
  totalGrossWallAreaM2: number;
  totalNetWallAreaM2: number;
  totalCost: number;
  currency: string;
}

export class TakeoffCalculator {
  public static calculate(doc: ProjectDoc): TakeoffReport {
    const detectedRooms = detectRooms(doc);
    const currency = doc.settings.currency || '$';
    const rates = doc.settings.costRates || {};

    let totalFloorAreaM2 = 0;
    const roomItems: RoomTakeoffItem[] = [];
    const matQuantities = new Map<string, number>();

    // 1. Process Rooms
    for (const r of detectedRooms) {
      const level = doc.levels.find((l) => l.id === r.levelId);
      const floorMatId = r.label?.floorMat || doc.settings.defaultFloorMat || 'herringbone-oak';
      const ceilingMatId = r.label?.ceilingMat || doc.settings.defaultCeilingMat || 'ceiling-white';
      const unitRate = rates[floorMatId] || LIB_MAP.get(floorMatId)?.cost || 80;

      const area = Math.round(r.netArea * 10) / 10;
      totalFloorAreaM2 += area;

      const floorCost = Math.round(area * unitRate);
      matQuantities.set(floorMatId, (matQuantities.get(floorMatId) || 0) + area);
      matQuantities.set(ceilingMatId, (matQuantities.get(ceilingMatId) || 0) + area);

      roomItems.push({
        id: r.key,
        name: r.name,
        level: level?.name || 'Level 1',
        netAreaM2: area,
        perimeterM: Math.round(r.perimeter * 10) / 10,
        floorMat: LIB_MAP.get(floorMatId)?.name || floorMatId,
        ceilingMat: LIB_MAP.get(ceilingMatId)?.name || ceilingMatId,
        floorCost,
      });
    }

    // 2. Process Walls and Openings
    let totalGrossWallAreaM2 = 0;
    let totalOpeningsCutoutM2 = 0;

    for (const w of doc.walls) {
      const wallLen = dist(w.a, w.b);
      const grossArea = wallLen * w.height;
      totalGrossWallAreaM2 += grossArea;

      // Two vertical sides (Left & Right)
      const matL = w.matL || doc.settings.defaultWallMat || 'paint-warm-white';
      const matR = w.matR || doc.settings.defaultWallMat || 'paint-warm-white';

      matQuantities.set(matL, (matQuantities.get(matL) || 0) + grossArea);
      matQuantities.set(matR, (matQuantities.get(matR) || 0) + grossArea);
    }

    // Deduct openings from wall finishes
    const openingGroups = new Map<string, { type: 'door' | 'window'; style: string; count: number; width: number; area: number }>();

    for (const op of doc.openings) {
      const area = op.width * op.height;
      totalOpeningsCutoutM2 += area;

      const key = `${op.type}_${op.style}`;
      const existing = openingGroups.get(key) || {
        type: op.type,
        style: op.style,
        count: 0,
        width: 0,
        area: 0,
      };
      existing.count++;
      existing.width += op.width;
      existing.area += area;
      openingGroups.set(key, existing);
    }

    const totalNetWallAreaM2 = Math.max(0, totalGrossWallAreaM2 - totalOpeningsCutoutM2);

    // 3. Opening Cost Items
    const openingItems: OpeningTakeoffItem[] = [];
    let totalOpeningsCost = 0;

    for (const grp of openingGroups.values()) {
      const isDoor = grp.type === 'door';
      const rate = isDoor
        ? doc.settings.openingRates.door
        : doc.settings.openingRates.window;
      const cost = grp.count * rate;
      totalOpeningsCost += cost;

      openingItems.push({
        type: grp.type,
        style: grp.style,
        count: grp.count,
        totalWidthM: Math.round(grp.width * 10) / 10,
        totalAreaM2: Math.round(grp.area * 10) / 10,
        unitRate: rate,
        totalCost: cost,
      });
    }

    // 4. Material Takeoff Line Items
    const matItems: MaterialTakeoffItem[] = [];
    let totalMaterialCost = 0;

    for (const [matId, qty] of matQuantities.entries()) {
      const def = LIB_MAP.get(matId);
      const rate = rates[matId] !== undefined ? rates[matId] : (def?.cost || 50);
      const roundedQty = Math.round(qty * 10) / 10;
      const cost = Math.round(roundedQty * rate);
      totalMaterialCost += cost;

      matItems.push({
        materialId: matId,
        materialName: def?.name || matId,
        category: def?.category || 'General',
        quantityM2: roundedQty,
        unitRate: rate,
        totalCost: cost,
      });
    }

    matItems.sort((a, b) => b.totalCost - a.totalCost);

    return {
      rooms: roomItems,
      materials: matItems,
      openings: openingItems,
      totalFloorAreaM2: Math.round(totalFloorAreaM2 * 10) / 10,
      totalGrossWallAreaM2: Math.round(totalGrossWallAreaM2 * 10) / 10,
      totalNetWallAreaM2: Math.round(totalNetWallAreaM2 * 10) / 10,
      totalCost: totalMaterialCost + totalOpeningsCost,
      currency,
    };
  }

  public static exportCsv(report: TakeoffReport): string {
    const lines: string[] = [];

    lines.push('=== FAYATH STUDIO - ARCHITECTURAL QUANTITY TAKEOFF & ESTIMATE ===');
    lines.push(`Total Net Floor Area: ${report.totalFloorAreaM2} m2`);
    lines.push(`Total Net Wall Surface: ${report.totalNetWallAreaM2} m2`);
    lines.push(`Total Project Finishing Estimate: ${report.currency}${report.totalCost.toLocaleString()}`);
    lines.push('');

    lines.push('--- ROOM SCHEDULE ---');
    lines.push('Room Name,Level,Net Area (m2),Perimeter (m),Floor Finish,Ceiling Finish,Floor Cost');
    for (const r of report.rooms) {
      lines.push(`"${r.name}","${r.level}",${r.netAreaM2},${r.perimeterM},"${r.floorMat}","${r.ceilingMat}",${r.floorCost}`);
    }
    lines.push('');

    lines.push('--- MATERIAL FINISHES ---');
    lines.push('Material Name,Category,Quantity (m2),Unit Rate,Total Cost');
    for (const m of report.materials) {
      lines.push(`"${m.materialName}","${m.category}",${m.quantityM2},${m.unitRate},${m.totalCost}`);
    }
    lines.push('');

    lines.push('--- OPENINGS SCHEDULE ---');
    lines.push('Type,Style,Count,Total Width (m),Total Area (m2),Unit Rate,Total Cost');
    for (const o of report.openings) {
      lines.push(`"${o.type}","${o.style}",${o.count},${o.totalWidthM},${o.totalAreaM2},${o.unitRate},${o.totalCost}`);
    }

    return lines.join('\n');
  }
}
