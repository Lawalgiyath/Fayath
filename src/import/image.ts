import { dist, eq, len, sub } from '../core/geometry';
import { uid } from '../core/ops';
import type { Underlay, Vec2, Wall } from '../core/types';

export interface CalibrationResult {
  scale: number; // meters per pixel
  origin: Vec2;
}

export interface VectorizedWallCandidate {
  a: Vec2;
  b: Vec2;
  thickness: number;
}

export class ImagePlanProcessor {
  /**
   * Loads an image file into an HTMLImageElement.
   */
  public static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Creates an Underlay object initialized at default 0.02 m/px (50 px per meter).
   */
  public static createUnderlay(
    levelId: string,
    img: HTMLImageElement,
    src: string,
    initialScale = 0.02
  ): Underlay {
    return {
      id: uid('und'),
      levelId,
      src,
      origin: { x: -(img.naturalWidth * initialScale) / 2, y: -(img.naturalHeight * initialScale) / 2 },
      scale: initialScale,
      opacity: 0.65,
      widthPx: img.naturalWidth,
      heightPx: img.naturalHeight,
      visible: true,
    };
  }

  /**
   * Computes calibrated scale from two pixel coordinates and real-world distance in meters.
   */
  public static calibrateScale(p1Px: Vec2, p2Px: Vec2, realDistanceM: number): number {
    const pxDist = dist(p1Px, p2Px);
    if (pxDist < 5 || realDistanceM <= 0) return 0.02;
    return realDistanceM / pxDist;
  }

  /**
   * High-speed heuristic wall detection on architectural floor plan images.
   * Isolates thick wall lines, merges collinear segments, and snaps junctions.
   */
  public static detectWallsFromImage(
    img: HTMLImageElement,
    scaleMPerPx: number,
    levelId: string,
    wallHeight = 2.8,
    progressCb?: (p: number) => void
  ): Wall[] {
    const maxDim = 1200;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    let factor = 1.0;

    if (w > maxDim || h > maxDim) {
      factor = maxDim / Math.max(w, h);
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Grayscale & Thresholding (detect dark lines)
    const binary = new Uint8Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Dark pixels (< 160) are architectural lines
      binary[i / 4] = lum < 160 ? 1 : 0;
    }

    progressCb?.(0.3);

    // 2. Horizontal run-length extraction
    const hSegments: { x1: number; x2: number; y: number }[] = [];
    const minRunPx = Math.round(25 * factor); // minimum wall length ~0.5m

    for (let y = 0; y < h; y += 2) {
      let runStart = -1;
      for (let x = 0; x < w; x++) {
        if (binary[y * w + x] === 1) {
          if (runStart === -1) runStart = x;
        } else {
          if (runStart !== -1) {
            if (x - runStart >= minRunPx) {
              hSegments.push({ x1: runStart, x2: x, y });
            }
            runStart = -1;
          }
        }
      }
      if (runStart !== -1 && w - runStart >= minRunPx) {
        hSegments.push({ x1: runStart, x2: w, y });
      }
    }

    // 3. Vertical run-length extraction
    const vSegments: { y1: number; y2: number; x: number }[] = [];
    for (let x = 0; x < w; x += 2) {
      let runStart = -1;
      for (let y = 0; y < h; y++) {
        if (binary[y * w + x] === 1) {
          if (runStart === -1) runStart = y;
        } else {
          if (runStart !== -1) {
            if (y - runStart >= minRunPx) {
              vSegments.push({ y1: runStart, y2: y, x });
            }
            runStart = -1;
          }
        }
      }
      if (runStart !== -1 && h - runStart >= minRunPx) {
        vSegments.push({ y1: runStart, y2: h, x });
      }
    }

    progressCb?.(0.6);

    // 4. Cluster parallel adjacent runs to extract wall thickness and centerline
    const rawWalls: { a: Vec2; b: Vec2; thickness: number }[] = [];

    // Horizontal cluster
    hSegments.sort((a, b) => a.y - b.y || a.x1 - b.x1);
    const hClustered = new Set<number>();
    for (let i = 0; i < hSegments.length; i++) {
      if (hClustered.has(i)) continue;
      const s1 = hSegments[i];
      let ySum = s1.y;
      let count = 1;
      let minX = s1.x1;
      let maxX = s1.x2;

      for (let j = i + 1; j < hSegments.length; j++) {
        const s2 = hSegments[j];
        if (s2.y - s1.y > 15 * factor) break; // wall thickness limit
        if (Math.min(maxX, s2.x2) - Math.max(minX, s2.x1) > 0.6 * (s1.x2 - s1.x1)) {
          hClustered.add(j);
          ySum += s2.y;
          count++;
          minX = Math.min(minX, s2.x1);
          maxX = Math.max(maxX, s2.x2);
        }
      }

      if (count >= 2) {
        const avgY = ySum / count;
        rawWalls.push({
          a: { x: minX, y: avgY },
          b: { x: maxX, y: avgY },
          thickness: (count * 2) / factor,
        });
      }
    }

    // Vertical cluster
    vSegments.sort((a, b) => a.x - b.x || a.y1 - b.y1);
    const vClustered = new Set<number>();
    for (let i = 0; i < vSegments.length; i++) {
      if (vClustered.has(i)) continue;
      const s1 = vSegments[i];
      let xSum = s1.x;
      let count = 1;
      let minY = s1.y1;
      let maxY = s1.y2;

      for (let j = i + 1; j < vSegments.length; j++) {
        const s2 = vSegments[j];
        if (s2.x - s1.x > 15 * factor) break;
        if (Math.min(maxY, s2.y2) - Math.max(minY, s2.y1) > 0.6 * (s1.y2 - s1.y1)) {
          vClustered.add(j);
          xSum += s2.x;
          count++;
          minY = Math.min(minY, s2.y1);
          maxY = Math.max(maxY, s2.y2);
        }
      }

      if (count >= 2) {
        const avgX = xSum / count;
        rawWalls.push({
          a: { x: avgX, y: minY },
          b: { x: avgX, y: maxY },
          thickness: (count * 2) / factor,
        });
      }
    }

    progressCb?.(0.8);

    // 5. Convert from canvas coordinates to real-world centered meters
    const effectiveScale = scaleMPerPx / factor;
    const cx = w / 2;
    const cy = h / 2;

    const walls: Wall[] = [];
    for (const r of rawWalls) {
      const p1: Vec2 = {
        x: Math.round(((r.a.x - cx) * effectiveScale) * 100) / 100,
        y: Math.round(((r.a.y - cy) * effectiveScale) * 100) / 100,
      };
      const p2: Vec2 = {
        x: Math.round(((r.b.x - cx) * effectiveScale) * 100) / 100,
        y: Math.round(((r.b.y - cy) * effectiveScale) * 100) / 100,
      };

      if (dist(p1, p2) < 0.3) continue;

      const thickM = Math.max(0.12, Math.min(0.45, (r.thickness * effectiveScale)));

      walls.push({
        id: uid('w'),
        levelId,
        a: p1,
        b: p2,
        thickness: Math.round(thickM * 100) / 100,
        height: wallHeight,
      });
    }

    // 6. Snap nearby endpoints together (join corner nodes)
    for (let i = 0; i < walls.length; i++) {
      for (let j = 0; j < walls.length; j++) {
        if (i === j) continue;
        const w1 = walls[i];
        const w2 = walls[j];
        if (dist(w1.a, w2.a) < 0.25) w1.a = { ...w2.a };
        if (dist(w1.a, w2.b) < 0.25) w1.a = { ...w2.b };
        if (dist(w1.b, w2.a) < 0.25) w1.b = { ...w2.a };
        if (dist(w1.b, w2.b) < 0.25) w1.b = { ...w2.b };
      }
    }

    progressCb?.(1.0);
    return walls;
  }
}
