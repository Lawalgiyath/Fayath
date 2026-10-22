import type { Vec2, Wall } from './types';
import { add, closestOnSegment, cross, dist, dot, len, lineIntersect, mul, norm, perp, sub, angleOf } from './geometry';

export interface WallFootprint {
  wall: Wall;
  d: Vec2; // unit direction a->b
  n: Vec2; // unit left normal
  length: number;
  aL: Vec2;
  aR: Vec2;
  bL: Vec2;
  bR: Vec2;
  uL0: number;
  uL1: number;
  uR0: number;
  uR1: number;
  freeA: boolean;
  freeB: boolean;
}

export interface NodeCap {
  levelId: string;
  p: Vec2;
  poly: Vec2[];
  height: number;
}

export const nodeKey = (levelId: string, p: Vec2) => `${levelId}|${Math.round(p.x * 1000)}|${Math.round(p.y * 1000)}`;

interface End {
  wall: Wall;
  atA: boolean;
  p: Vec2;
  dir: Vec2;
  n: Vec2;
  ang: number;
  L?: Vec2;
  R?: Vec2;
  trimmed?: boolean;
}

export function solveWalls(walls: Wall[]): { footprints: Map<string, WallFootprint>; caps: NodeCap[] } {
  const nodes = new Map<string, End[]>();
  for (const w of walls) {
    const d = norm(sub(w.b, w.a));
    if (len(sub(w.b, w.a)) < 1e-4) continue;
    const ea: End = { wall: w, atA: true, p: w.a, dir: d, n: perp(d), ang: angleOf(d) };
    const db = mul(d, -1);
    const eb: End = { wall: w, atA: false, p: w.b, dir: db, n: perp(db), ang: angleOf(db) };
    for (const e of [ea, eb]) {
      const k = nodeKey(w.levelId, e.p);
      const arr = nodes.get(k);
      if (arr) arr.push(e);
      else nodes.set(k, [e]);
    }
  }

  const caps: NodeCap[] = [];

  for (const ends of nodes.values()) {
    const p = ends[0].p;
    if (ends.length === 1) {
      const e = ends[0];
      const ht = e.wall.thickness / 2;
      e.L = add(p, mul(e.n, ht));
      e.R = add(p, mul(e.n, -ht));
      // T junction: end touching the body of another wall gets trimmed to that wall's face.
      for (const o of walls) {
        if (o === e.wall || o.levelId !== e.wall.levelId) continue;
        const c = closestOnSegment(p, o.a, o.b);
        const ol = dist(o.a, o.b);
        if (c.d > Math.max(0.002, o.thickness * 0.1) || c.t * ol < 0.01 || (1 - c.t) * ol < 0.01) continue;
        const od = norm(sub(o.b, o.a));
        const on = perp(od);
        // the stem body lies opposite to its outgoing direction
        const body = mul(e.dir, -1);
        const side = dot(body, on) >= 0 ? 1 : -1;
        const faceP = add(o.a, mul(on, (side * o.thickness) / 2));
        const L = lineIntersect(e.L, e.dir, faceP, od);
        const R = lineIntersect(e.R, e.dir, faceP, od);
        if (L && R && dist(L, p) < o.thickness * 3 + e.wall.thickness * 3) {
          e.L = L;
          e.R = R;
          e.trimmed = true;
        }
        break;
      }
      continue;
    }
    ends.sort((m, n) => m.ang - n.ang);
    const k = ends.length;
    for (let i = 0; i < k; i++) {
      const ei = ends[i];
      const ej = ends[(i + 1) % k];
      const pi = add(p, mul(ei.n, ei.wall.thickness / 2));
      const pj = add(p, mul(ej.n, -ej.wall.thickness / 2));
      let X = lineIntersect(pi, ei.dir, pj, ej.dir);
      const limit = 3 * Math.max(ei.wall.thickness, ej.wall.thickness);
      // reject miters that run too far (near-collinear or very acute joints)
      if (X && dist(X, p) > limit) X = null;
      if (X) {
        ei.L = X;
        ej.R = X;
      } else {
        ei.L = pi;
        ej.R = pj;
      }
    }
    if (k >= 3) {
      const pts: Vec2[] = [];
      for (const e of ends) {
        pts.push(e.L!, e.R!);
      }
      const uniq: Vec2[] = [];
      for (const q of pts) if (!uniq.some((u) => dist(u, q) < 1e-4)) uniq.push(q);
      uniq.sort((m, n) => angleOf(sub(m, p)) - angleOf(sub(n, p)));
      caps.push({
        levelId: ends[0].wall.levelId,
        p,
        poly: uniq,
        height: Math.min(...ends.map((e) => e.wall.height)),
      });
    }
  }

  const footprints = new Map<string, WallFootprint>();
  const endMap = new Map<string, { A?: End; B?: End }>();
  for (const ends of nodes.values()) {
    for (const e of ends) {
      const m = endMap.get(e.wall.id) ?? {};
      if (e.atA) m.A = e;
      else m.B = e;
      endMap.set(e.wall.id, m);
    }
  }
  for (const w of walls) {
    const m = endMap.get(w.id);
    if (!m || !m.A || !m.B) continue;
    const d = norm(sub(w.b, w.a));
    const n = perp(d);
    const length = dist(w.a, w.b);
    const aL = m.A.L!;
    const aR = m.A.R!;
    const bR = m.B.L!;
    const bL = m.B.R!;
    const u = (q: Vec2) => dot(sub(q, w.a), d);
    footprints.set(w.id, {
      wall: w,
      d,
      n,
      length,
      aL,
      aR,
      bL,
      bR,
      uL0: u(aL),
      uL1: u(bL),
      uR0: u(aR),
      uR1: u(bR),
      freeA: nodes.get(nodeKey(w.levelId, w.a))!.length === 1 && !m.A.trimmed,
      freeB: nodes.get(nodeKey(w.levelId, w.b))!.length === 1 && !m.B.trimmed,
    });
  }
  return { footprints, caps };
}

export function footprintPolygon(f: WallFootprint): Vec2[] {
  return [f.aR, f.bR, f.bL, f.aL];
}
