import * as THREE from 'three';
import type { SceneObject } from '../core/types';
import { matManager } from '../materials/manager';

export interface CatalogItemDef {
  key: string;
  name: string;
  category: 'Living' | 'Dining' | 'Bedroom' | 'Kitchen' | 'Bathroom' | 'Office' | 'Decor';
  defaultDims: { w: number; d: number; h: number };
  materialSlots: { slot: string; label: string; defaultMat: string }[];
  createGeometry: (obj: SceneObject) => THREE.Group;
}

export const CATALOG: CatalogItemDef[] = [
  // 1. SECTIONAL SOFA
  {
    key: 'sofa-sectional',
    name: 'Modular Sectional Sofa',
    category: 'Living',
    defaultDims: { w: 2.8, d: 1.8, h: 0.78 },
    materialSlots: [
      { slot: 'primary', label: 'Upholstery', defaultMat: 'boucle-ivory' },
      { slot: 'base', label: 'Base Plinth', defaultMat: 'oak-smoked' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const primaryMat = matManager.getMaterial(obj.materials['primary'] || 'boucle-ivory');
      const baseMat = matManager.getMaterial(obj.materials['base'] || 'oak-smoked');

      const { w = 2.8, d = 1.8, h = 0.78 } = obj.params;

      // Base plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d * 0.95), baseMat);
      plinth.position.set(0, 0.04, 0);
      plinth.castShadow = true;
      g.add(plinth);

      // Main seat block
      const mainSeatW = w * 0.65;
      const mainSeatD = d * 0.55;
      const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(mainSeatW, 0.35, mainSeatD), primaryMat);
      seatMesh.position.set(-w / 2 + mainSeatW / 2, 0.08 + 0.175, -d / 2 + mainSeatD / 2);
      seatMesh.castShadow = true;
      g.add(seatMesh);

      // Chaise lounge extension
      const chaiseW = w - mainSeatW;
      const chaiseMesh = new THREE.Mesh(new THREE.BoxGeometry(chaiseW, 0.35, d), primaryMat);
      chaiseMesh.position.set(w / 2 - chaiseW / 2, 0.08 + 0.175, 0);
      chaiseMesh.castShadow = true;
      g.add(chaiseMesh);

      // Backrest
      const backH = h - 0.08;
      const backMesh = new THREE.Mesh(new THREE.BoxGeometry(w, backH, 0.25), primaryMat);
      backMesh.position.set(0, 0.08 + backH / 2, -d / 2 + 0.125);
      backMesh.castShadow = true;
      g.add(backMesh);

      // Left Armrest
      const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, mainSeatD), primaryMat);
      armMesh.position.set(-w / 2 + 0.11, 0.08 + 0.29, -d / 2 + mainSeatD / 2);
      armMesh.castShadow = true;
      g.add(armMesh);

      return g;
    },
  },

  // 2. LOUNGE CHAIR
  {
    key: 'lounge-chair',
    name: 'Architectural Lounge Chair',
    category: 'Living',
    defaultDims: { w: 0.85, d: 0.9, h: 0.74 },
    materialSlots: [
      { slot: 'primary', label: 'Seat & Back', defaultMat: 'leather-cognac' },
      { slot: 'frame', label: 'Tubular Frame', defaultMat: 'brass-brushed' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const primaryMat = matManager.getMaterial(obj.materials['primary'] || 'leather-cognac');
      const frameMat = matManager.getMaterial(obj.materials['frame'] || 'brass-brushed');
      const { w = 0.85, d = 0.9, h = 0.74 } = obj.params;

      // Cantilever frame
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, h * 0.8, 16), frameMat);
      legL.position.set(-w / 2 + 0.05, h * 0.4, -d / 4);
      const legR = legL.clone();
      legR.position.x = w / 2 - 0.05;
      g.add(legL, legR);

      // Slanted seat cushion
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.12, d * 0.65), primaryMat);
      seat.rotation.x = 0.12;
      seat.position.set(0, 0.38, 0.05);
      seat.castShadow = true;

      // Tilted back cushion
      const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.12, d * 0.6), primaryMat);
      back.rotation.x = -1.25;
      back.position.set(0, 0.58, -d * 0.25);
      back.castShadow = true;

      g.add(seat, back);
      return g;
    },
  },

  // 3. LOW MARBLE COFFEE TABLE
  {
    key: 'coffee-table-marble',
    name: 'Monolithic Low Table',
    category: 'Living',
    defaultDims: { w: 1.4, d: 0.8, h: 0.34 },
    materialSlots: [
      { slot: 'primary', label: 'Slab Material', defaultMat: 'calacatta' },
      { slot: 'base', label: 'Base', defaultMat: 'steel-black' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const primaryMat = matManager.getMaterial(obj.materials['primary'] || 'calacatta');
      const baseMat = matManager.getMaterial(obj.materials['base'] || 'steel-black');
      const { w = 1.4, d = 0.8, h = 0.34 } = obj.params;

      // Top slab
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), primaryMat);
      top.position.set(0, h - 0.025, 0);
      top.castShadow = true;
      g.add(top);

      // Cross pedestal base
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h - 0.05, 0.06), baseMat);
      b1.position.set(0, (h - 0.05) / 2, 0);
      b1.castShadow = true;
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, h - 0.05, d * 0.6), baseMat);
      b2.position.set(0, (h - 0.05) / 2, 0);
      b2.castShadow = true;

      g.add(b1, b2);
      return g;
    },
  },

  // 4. SOLID DINING TABLE
  {
    key: 'dining-table-oak',
    name: 'Solid Plank Dining Table',
    category: 'Dining',
    defaultDims: { w: 2.4, d: 1.0, h: 0.75 },
    materialSlots: [
      { slot: 'primary', label: 'Table Top', defaultMat: 'oak-natural' },
      { slot: 'legs', label: 'Legs', defaultMat: 'oak-natural' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const topMat = matManager.getMaterial(obj.materials['primary'] || 'oak-natural');
      const legMat = matManager.getMaterial(obj.materials['legs'] || 'oak-natural');
      const { w = 2.4, d = 1.0, h = 0.75 } = obj.params;

      // Tabletop
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, d), topMat);
      top.position.set(0, h - 0.0225, 0);
      top.castShadow = true;
      g.add(top);

      // 4 heavy square timber legs
      const legW = 0.09;
      const legH = h - 0.045;
      const legGeo = new THREE.BoxGeometry(legW, legH, legW);
      const xOff = w / 2 - legW / 2 - 0.08;
      const zOff = d / 2 - legW / 2 - 0.08;

      [
        [-xOff, -zOff],
        [xOff, -zOff],
        [-xOff, zOff],
        [xOff, zOff],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(lx, legH / 2, lz);
        leg.castShadow = true;
        g.add(leg);
      });

      return g;
    },
  },

  // 5. DINING CHAIR
  {
    key: 'dining-chair',
    name: 'Minimalist Dining Chair',
    category: 'Dining',
    defaultDims: { w: 0.52, d: 0.54, h: 0.8 },
    materialSlots: [
      { slot: 'seat', label: 'Upholstery', defaultMat: 'linen-natural' },
      { slot: 'frame', label: 'Wood Frame', defaultMat: 'oak-natural' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const seatMat = matManager.getMaterial(obj.materials['seat'] || 'linen-natural');
      const frameMat = matManager.getMaterial(obj.materials['frame'] || 'oak-natural');
      const { w = 0.52, d = 0.54, h = 0.8 } = obj.params;

      // Seat cushion
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.06, d * 0.85), seatMat);
      seat.position.set(0, 0.45, 0);
      seat.castShadow = true;
      g.add(seat);

      // Curved/curvilinear backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.18, 0.03), frameMat);
      back.position.set(0, h - 0.09, -d / 2 + 0.04);
      back.castShadow = true;
      g.add(back);

      // Legs
      const legGeo = new THREE.CylinderGeometry(0.016, 0.012, 0.45, 12);
      const xO = w / 2 - 0.05;
      const zO = d / 2 - 0.06;
      [
        [-xO, -zO],
        [xO, -zO],
        [-xO, zO],
        [xO, zO],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, frameMat);
        leg.position.set(lx, 0.225, lz);
        leg.castShadow = true;
        g.add(leg);
      });

      return g;
    },
  },

  // 6. KING PLATFORM BED
  {
    key: 'platform-bed',
    name: 'Low Platform King Bed',
    category: 'Bedroom',
    defaultDims: { w: 2.2, d: 2.3, h: 0.95 },
    materialSlots: [
      { slot: 'frame', label: 'Platform Frame', defaultMat: 'oak-smoked' },
      { slot: 'linen', label: 'Bedding Linen', defaultMat: 'linen-natural' },
      { slot: 'headboard', label: 'Headboard Fabric', defaultMat: 'boucle-ivory' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const frameMat = matManager.getMaterial(obj.materials['frame'] || 'oak-smoked');
      const linenMat = matManager.getMaterial(obj.materials['linen'] || 'linen-natural');
      const headMat = matManager.getMaterial(obj.materials['headboard'] || 'boucle-ivory');
      const { w = 2.2, d = 2.3, h = 0.95 } = obj.params;

      // Platform plinth
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), frameMat);
      base.position.set(0, 0.1, 0);
      base.castShadow = true;
      g.add(base);

      // Mattress
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 2.0), linenMat);
      mattress.position.set(0, 0.2 + 0.14, 0.05);
      mattress.castShadow = true;
      g.add(mattress);

      // Folded duvet overlay
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.12, 1.4), linenMat);
      duvet.position.set(0, 0.2 + 0.28 + 0.05, 0.35);
      duvet.castShadow = true;
      g.add(duvet);

      // Pillows (2 pairs)
      const pillowMat = matManager.getMaterial('boucle-ivory');
      const pillowGeo = new THREE.BoxGeometry(0.7, 0.14, 0.45);
      const p1 = new THREE.Mesh(pillowGeo, pillowMat);
      p1.position.set(-0.45, 0.52, -0.65);
      p1.rotation.x = 0.2;
      const p2 = p1.clone();
      p2.position.x = 0.45;
      g.add(p1, p2);

      // High upholstered headboard
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, h - 0.2, 0.14), headMat);
      headboard.position.set(0, (h - 0.2) / 2 + 0.2, -d / 2 + 0.07);
      headboard.castShadow = true;
      g.add(headboard);

      return g;
    },
  },

  // 7. WATERFALL KITCHEN ISLAND
  {
    key: 'kitchen-island',
    name: 'Marble Waterfall Island',
    category: 'Kitchen',
    defaultDims: { w: 3.0, d: 1.1, h: 0.92 },
    materialSlots: [
      { slot: 'stone', label: 'Waterfall Marble', defaultMat: 'calacatta' },
      { slot: 'cabinets', label: 'Cabinetry', defaultMat: 'ebonised-oak' },
      { slot: 'fittings', label: 'Faucet & Sink', defaultMat: 'brass-brushed' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const stoneMat = matManager.getMaterial(obj.materials['stone'] || 'calacatta');
      const cabMat = matManager.getMaterial(obj.materials['cabinets'] || 'ebonised-oak');
      const fitMat = matManager.getMaterial(obj.materials['fittings'] || 'brass-brushed');
      const { w = 3.0, d = 1.1, h = 0.92 } = obj.params;

      const thick = 0.06;

      // Top stone slab
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), stoneMat);
      top.position.set(0, h - thick / 2, 0);
      top.castShadow = true;

      // Left waterfall side
      const leftW = new THREE.Mesh(new THREE.BoxGeometry(thick, h, d), stoneMat);
      leftW.position.set(-w / 2 + thick / 2, h / 2, 0);
      leftW.castShadow = true;

      // Right waterfall side
      const rightW = new THREE.Mesh(new THREE.BoxGeometry(thick, h, d), stoneMat);
      rightW.position.set(w / 2 - thick / 2, h / 2, 0);
      rightW.castShadow = true;

      // Interior cabinetry carcass
      const innerW = w - thick * 2;
      const cabH = h - thick;
      const cabD = d * 0.75;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(innerW, cabH, cabD), cabMat);
      cab.position.set(0, cabH / 2, -d * 0.1);
      cab.castShadow = true;

      // Minimalist architectural gooseneck faucet
      const faucetG = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.35, 16), fitMat);
      stem.position.y = 0.175;
      const spout = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 12, 24, Math.PI), fitMat);
      spout.position.set(0.09, 0.35, 0);
      spout.rotation.z = Math.PI / 2;
      faucetG.add(stem, spout);
      faucetG.position.set(0.3, h, 0);

      g.add(top, leftW, rightW, cab, faucetG);
      return g;
    },
  },

  // 8. FREESTANDING BATHTUB
  {
    key: 'bathtub-oval',
    name: 'Freestanding Solid Stone Bath',
    category: 'Bathroom',
    defaultDims: { w: 1.8, d: 0.88, h: 0.62 },
    materialSlots: [
      { slot: 'primary', label: 'Stone Material', defaultMat: 'carrara' },
      { slot: 'fitting', label: 'Floor Mixer', defaultMat: 'steel-black' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const stoneMat = matManager.getMaterial(obj.materials['primary'] || 'carrara');
      const fitMat = matManager.getMaterial(obj.materials['fitting'] || 'steel-black');
      const { w = 1.8, d = 0.88, h = 0.62 } = obj.params;

      // Smooth oblong tub body
      const tubGeo = new THREE.CylinderGeometry(w / 2, w * 0.42, h, 32);
      tubGeo.scale(1, 1, d / w);
      const tub = new THREE.Mesh(tubGeo, stoneMat);
      tub.position.set(0, h / 2, 0);
      tub.castShadow = true;
      g.add(tub);

      // Floor standing mixer pipe
      const mixer = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.95, 16), fitMat);
      mixer.position.set(-w / 2 - 0.12, 0.475, 0);
      g.add(mixer);

      return g;
    },
  },

  // 9. ARCHITECTURAL INDOOR TREE / PLANTER
  {
    key: 'ficus-planter',
    name: 'Indoor Olive Tree in Terracotta Planter',
    category: 'Decor',
    defaultDims: { w: 0.9, d: 0.9, h: 2.2 },
    materialSlots: [
      { slot: 'pot', label: 'Planter Pot', defaultMat: 'terracotta-tile' },
      { slot: 'foliage', label: 'Foliage', defaultMat: 'paint-sage' },
    ],
    createGeometry: (obj) => {
      const g = new THREE.Group();
      const potMat = matManager.getMaterial(obj.materials['pot'] || 'terracotta-tile');
      const folMat = matManager.getMaterial(obj.materials['foliage'] || 'paint-sage');
      const woodMat = matManager.getMaterial('oak-smoked');

      // Tapered circular planter pot
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.65, 24), potMat);
      pot.position.set(0, 0.325, 0);
      pot.castShadow = true;
      g.add(pot);

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.4, 12), woodMat);
      trunk.position.set(0, 1.1, 0);
      trunk.castShadow = true;
      g.add(trunk);

      // Canopy foliage clusters
      const foliageGroup = new THREE.Group();
      const fGeo = new THREE.DodecahedronGeometry(0.35, 1);
      [
        [0, 1.8, 0, 1.1],
        [-0.2, 1.95, 0.15, 0.8],
        [0.22, 1.75, -0.1, 0.85],
        [0.05, 2.1, -0.05, 0.75],
      ].forEach(([fx, fy, fz, fs]) => {
        const cluster = new THREE.Mesh(fGeo, folMat);
        cluster.position.set(fx, fy, fz);
        cluster.scale.setScalar(fs);
        cluster.castShadow = true;
        foliageGroup.add(cluster);
      });
      g.add(foliageGroup);

      return g;
    },
  },
];

export const CATALOG_MAP = new Map(CATALOG.map((c) => [c.key, c]));
