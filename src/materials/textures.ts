import { clamp01, fbm, hash2, hexToRgb, mixRgb, smooth, turbulence, vnoise, worley, wrap } from './noise';

export interface TexData {
  S: number;
  albedo: Uint8ClampedArray; // RGBA
  height: Float32Array; // 0..1
  rough: Float32Array; // 0..1
}

type RGB = [number, number, number];
export type Gen = (S: number) => TexData;

function make(S: number) {
  return { S, albedo: new Uint8ClampedArray(S * S * 4), height: new Float32Array(S * S), rough: new Float32Array(S * S) };
}

function put(t: TexData, i: number, c: RGB, h: number, r: number) {
  const o = i * 4;
  t.albedo[o] = c[0];
  t.albedo[o + 1] = c[1];
  t.albedo[o + 2] = c[2];
  t.albedo[o + 3] = 255;
  t.height[i] = h;
  t.rough[i] = r;
}

const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

// ---------- Wood planks ----------
export interface PlankOpts {
  light: string;
  dark: string;
  rows: number; // planks across the tile
  perRow: number; // planks along one row of the tile
  gap?: number; // fraction of plank width
  rough?: number;
  ring?: number; // ring density
  variation?: number;
  seed?: number;
  vertical?: boolean;
}

function woodGrain(u: number, v: number, seed: number, ring: number) {
  // u along grain, v across. Periodic in u (1) only within a plank, so use non-periodic large periods.
  const n = fbm(u * 0.999, v, 3, 9, 4, seed);
  const rings = Math.sin((v * ring + n * 4.5 + fbm(u, v, 1, 3, 2, seed + 5) * 2) * Math.PI * 2) * 0.5 + 0.5;
  const fine = vnoise(u * 160, v * 2400, 160, 2400, seed + 3);
  return clamp01(0.55 * Math.pow(rings, 2.2) + 0.3 * n + 0.15 * fine);
}

export const planks = (o: PlankOpts): Gen => (S) => {
  const t = make(S);
  const L = hexToRgb(o.light);
  const D = hexToRgb(o.dark);
  const seed = o.seed ?? 11;
  const gap = o.gap ?? 0.04;
  const variation = o.variation ?? 0.18;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let u = x / S;
      let v = y / S;
      if (o.vertical) [u, v] = [v, u];
      const row = Math.floor(v * o.rows);
      const rv = v * o.rows - row; // 0..1 across plank
      const off = hash2(row, 1, seed);
      const ru = wrap(u + off, 1) * o.perRow;
      const col = Math.floor(ru);
      const lu = ru - col; // 0..1 along plank
      const pid = hash2(row, col, seed + 2);
      const g = woodGrain(lu * 0.6 + pid * 7, rv + pid * 13, seed + Math.floor(pid * 50), (o.ring ?? 7) * (0.7 + pid * 0.6));
      const tone = 1 + (pid - 0.5) * variation * 2;
      let c = shade(mixRgb(L, D, g), tone);
      const edgeV = Math.min(rv, 1 - rv) / gap;
      const edgeU = (Math.min(lu, 1 - lu) * o.perRow * (1 / o.rows)) / gap * 0.25;
      const e = Math.min(edgeV, edgeU * 4);
      const groove = smooth(0, 1, e);
      c = shade(c, 0.55 + 0.45 * groove);
      put(t, y * S + x, c, 0.3 + 0.6 * groove - g * 0.08, clamp01((o.rough ?? 0.5) + (g - 0.5) * 0.15 + (1 - groove) * 0.3));
    }
  }
  return t;
};

// ---------- Herringbone parquet ----------
export const herringbone = (o: { light: string; dark: string; ratio: number; seed?: number; rough?: number }): Gen => (S) => {
  const t = make(S);
  const L = hexToRgb(o.light);
  const D = hexToRgb(o.dark);
  const n = o.ratio;
  const period = 2 * n; // in plank widths
  const seed = o.seed ?? 21;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = (x / S) * period;
      const py = (y / S) * period;
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      let along = 0;
      let across = 0;
      let id = 0;
      let found = false;
      for (let i = 0; i < n && !found; i++) {
        const A = cx - i + cy;
        const B = cx - i - cy;
        if (wrap(A, 2) === 0 && wrap(B, 2 * n) === 0) {
          along = (px - (cx - i)) / n;
          across = py - cy;
          id = hash2(wrap(cx - i, period), wrap(cy, period), seed);
          found = true;
        }
      }
      for (let j = 0; j < n && !found; j++) {
        const A = cx + cy - 1 - j;
        const B = cx - (cy - 1 - j);
        if (wrap(A, 2) === 0 && wrap(B, 2 * n) === 0) {
          const a = A / 2;
          const b = B / (2 * n);
          const y0 = a - n * b + 1;
          along = (py - y0) / n;
          across = px - cx;
          id = hash2(wrap(cx, period) + 99, wrap(cy - 1 - j, period), seed);
          found = true;
        }
      }
      const g = woodGrain(along * 0.5 + id * 5, across * 0.25 + id * 9, seed + Math.floor(id * 40), 4 + id * 4);
      let c = shade(mixRgb(L, D, g), 0.84 + id * 0.32);
      const eA = Math.min(along, 1 - along) * n * 12;
      const eB = Math.min(across, 1 - across) * 12;
      const groove = smooth(0, 1, Math.min(eA, eB));
      c = shade(c, 0.6 + 0.4 * groove);
      put(t, y * S + x, c, 0.35 + 0.6 * groove, clamp01((o.rough ?? 0.45) + (1 - groove) * 0.3));
    }
  }
  return t;
};

// ---------- Marble ----------
export const marble = (o: { base: string; vein: string; vein2?: string; sharp?: number; scale?: number; seed?: number; rough?: number }): Gen => (S) => {
  const t = make(S);
  const B = hexToRgb(o.base);
  const V = hexToRgb(o.vein);
  const V2 = hexToRgb(o.vein2 ?? o.vein);
  const seed = o.seed ?? 31;
  const sc = o.scale ?? 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const tb = turbulence(u, v, 2 * sc, 2 * sc, 6, seed);
      const w = fbm(u, v, sc, sc, 4, seed + 9);
      const s1 = 1 - Math.abs(Math.sin((u * sc + v * sc * 0.6 + tb * 2.6) * Math.PI));
      const s2 = 1 - Math.abs(Math.sin((u * sc * 2 - v * sc + w * 3.2) * Math.PI * 1.0));
      const vein = Math.pow(s1, o.sharp ?? 14);
      const vein2 = Math.pow(s2, (o.sharp ?? 14) * 2.5) * 0.6;
      const cloud = fbm(u, v, 4 * sc, 4 * sc, 4, seed + 4);
      let c = mixRgb(B, shade(B, 0.92), cloud);
      c = mixRgb(c, V2, clamp01(vein2));
      c = mixRgb(c, V, clamp01(vein));
      put(t, y * S + x, c, 0.5 + cloud * 0.05, clamp01((o.rough ?? 0.12) + vein * 0.08));
    }
  }
  return t;
};

// ---------- Terrazzo ----------
export const terrazzo = (o: { base: string; chips: string[]; density: number; size: number; seed?: number; rough?: number }): Gen => (S) => {
  const t = make(S);
  const B = hexToRgb(o.base);
  const chips = o.chips.map(hexToRgb);
  const seed = o.seed ?? 41;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const n = fbm(u, v, 8, 8, 3, seed);
      let c = shade(B, 0.95 + n * 0.1);
      const cells = Math.round(o.density);
      const [d1, d2, id] = worley(u, v, cells, seed + 3);
      const jag = vnoise(u * 90, v * 90, 90, 90, seed + 8) * 0.12;
      const r = o.size * (0.5 + hash2(Math.floor(id * 1000), 3, seed) * 0.8);
      if (d1 + jag < r && d2 - d1 > 0.05) {
        const cc = chips[Math.floor(id * chips.length) % chips.length];
        c = shade(cc, 0.9 + hash2(Math.floor(id * 977), 1, seed) * 0.2);
      }
      put(t, y * S + x, c, 0.5, o.rough ?? 0.22);
    }
  }
  return t;
};

// ---------- Concrete ----------
export const concrete = (o: { base: string; var?: number; pores?: number; boards?: number; seed?: number; rough?: number; polish?: boolean }): Gen => (S) => {
  const t = make(S);
  const B = hexToRgb(o.base);
  const seed = o.seed ?? 51;
  const vv = o.var ?? 0.18;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const n = fbm(u, v, 3, 3, 6, seed);
      const m = fbm(u, v, 24, 24, 3, seed + 2);
      let k = 1 + (n - 0.5) * vv * 2 + (m - 0.5) * 0.06;
      let h = 0.5 + (n - 0.5) * 0.2;
      if (o.boards) {
        const bv = v * o.boards;
        const row = Math.floor(bv);
        const lv = bv - row;
        const tone = hash2(row, 5, seed);
        k *= 0.92 + tone * 0.14;
        const grain = fbm(u * 0.999, lv, 2, 14, 4, seed + row * 3);
        k *= 0.94 + grain * 0.1;
        const seam = smooth(0, 0.03, Math.min(lv, 1 - lv));
        k *= 0.82 + seam * 0.18;
        h = h * 0.6 + grain * 0.3 + seam * 0.1;
      }
      const pore = hash2(Math.floor(u * S * 0.5), Math.floor(v * S * 0.5), seed + 9);
      if (pore > 1 - (o.pores ?? 0.004)) {
        k *= 0.55;
        h -= 0.3;
      }
      put(t, y * S + x, shade(B, k), h, clamp01((o.rough ?? 0.75) + (n - 0.5) * 0.2 - (o.polish ? m * 0.1 : 0)));
    }
  }
  return t;
};

// ---------- Brick / blocks ----------
export interface BrickOpts {
  colors: string[];
  mortar: string;
  cols: number; // bricks across tile
  rows: number; // courses down tile
  mortarW: number; // fraction of course height
  bond: 'running' | 'stack' | 'flemish' | 'third';
  seed?: number;
  rough?: number;
  stone?: boolean;
  aspect?: number; // brick length / course height
}

export const bricks = (o: BrickOpts): Gen => (S) => {
  const t = make(S);
  const cols = o.colors.map(hexToRgb);
  const M = hexToRgb(o.mortar);
  const seed = o.seed ?? 61;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const rowF = v * o.rows;
      const row = Math.floor(rowF);
      const lv = rowF - row;
      let shift = 0;
      if (o.bond === 'running') shift = row % 2 ? 0.5 : 0;
      else if (o.bond === 'third') shift = (row % 3) / 3;
      let colF = u * o.cols + shift;
      let cw = 1;
      if (o.bond === 'flemish') {
        // alternate stretcher (1) and header (0.5)
        const unit = u * o.cols * (2 / 1.5) + (row % 2 ? 0.75 : 0);
        const k = Math.floor(unit / 1.5);
        const r = unit - k * 1.5;
        colF = k * 2 + (r < 1 ? r : 1 + (r - 1) * 2);
        cw = 1;
      }
      const col = Math.floor(colF / cw);
      const lu = colF / cw - col;
      const bid = hash2(wrap(col, o.cols * 4), row, seed);
      const base = cols[Math.floor(bid * cols.length) % cols.length];
      const n = fbm(u, v, 16, 16, 4, seed + 3);
      const mwU = o.mortarW / (o.aspect ?? 3);
      const ex = Math.min(lu, 1 - lu) / Math.max(1e-3, mwU);
      const ey = Math.min(lv, 1 - lv) / o.mortarW;
      const e = Math.min(ex, ey);
      const inBrick = smooth(0.8, 1.6, e);
      const face = o.stone ? 0.85 + n * 0.3 : 0.82 + n * 0.25 + (bid - 0.5) * 0.18;
      const brickC = shade(base, face);
      const mortarC = shade(M, 0.9 + n * 0.2);
      const c = mixRgb(mortarC, brickC, inBrick);
      const chip = vnoise(u * 120, v * 120, 120, 120, seed + 5);
      put(t, y * S + x, c, inBrick * (0.75 + chip * 0.25), clamp01((o.rough ?? 0.85) + (1 - inBrick) * 0.1));
    }
  }
  return t;
};

// ---------- Tiles ----------
export interface TileOpts {
  colors: string[];
  grout: string;
  cols: number;
  rows: number;
  groutW: number; // fraction of tile height
  pattern: 'grid' | 'offset' | 'hex' | 'checker';
  glaze?: number; // color variation and surface waviness (zellige)
  rough?: number;
  seed?: number;
}

export const tiles = (o: TileOpts): Gen => (S) => {
  const t = make(S);
  const cols = o.colors.map(hexToRgb);
  const G = hexToRgb(o.grout);
  const seed = o.seed ?? 71;
  const glaze = o.glaze ?? 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      let e = 0;
      let id = 0;
      let lu = 0;
      let lv = 0;
      let cidx = 0;
      if (o.pattern === 'hex') {
        // pointy hex grid; cols across, rows = cols * 2/sqrt3 rounded by caller
        const sx = u * o.cols;
        const sy = v * o.rows * 0.866;
        const r = 0.5;
        const q = (sx * Math.sqrt(3)) / 3 / r - sy / 3 / r;
        const rr = (sy * 2) / 3 / r;
        let cx = Math.round(q);
        let cz = Math.round(rr);
        let cy = Math.round(-q - rr);
        const dx = Math.abs(cx - q);
        const dz = Math.abs(cz - rr);
        const dy = Math.abs(cy + q + rr);
        if (dx > dy && dx > dz) cx = -cy - cz;
        else if (dy > dz) cy = -cx - cz;
        else cz = -cx - cy;
        const hx = r * Math.sqrt(3) * (cx + cz / 2);
        const hy = r * 1.5 * cz;
        const px = sx - hx;
        const py = sy - hy;
        const ax = Math.abs(px);
        const ay = Math.abs(py);
        const dist = Math.max(ax * 0.866 + ay * 0.5, ay);
        e = (0.5 * 0.866 * 1.0 - dist * 1.0) / (o.groutW * 0.5);
        id = hash2(wrap(cx, 97), wrap(cz, 97), seed);
        lu = px + 0.5;
        lv = py + 0.5;
        cidx = Math.floor(id * cols.length);
      } else {
        const rowF = v * o.rows;
        const row = Math.floor(rowF);
        lv = rowF - row;
        const shift = o.pattern === 'offset' && row % 2 ? 0.5 : 0;
        const colF = u * o.cols + shift;
        const col = Math.floor(colF);
        lu = colF - col;
        const aspect = o.cols / o.rows;
        e = Math.min(Math.min(lu, 1 - lu) / (o.groutW * aspect), Math.min(lv, 1 - lv) / o.groutW);
        id = hash2(wrap(col, o.cols * 2), row, seed);
        cidx = o.pattern === 'checker' ? (wrap(col, 2) + row) % 2 : Math.floor(id * cols.length);
      }
      const inTile = smooth(0.7, 1.4, e);
      const base = cols[cidx % cols.length];
      const n = fbm(u, v, 8, 8, 3, seed + 1);
      const wav = glaze > 0 ? fbm(lu * 0.999, lv * 0.999, 3, 3, 3, seed + Math.floor(id * 100)) : 0.5;
      const k = 1 + (id - 0.5) * glaze * 0.6 + (wav - 0.5) * glaze * 0.5 + (n - 0.5) * 0.04;
      const tileC = shade(base, k);
      const c = mixRgb(shade(G, 0.95 + n * 0.1), tileC, inTile);
      const edgeRound = smooth(0.7, 3, e);
      put(t, y * S + x, c, inTile * (0.6 + 0.3 * edgeRound + (wav - 0.5) * glaze * 0.6), clamp01(inTile > 0.5 ? (o.rough ?? 0.2) : 0.9));
    }
  }
  return t;
};

// ---------- Plaster / paint ----------
export const plaster = (o: { color: string; var?: number; seed?: number; rough?: number; trowel?: number }): Gen => (S) => {
  const t = make(S);
  const C = hexToRgb(o.color);
  const seed = o.seed ?? 81;
  const vv = o.var ?? 0.04;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const n = fbm(u, v, 3, 3, 5, seed);
      const tr = o.trowel ? turbulence(u, v, 4, 6, 4, seed + 2) : 0;
      const k = 1 + (n - 0.5) * vv * 2 + (tr - 0.4) * (o.trowel ?? 0) * 0.3;
      const fine = vnoise(u * 256, v * 256, 256, 256, seed + 5);
      put(t, y * S + x, shade(C, k), 0.5 + fine * 0.08 + tr * (o.trowel ?? 0) * 0.2, clamp01((o.rough ?? 0.9) - tr * (o.trowel ?? 0) * 0.3));
    }
  }
  return t;
};

// ---------- Metal ----------
export const brushed = (o: { color: string; streak?: number; seed?: number; rough?: number }): Gen => (S) => {
  const t = make(S);
  const C = hexToRgb(o.color);
  const seed = o.seed ?? 91;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const s = vnoise(u * 4, v * 512, 4, 512, seed) * 0.6 + vnoise(u * 16, v * 1024, 16, 1024, seed + 1) * 0.4;
      const n = fbm(u, v, 3, 3, 3, seed + 2);
      const k = 0.92 + s * 0.12 * (o.streak ?? 1) + (n - 0.5) * 0.06;
      put(t, y * S + x, shade(C, k), 0.5 + s * 0.06, clamp01((o.rough ?? 0.35) + (s - 0.5) * 0.15));
    }
  }
  return t;
};

// ---------- Fabrics ----------
export const fabric = (o: { color: string; kind: 'linen' | 'boucle' | 'velvet' | 'leather' | 'wool'; scale?: number; seed?: number }): Gen => (S) => {
  const t = make(S);
  const C = hexToRgb(o.color);
  const seed = o.seed ?? 101;
  const sc = o.scale ?? 1;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      let h = 0.5;
      let k = 1;
      let r = 0.9;
      if (o.kind === 'linen') {
        const f = Math.round(96 * sc);
        const wx = Math.sin(u * f * Math.PI * 2) * 0.5 + 0.5;
        const wy = Math.sin(v * f * Math.PI * 2) * 0.5 + 0.5;
        const slub = fbm(u, v, 2, 48, 3, seed);
        const slub2 = fbm(u, v, 48, 2, 3, seed + 1);
        const over = (Math.floor(u * f) + Math.floor(v * f)) % 2 ? wx : wy;
        h = over * 0.6 + slub * 0.2 + slub2 * 0.2;
        k = 0.86 + h * 0.2 + (slub - 0.5) * 0.12;
        r = 0.92;
      } else if (o.kind === 'boucle') {
        const [d1, , id] = worley(u, v, Math.round(48 * sc), seed);
        const [e1] = worley(u, v, Math.round(110 * sc), seed + 3);
        h = clamp01(1 - d1 * 1.2) * 0.6 + clamp01(1 - e1) * 0.4;
        k = 0.78 + h * 0.3 + (id - 0.5) * 0.06;
        r = 0.95;
      } else if (o.kind === 'velvet') {
        const n = fbm(u, v, 4, 4, 5, seed);
        const crush = turbulence(u, v, 3, 3, 4, seed + 2);
        h = 0.5 + n * 0.05;
        k = 0.8 + n * 0.25 + crush * 0.2;
        r = 0.7 + crush * 0.2;
      } else if (o.kind === 'leather') {
        const [d1, d2] = worley(u, v, Math.round(40 * sc), seed);
        const crease = smooth(0, 0.08, d2 - d1);
        const n = fbm(u, v, 6, 6, 4, seed + 4);
        h = crease * 0.7 + n * 0.3;
        k = 0.8 + crease * 0.15 + n * 0.15;
        r = 0.45 + (1 - crease) * 0.2;
      } else {
        const n = fbm(u, v, 64, 64, 3, seed);
        const m = fbm(u, v, 6, 6, 3, seed + 1);
        h = n;
        k = 0.82 + n * 0.25 + (m - 0.5) * 0.1;
        r = 0.98;
      }
      put(t, y * S + x, shade(C, k), h, r);
    }
  }
  return t;
};

// ---------- Ground ----------
export const grass = (o: { a: string; b: string; seed?: number }): Gen => (S) => {
  const t = make(S);
  const A = hexToRgb(o.a);
  const B = hexToRgb(o.b);
  const seed = o.seed ?? 111;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const n = fbm(u, v, 4, 4, 5, seed);
      const blade = vnoise(u * 300, v * 300, 300, 300, seed + 1);
      const c = shade(mixRgb(A, B, n), 0.75 + blade * 0.45);
      put(t, y * S + x, c, blade, 0.95);
    }
  }
  return t;
};

// ---------- Standing seam metal ----------
export const seams = (o: { color: string; panels: number; seed?: number }): Gen => (S) => {
  const t = make(S);
  const C = hexToRgb(o.color);
  const seed = o.seed ?? 121;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const p = u * o.panels;
      const lp = p - Math.floor(p);
      const rib = Math.exp(-Math.pow((lp - 0.5) * 40, 2));
      const n = fbm(u, v, 3, 3, 4, seed);
      const pid = hash2(Math.floor(p), 1, seed);
      const k = 0.9 + n * 0.12 + (pid - 0.5) * 0.06 + rib * 0.15;
      put(t, y * S + x, shade(C, k), 0.4 + rib * 0.6, 0.45 - rib * 0.1);
    }
  }
  return t;
};

export const flat = (color: string, rough = 0.6): Gen => plaster({ color, var: 0.015, rough });
