// Tileable procedural noise primitives. All functions take coordinates in
// lattice units and an integer period so textures wrap seamlessly.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const mod = (a: number, m: number) => ((a % m) + m) % m;

export function vnoise(x: number, y: number, px: number, py: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = mod(xi, px);
  const y0 = mod(yi, py);
  const x1 = mod(xi + 1, px);
  const y1 = mod(yi + 1, py);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  const u = fade(xf);
  const v = fade(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// u, v in [0,1) texture space. freqX/freqY integer base frequencies.
export function fbm(u: number, v: number, fx: number, fy: number, oct: number, seed: number, gain = 0.5) {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < oct; o++) {
    const px = fx * f;
    const py = fy * f;
    sum += amp * vnoise(u * px, v * py, px, py, seed + o * 17);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

export function turbulence(u: number, v: number, fx: number, fy: number, oct: number, seed: number) {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < oct; o++) {
    const px = fx * f;
    const py = fy * f;
    sum += amp * Math.abs(vnoise(u * px, v * py, px, py, seed + o * 31) * 2 - 1);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// Periodic Worley (cellular) noise, returns distance to nearest and second nearest feature.
export function worley(u: number, v: number, cells: number, seed: number): [number, number, number] {
  const x = u * cells;
  const y = v * cells;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let d1 = 9;
  let d2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i;
      const cy = yi + j;
      const wx = mod(cx, cells);
      const wy = mod(cy, cells);
      const fx = cx + hash2(wx, wy, seed);
      const fy = cy + hash2(wx, wy, seed + 7);
      const d = Math.hypot(fx - x, fy - y);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = hash2(wx, wy, seed + 13);
      } else if (d < d2) d2 = d;
    }
  }
  return [d1, d2, id];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const wrap = mod;
