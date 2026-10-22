import type { ProjectDoc, RoomLabel, Vec2, Wall } from './types';
import { add, closestOnSegment, cross, dist, interiorPoint, lerp2, mul, pointInPolygon, polygonArea, polygonPerimeter, sub } from './geometry';

export interface DetectedRoom {
  key: string;
  levelId: string;
  poly: Vec2[];
  area: number; // centerline area
  netArea: number; // approximate clear floor area
  perimeter: number;
  center: Vec2;
  label?: RoomLabel;
  name: string;
}

const KEY = (p: Vec2) => `${Math.round(p.x * 500)}|${Math.round(p.y * 500)}`;

function segIntersectT(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-10) return null;
  const t = cross(sub(c, a), s) / den;
  const u = cross(sub(c, a), r) / den;
  if (t > 1e-6 && t < 1 - 1e-6 && u > -1e-6 && u < 1 + 1e-6) return t;
  return null;
}

export function findFaces(walls: Wall[]): { poly: Vec2[]; avgT: number }[] {
  if (walls.length < 3) return [];
  // 1. split every segment at T junctions and crossings
  const edges: { a: Vec2; b: Vec2; t: number }[] = [];
  for (const w of walls) {
    const ts = [0, 1];
    for (const o of walls) {
      if (o === w) continue;
      for (const p of [o.a, o.b]) {
        const c = closestOnSegment(p, w.a, w.b);
        if (c.d < 0.005 && c.t > 1e-4 && c.t < 1 - 1e-4) ts.push(c.t);
      }
      const t = segIntersectT(w.a, w.b, o.a, o.b);
      if (t !== null) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i++) {
      if (ts[i + 1] - ts[i] < 1e-5) continue;
      edges.push({ a: lerp2(w.a, w.b, ts[i]), b: lerp2(w.a, w.b, ts[i + 1]), t: w.thickness });
    }
  }
  // 2. graph
  const pos = new Map<string, Vec2>();
  const adj = new Map<string, Map<string, number>>();
  const link = (u: string, v: string, t: number) => {
    if (!adj.has(u)) adj.set(u, new Map());
    adj.get(u)!.set(v, t);
  };
  for (const e of edges) {
    const ka = KEY(e.a);
    const kb = KEY(e.b);
    if (ka === kb) continue;
    if (!pos.has(ka)) pos.set(ka, e.a);
    if (!pos.has(kb)) pos.set(kb, e.b);
    link(ka, kb, e.t);
    link(kb, ka, e.t);
  }
  // 3. prune dangling edges
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, nb] of adj) {
      if (nb.size <= 1) {
        for (const o of nb.keys()) adj.get(o)?.delete(k);
        adj.delete(k);
        changed = true;
      }
    }
  }
  // 4. angular ordering
  const order = new Map<string, string[]>();
  for (const [k, nb] of adj) {
    const p = pos.get(k)!;
    const list = [...nb.keys()].sort((m, n) => {
      const pm = pos.get(m)!;
      const pn = pos.get(n)!;
      return Math.atan2(pm.y - p.y, pm.x - p.x) - Math.atan2(pn.y - p.y, pn.x - p.x);
    });
    order.set(k, list);
  }
  // 5. trace faces
  const visited = new Set<string>();
  const faces: { poly: Vec2[]; avgT: number }[] = [];
  for (const [u, list] of order) {
    for (const v0 of list) {
      const startKey = `${u}>${v0}`;
      if (visited.has(startKey)) continue;
      const cycle: string[] = [];
      let a = u;
      let b = v0;
      let guard = 0;
      let tSum = 0;
      while (guard++ < 10000) {
        const hk = `${a}>${b}`;
        if (visited.has(hk)) break;
        visited.add(hk);
        cycle.push(a);
        tSum += adj.get(a)?.get(b) ?? 0.2;
        const nl = order.get(b)!;
        const idx = nl.indexOf(a);
        const next = nl[(idx - 1 + nl.length) % nl.length];
        a = b;
        b = next;
      }
      if (cycle.length >= 3 && a === u && b === v0) {
        const poly = cycle.map((k) => pos.get(k)!);
        const area = polygonArea(poly);
        if (area > 0.25) faces.push({ poly, avgT: tSum / cycle.length });
      }
    }
  }
  return faces;
}

export function detectRooms(doc: ProjectDoc): DetectedRoom[] {
  const out: DetectedRoom[] = [];
  for (const level of doc.levels) {
    const walls = doc.walls.filter((w) => w.levelId === level.id);
    const faces = findFaces(walls);
    const labels = doc.rooms.filter((r) => r.levelId === level.id);
    const used = new Set<string>();
    // smaller faces first so nested labels bind to the tightest polygon
    faces.sort((m, n) => polygonArea(m.poly) - polygonArea(n.poly));
    let autoIdx = 1;
    for (const f of faces) {
      const area = polygonArea(f.poly);
      const perimeter = polygonPerimeter(f.poly);
      const label = labels.find((l) => !used.has(l.id) && pointInPolygon(l.point, f.poly));
      if (label) used.add(label.id);
      const center = label ? label.point : interiorPoint(f.poly);
      const ic = interiorPoint(f.poly);
      out.push({
        key: label ? label.id : `auto:${level.id}:${Math.round(ic.x * 10)}:${Math.round(ic.y * 10)}`,
        levelId: level.id,
        poly: f.poly,
        area,
        netArea: Math.max(0, area - (perimeter * f.avgT) / 2),
        perimeter,
        center,
        label,
        name: label?.name ?? `Room ${autoIdx++}`,
      });
    }
  }
  return out;
}

export function roomAt(rooms: DetectedRoom[], levelId: string, p: Vec2): DetectedRoom | undefined {
  let best: DetectedRoom | undefined;
  for (const r of rooms) {
    if (r.levelId !== levelId) continue;
    if (pointInPolygon(p, r.poly) && (!best || r.area < best.area)) best = r;
  }
  return best;
}

// Room on either side of a wall, sampled at its midpoint.
export function wallSideRooms(rooms: DetectedRoom[], w: Wall) {
  const mid = lerp2(w.a, w.b, 0.5);
  const d = sub(w.b, w.a);
  const l = Math.hypot(d.x, d.y) || 1;
  const n = { x: -d.y / l, y: d.x / l };
  const off = w.thickness / 2 + 0.05;
  return {
    L: roomAt(rooms, w.levelId, add(mid, mul(n, off))),
    R: roomAt(rooms, w.levelId, add(mid, mul(n, -off))),
  };
}

export { dist };
