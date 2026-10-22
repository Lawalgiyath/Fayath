import type { Gen } from './textures';
import { brushed, bricks, concrete, fabric, flat, grass, herringbone, marble, planks, plaster, seams, terrazzo, tiles } from './textures';

export type MatCategory =
  | 'Wood'
  | 'Stone'
  | 'Tile'
  | 'Concrete'
  | 'Masonry'
  | 'Paint'
  | 'Metal'
  | 'Fabric'
  | 'Glass'
  | 'Facade'
  | 'Landscape';

export interface MatDef {
  id: string;
  name: string;
  category: MatCategory;
  size: [number, number]; // meters covered by one texture repeat
  gen?: Gen;
  metalness?: number;
  normal?: number; // normal strength
  glass?: { color: string; opacity: number; roughness: number };
  cost: number; // per m2, project currency
  note?: string;
}

export const CATEGORIES: MatCategory[] = ['Wood', 'Stone', 'Tile', 'Concrete', 'Masonry', 'Paint', 'Metal', 'Fabric', 'Glass', 'Facade', 'Landscape'];

const sq = (m: number): [number, number] => [m, m];

export const LIBRARY: MatDef[] = [
  // Wood
  { id: 'oak-natural', name: 'European Oak, Natural', category: 'Wood', size: [1.8, 1.8], gen: planks({ light: '#c9a77c', dark: '#9c7449', rows: 9, perRow: 1, rough: 0.5 }), normal: 1.2, cost: 85 },
  { id: 'oak-white', name: 'White Oak, Limed', category: 'Wood', size: [1.8, 1.8], gen: planks({ light: '#ddcdb5', dark: '#b39f84', rows: 9, perRow: 1, rough: 0.55, variation: 0.1, seed: 4 }), normal: 1.1, cost: 95 },
  { id: 'walnut', name: 'American Black Walnut', category: 'Wood', size: [1.6, 1.6], gen: planks({ light: '#7b5539', dark: '#3f281a', rows: 8, perRow: 1, rough: 0.42, seed: 7 }), normal: 1.1, cost: 140 },
  { id: 'oak-smoked', name: 'Smoked Oak, Wide Plank', category: 'Wood', size: [2.4, 2.4], gen: planks({ light: '#6d5644', dark: '#3b2d23', rows: 8, perRow: 1, rough: 0.55, ring: 5, seed: 9 }), normal: 1.3, cost: 120 },
  { id: 'herringbone-oak', name: 'Herringbone Oak Parquet', category: 'Wood', size: sq(0.9), gen: herringbone({ light: '#c9a274', dark: '#94693f', ratio: 5 }), normal: 1.2, cost: 160 },
  { id: 'herringbone-walnut', name: 'Herringbone Walnut Parquet', category: 'Wood', size: sq(0.9), gen: herringbone({ light: '#7a5236', dark: '#3e2718', ratio: 5, seed: 3 }), normal: 1.2, cost: 210 },
  { id: 'ash-veneer', name: 'Ash Veneer', category: 'Wood', size: [1.2, 1.2], gen: planks({ light: '#e2d2b8', dark: '#c3a984', rows: 2, perRow: 1, rough: 0.4, gap: 0.001, ring: 9, seed: 13 }), normal: 0.6, cost: 70 },
  { id: 'ebonised-oak', name: 'Ebonised Oak', category: 'Wood', size: [1.2, 1.2], gen: planks({ light: '#3a3532', dark: '#1a1817', rows: 2, perRow: 1, rough: 0.45, gap: 0.001, seed: 17 }), normal: 0.8, cost: 110 },

  // Stone
  { id: 'carrara', name: 'Carrara Marble', category: 'Stone', size: sq(1.2), gen: marble({ base: '#ecebe7', vein: '#8e9196', vein2: '#b9bbbe', sharp: 16 }), normal: 0.3, cost: 260 },
  { id: 'calacatta', name: 'Calacatta Oro', category: 'Stone', size: sq(1.4), gen: marble({ base: '#f2eee6', vein: '#7f6a4e', vein2: '#c7b597', sharp: 10, scale: 1.5, seed: 5 }), normal: 0.3, cost: 480 },
  { id: 'nero-marquina', name: 'Nero Marquina', category: 'Stone', size: sq(1.2), gen: marble({ base: '#1d1d1f', vein: '#e9e7e2', vein2: '#58585a', sharp: 22, seed: 9 }), normal: 0.3, cost: 320 },
  { id: 'verde-alpi', name: 'Verde Alpi', category: 'Stone', size: sq(1.0), gen: marble({ base: '#24392f', vein: '#a9c2b2', vein2: '#3f5c4d', sharp: 9, scale: 3, seed: 21 }), normal: 0.3, cost: 380 },
  { id: 'travertine', name: 'Roman Travertine', category: 'Stone', size: [1.2, 1.2], gen: bricks({ colors: ['#d8c7aa', '#cdbb9c', '#e0d0b5'], mortar: '#cbbb9f', cols: 2, rows: 4, mortarW: 0.01, bond: 'running', stone: true, rough: 0.6, aspect: 2 }), normal: 0.7, cost: 190 },
  { id: 'limestone', name: 'Portland Limestone Ashlar', category: 'Stone', size: [1.8, 1.2], gen: bricks({ colors: ['#ddd6c6', '#d4ccba', '#e4ddcf'], mortar: '#c9c1b0', cols: 3, rows: 4, mortarW: 0.025, bond: 'third', stone: true, rough: 0.8, seed: 3, aspect: 2 }), normal: 0.9, cost: 230 },
  { id: 'terrazzo-venetian', name: 'Venetian Terrazzo', category: 'Stone', size: sq(0.8), gen: terrazzo({ base: '#e8e3da', chips: ['#9a8f84', '#c8bfb4', '#5d5853', '#b9876a', '#efe9e0'], density: 34, size: 0.24 }), normal: 0.1, cost: 210 },
  { id: 'terrazzo-terra', name: 'Terracotta Terrazzo', category: 'Stone', size: sq(0.8), gen: terrazzo({ base: '#d9b8a0', chips: ['#a5573a', '#f1e7da', '#7b3d27', '#e3c2a6'], density: 26, size: 0.28, seed: 8 }), normal: 0.1, cost: 220 },

  // Tile
  { id: 'subway-white', name: 'Gloss Subway, White', category: 'Tile', size: [0.6, 0.6], gen: tiles({ colors: ['#f3f1ec'], grout: '#cfcbc4', cols: 4, rows: 8, groutW: 0.05, pattern: 'offset', glaze: 0.15, rough: 0.08 }), normal: 0.8, cost: 75 },
  { id: 'zellige-green', name: 'Zellige, Bottle Green', category: 'Tile', size: [0.5, 0.5], gen: tiles({ colors: ['#2f5a48', '#264d3d', '#3a6a55'], grout: '#d7d2c7', cols: 5, rows: 5, groutW: 0.04, pattern: 'grid', glaze: 0.9, rough: 0.06, seed: 3 }), normal: 1.4, cost: 180 },
  { id: 'zellige-white', name: 'Zellige, Chalk', category: 'Tile', size: [0.5, 0.5], gen: tiles({ colors: ['#efebe2', '#e6e0d3', '#f5f1ea'], grout: '#d9d3c7', cols: 5, rows: 5, groutW: 0.04, pattern: 'grid', glaze: 0.8, rough: 0.06, seed: 6 }), normal: 1.4, cost: 170 },
  { id: 'porcelain-grey', name: 'Large Porcelain, Stone Grey', category: 'Tile', size: [1.2, 1.2], gen: tiles({ colors: ['#9b9890', '#a19e96'], grout: '#8a877f', cols: 2, rows: 2, groutW: 0.006, pattern: 'grid', glaze: 0.1, rough: 0.5, seed: 9 }), normal: 0.5, cost: 90 },
  { id: 'hex-cement', name: 'Hexagon Cement Tile', category: 'Tile', size: [0.6, 0.6], gen: tiles({ colors: ['#e9e4da', '#d8d1c3', '#3b3a38'], grout: '#bdb6a8', cols: 6, rows: 8, groutW: 0.06, pattern: 'hex', glaze: 0.05, rough: 0.7, seed: 11 }), normal: 0.6, cost: 130 },
  { id: 'checker-marble', name: 'Checkerboard Marble', category: 'Tile', size: [0.8, 0.8], gen: tiles({ colors: ['#ecebe5', '#2a2a2b'], grout: '#bcbab4', cols: 2, rows: 2, groutW: 0.004, pattern: 'checker', glaze: 0.1, rough: 0.15, seed: 2 }), normal: 0.3, cost: 260 },
  { id: 'terracotta-tile', name: 'Terracotta Quarry Tile', category: 'Tile', size: [0.9, 0.9], gen: tiles({ colors: ['#b0613f', '#a35736', '#bd6d48', '#9c4f30'], grout: '#c8b49b', cols: 3, rows: 3, groutW: 0.03, pattern: 'grid', glaze: 0.4, rough: 0.75, seed: 15 }), normal: 0.9, cost: 85 },

  // Concrete
  { id: 'concrete-polished', name: 'Polished Concrete', category: 'Concrete', size: sq(2.5), gen: concrete({ base: '#9d9b96', var: 0.14, pores: 0.002, rough: 0.28, polish: true }), normal: 0.25, cost: 70 },
  { id: 'concrete-raw', name: 'Raw Concrete', category: 'Concrete', size: sq(2.0), gen: concrete({ base: '#8f8d88', var: 0.2, pores: 0.01, rough: 0.85, seed: 3 }), normal: 0.8, cost: 55 },
  { id: 'concrete-board', name: 'Board-Formed Concrete', category: 'Concrete', size: [2.4, 1.2], gen: concrete({ base: '#8c8a85', var: 0.16, pores: 0.006, boards: 8, rough: 0.85, seed: 5 }), normal: 1.2, cost: 140 },
  { id: 'microcement', name: 'Microcement, Warm Grey', category: 'Concrete', size: sq(2.0), gen: plaster({ color: '#b1aaa0', var: 0.08, trowel: 0.6, rough: 0.55, seed: 7 }), normal: 0.4, cost: 110 },

  // Masonry
  { id: 'brick-london', name: 'London Stock Brick', category: 'Masonry', size: [0.9, 0.6], gen: bricks({ colors: ['#b6936a', '#a5815b', '#c2a07a', '#8f6f4f', '#9b7a58'], mortar: '#cfc6b6', cols: 4, rows: 8, mortarW: 0.13, bond: 'running' }), normal: 1.4, cost: 150 },
  { id: 'brick-red', name: 'Red Clay Brick', category: 'Masonry', size: [0.9, 0.6], gen: bricks({ colors: ['#9d4a34', '#8a3f2c', '#ad5840', '#7c3626'], mortar: '#c9bfae', cols: 4, rows: 8, mortarW: 0.13, bond: 'running', seed: 5 }), normal: 1.4, cost: 140 },
  { id: 'brick-manganese', name: 'Manganese Brick, Stack Bond', category: 'Masonry', size: [0.9, 0.6], gen: bricks({ colors: ['#3a3533', '#2e2a28', '#4a4441'], mortar: '#5a5551', cols: 4, rows: 8, mortarW: 0.1, bond: 'stack', seed: 9 }), normal: 1.2, cost: 180 },
  { id: 'brick-white', name: 'Painted Brick, White', category: 'Masonry', size: [0.9, 0.6], gen: bricks({ colors: ['#efece6', '#e9e5de'], mortar: '#e2ddd5', cols: 4, rows: 8, mortarW: 0.13, bond: 'flemish', seed: 12 }), normal: 1.3, cost: 120 },

  // Paint and plaster
  { id: 'paint-warm-white', name: 'Paint, Warm White', category: 'Paint', size: sq(2), gen: flat('#ece8e1', 0.9), normal: 0.15, cost: 18 },
  { id: 'paint-bone', name: 'Paint, Bone', category: 'Paint', size: sq(2), gen: flat('#ddd3c3', 0.9), normal: 0.15, cost: 18 },
  { id: 'paint-sage', name: 'Paint, Sage', category: 'Paint', size: sq(2), gen: flat('#a3ab95', 0.9), normal: 0.15, cost: 18 },
  { id: 'paint-clay', name: 'Paint, Clay', category: 'Paint', size: sq(2), gen: flat('#b98b6e', 0.9), normal: 0.15, cost: 18 },
  { id: 'paint-ink', name: 'Paint, Ink Blue', category: 'Paint', size: sq(2), gen: flat('#2c3442', 0.85), normal: 0.15, cost: 20 },
  { id: 'paint-charcoal', name: 'Paint, Charcoal', category: 'Paint', size: sq(2), gen: flat('#3a3937', 0.85), normal: 0.15, cost: 20 },
  { id: 'paint-ochre', name: 'Paint, Ochre', category: 'Paint', size: sq(2), gen: flat('#c4954b', 0.9), normal: 0.15, cost: 18 },
  { id: 'ceiling-white', name: 'Ceiling Flat White', category: 'Paint', size: sq(3), gen: flat('#f1efea', 0.95), normal: 0.1, cost: 14 },
  { id: 'limewash', name: 'Limewash, Stone', category: 'Paint', size: sq(2.5), gen: plaster({ color: '#d6cebf', var: 0.12, trowel: 0.9, rough: 0.92, seed: 4 }), normal: 0.35, cost: 45 },
  { id: 'venetian-plaster', name: 'Venetian Plaster', category: 'Paint', size: sq(2.5), gen: plaster({ color: '#c9bfae', var: 0.1, trowel: 1, rough: 0.3, seed: 8 }), normal: 0.25, cost: 95 },

  // Metal
  { id: 'brass-brushed', name: 'Brushed Brass', category: 'Metal', size: sq(0.5), gen: brushed({ color: '#b8935a', rough: 0.32 }), metalness: 1, normal: 0.2, cost: 420 },
  { id: 'steel-brushed', name: 'Brushed Stainless', category: 'Metal', size: sq(0.5), gen: brushed({ color: '#b9bbbd', rough: 0.3, seed: 3 }), metalness: 1, normal: 0.2, cost: 260 },
  { id: 'steel-black', name: 'Blackened Steel', category: 'Metal', size: sq(1), gen: brushed({ color: '#2b2b2c', rough: 0.45, streak: 2, seed: 5 }), metalness: 0.85, normal: 0.3, cost: 300 },
  { id: 'copper', name: 'Aged Copper', category: 'Metal', size: sq(0.6), gen: brushed({ color: '#a8694a', rough: 0.4, seed: 7 }), metalness: 1, normal: 0.2, cost: 520 },
  { id: 'chrome', name: 'Polished Chrome', category: 'Metal', size: sq(0.5), gen: brushed({ color: '#d4d6d8', rough: 0.06, streak: 0.2, seed: 9 }), metalness: 1, normal: 0.05, cost: 300 },
  { id: 'powder-black', name: 'Powder Coat, Matte Black', category: 'Metal', size: sq(0.5), gen: flat('#1f1f20', 0.6), metalness: 0.3, normal: 0.1, cost: 120 },

  // Fabric
  { id: 'linen-natural', name: 'Linen, Natural', category: 'Fabric', size: sq(0.25), gen: fabric({ color: '#cfc4b2', kind: 'linen' }), normal: 1, cost: 60 },
  { id: 'linen-charcoal', name: 'Linen, Charcoal', category: 'Fabric', size: sq(0.25), gen: fabric({ color: '#4a4846', kind: 'linen', seed: 3 }), normal: 1, cost: 60 },
  { id: 'boucle-ivory', name: 'Boucle, Ivory', category: 'Fabric', size: sq(0.25), gen: fabric({ color: '#e7e0d3', kind: 'boucle' }), normal: 1.6, cost: 120 },
  { id: 'velvet-moss', name: 'Velvet, Moss', category: 'Fabric', size: sq(0.6), gen: fabric({ color: '#55613f', kind: 'velvet' }), normal: 0.4, cost: 140 },
  { id: 'velvet-rust', name: 'Velvet, Rust', category: 'Fabric', size: sq(0.6), gen: fabric({ color: '#8f4a2c', kind: 'velvet', seed: 5 }), normal: 0.4, cost: 140 },
  { id: 'leather-cognac', name: 'Leather, Cognac', category: 'Fabric', size: sq(0.4), gen: fabric({ color: '#8a5530', kind: 'leather' }), normal: 0.9, cost: 220 },
  { id: 'leather-black', name: 'Leather, Black', category: 'Fabric', size: sq(0.4), gen: fabric({ color: '#232120', kind: 'leather', seed: 7 }), normal: 0.9, cost: 220 },
  { id: 'wool-oat', name: 'Wool Rug, Oat', category: 'Fabric', size: sq(0.5), gen: fabric({ color: '#bfb19a', kind: 'wool' }), normal: 1.2, cost: 90 },
  { id: 'wool-slate', name: 'Wool Rug, Slate', category: 'Fabric', size: sq(0.5), gen: fabric({ color: '#5b6066', kind: 'wool', seed: 5 }), normal: 1.2, cost: 90 },

  // Glass
  { id: 'glass-clear', name: 'Low-Iron Clear Glass', category: 'Glass', size: sq(1), glass: { color: '#e9f2f2', opacity: 0.14, roughness: 0.02 }, cost: 180 },
  { id: 'glass-bronze', name: 'Bronze Tinted Glass', category: 'Glass', size: sq(1), glass: { color: '#8a6e52', opacity: 0.45, roughness: 0.03 }, cost: 240 },
  { id: 'glass-frosted', name: 'Acid-Etched Glass', category: 'Glass', size: sq(1), glass: { color: '#eef1f1', opacity: 0.72, roughness: 0.5 }, cost: 220 },
  { id: 'glass-reeded', name: 'Fluted Glass', category: 'Glass', size: sq(1), glass: { color: '#dfe8e6', opacity: 0.58, roughness: 0.25 }, cost: 290 },

  // Facade
  { id: 'render-white', name: 'Lime Render, White', category: 'Facade', size: sq(3), gen: plaster({ color: '#ebe7df', var: 0.06, trowel: 0.3, rough: 0.92, seed: 21 }), normal: 0.4, cost: 65 },
  { id: 'render-sand', name: 'Lime Render, Sand', category: 'Facade', size: sq(3), gen: plaster({ color: '#d4c3a6', var: 0.08, trowel: 0.3, rough: 0.92, seed: 23 }), normal: 0.4, cost: 65 },
  { id: 'cedar-cladding', name: 'Cedar Cladding, Vertical', category: 'Facade', size: sq(1.5), gen: planks({ light: '#b07d52', dark: '#7a5233', rows: 10, perRow: 1, gap: 0.06, rough: 0.7, vertical: true, seed: 31 }), normal: 1.4, cost: 160 },
  { id: 'charred-timber', name: 'Charred Timber (Yakisugi)', category: 'Facade', size: sq(1.5), gen: planks({ light: '#2e2b29', dark: '#141313', rows: 10, perRow: 1, gap: 0.06, rough: 0.8, vertical: true, ring: 10, seed: 33 }), normal: 1.8, cost: 210 },
  { id: 'zinc-seam', name: 'Standing Seam Zinc', category: 'Facade', size: sq(2), gen: seams({ color: '#7e8487', panels: 4 }), metalness: 0.7, normal: 1.2, cost: 190 },
  { id: 'corten', name: 'Weathering Steel', category: 'Facade', size: sq(1.5), gen: concrete({ base: '#7d4529', var: 0.3, pores: 0.02, rough: 0.9, seed: 41 }), metalness: 0.2, normal: 0.6, cost: 260 },

  // Landscape
  { id: 'lawn', name: 'Lawn', category: 'Landscape', size: sq(3), gen: grass({ a: '#4a5f2c', b: '#6d7f3b' }), normal: 0.8, cost: 12 },
  { id: 'gravel', name: 'Pea Gravel', category: 'Landscape', size: sq(1), gen: terrazzo({ base: '#8d877c', chips: ['#c5beb1', '#a59e92', '#d7d1c6', '#787268'], density: 60, size: 0.42, seed: 51, rough: 0.9 }), normal: 1.2, cost: 25 },
  { id: 'pavers', name: 'Concrete Pavers', category: 'Landscape', size: sq(1.8), gen: tiles({ colors: ['#a7a39b', '#9c988f', '#b0aca4'], grout: '#6b675f', cols: 3, rows: 3, groutW: 0.02, pattern: 'grid', glaze: 0.2, rough: 0.85, seed: 61 }), normal: 0.8, cost: 60 },
  { id: 'decking', name: 'Hardwood Decking', category: 'Landscape', size: sq(2), gen: planks({ light: '#8d6a4b', dark: '#5d4430', rows: 14, perRow: 1, gap: 0.12, rough: 0.7, seed: 71 }), normal: 1.4, cost: 130 },
];

export const LIB_MAP = new Map(LIBRARY.map((m) => [m.id, m]));

export const DEFAULT_COST_RATES = Object.fromEntries(LIBRARY.map((m) => [m.id, m.cost]));
