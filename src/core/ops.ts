import type { Opening, ProjectDoc, Vec2, Wall } from './types';
import { closestOnSegment, dist, eq, lerp2 } from './geometry';

let counter = 0;
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const wallLength = (w: Wall) => dist(w.a, w.b);

export function clampOpening(o: Opening, w: Wall) {
  const L = wallLength(w);
  o.width = Math.min(o.width, Math.max(0.3, L - 0.1));
  o.t = Math.max(o.width / 2 + 0.05, Math.min(L - o.width / 2 - 0.05, o.t));
  o.height = Math.min(o.height, w.height - o.sill - 0.02);
}

export function splitWallAt(doc: ProjectDoc, wallId: string, p: Vec2): [Wall, Wall] | null {
  const w = doc.walls.find((x) => x.id === wallId);
  if (!w) return null;
  const c = closestOnSegment(p, w.a, w.b);
  const L = wallLength(w);
  const at = c.t * L;
  if (at < 0.02 || L - at < 0.02) return null;
  const sp = lerp2(w.a, w.b, c.t);
  const w2: Wall = { ...w, id: uid('w'), a: { ...sp }, b: { ...w.b } };
  w.b = { ...sp };
  doc.walls.push(w2);
  for (const o of doc.openings) {
    if (o.wallId !== w.id) continue;
    if (o.t > at) {
      o.wallId = w2.id;
      o.t -= at;
      clampOpening(o, w2);
    } else clampOpening(o, w);
  }
  return [w, w2];
}

// Ensure a point becomes a node: split any wall whose body it lies on.
export function ensureNode(doc: ProjectDoc, levelId: string, p: Vec2, tol = 0.01) {
  for (const w of doc.walls) {
    if (w.levelId !== levelId) continue;
    if (eq(w.a, p, tol) || eq(w.b, p, tol)) continue;
    const c = closestOnSegment(p, w.a, w.b);
    if (c.d < tol) {
      splitWallAt(doc, w.id, p);
      return;
    }
  }
}

export function addWall(doc: ProjectDoc, levelId: string, a: Vec2, b: Vec2, thickness: number, height: number): Wall | null {
  if (dist(a, b) < 0.05) return null;
  ensureNode(doc, levelId, a);
  ensureNode(doc, levelId, b);
  const w: Wall = { id: uid('w'), levelId, a: { ...a }, b: { ...b }, thickness, height };
  doc.walls.push(w);
  // existing walls whose endpoints land on the new wall body become T junctions
  const touching: Vec2[] = [];
  for (const o of doc.walls) {
    if (o === w || o.levelId !== levelId) continue;
    for (const p of [o.a, o.b]) {
      const c = closestOnSegment(p, w.a, w.b);
      if (c.d < 0.01 && c.t > 0.001 && c.t < 0.999) touching.push(p);
    }
  }
  for (const p of touching) ensureNode(doc, levelId, p);
  return w;
}

export function moveNode(doc: ProjectDoc, levelId: string, from: Vec2, to: Vec2) {
  for (const w of doc.walls) {
    if (w.levelId !== levelId) continue;
    if (eq(w.a, from, 1e-3)) w.a = { ...to };
    if (eq(w.b, from, 1e-3)) w.b = { ...to };
  }
  for (const o of doc.openings) {
    const w = doc.walls.find((x) => x.id === o.wallId);
    if (w) clampOpening(o, w);
  }
}

export function deleteWall(doc: ProjectDoc, id: string) {
  doc.walls = doc.walls.filter((w) => w.id !== id);
  doc.openings = doc.openings.filter((o) => o.wallId !== id);
}

export function removeDegenerate(doc: ProjectDoc) {
  const bad = new Set(doc.walls.filter((w) => wallLength(w) < 0.02).map((w) => w.id));
  if (!bad.size) return;
  doc.walls = doc.walls.filter((w) => !bad.has(w.id));
  doc.openings = doc.openings.filter((o) => !bad.has(o.wallId));
}

// Split all walls at T junctions. Used after imports.
export function healLevel(doc: ProjectDoc, levelId: string) {
  let guard = 0;
  let changed = true;
  while (changed && guard++ < 20) {
    changed = false;
    const walls = doc.walls.filter((w) => w.levelId === levelId);
    outer: for (const w of walls) {
      for (const o of walls) {
        if (o === w) continue;
        for (const p of [o.a, o.b]) {
          const c = closestOnSegment(p, w.a, w.b);
          const L = wallLength(w);
          if (c.d < 0.01 && c.t * L > 0.02 && (1 - c.t) * L > 0.02) {
            splitWallAt(doc, w.id, p);
            changed = true;
            break outer;
          }
        }
      }
    }
  }
}

export function nodeDegree(doc: ProjectDoc, levelId: string, p: Vec2) {
  let n = 0;
  for (const w of doc.walls) if (w.levelId === levelId && (eq(w.a, p, 1e-3) || eq(w.b, p, 1e-3))) n++;
  return n;
}
