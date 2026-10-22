import type { ProjectDoc } from '../core/types';
import { DEFAULT_COST_RATES } from '../materials/library';

export const MODERN_VILLA_PROJECT: ProjectDoc = {
  version: 1,
  name: 'The Glass Pavilion & Villa',
  levels: [
    {
      id: 'lvl_ground',
      name: 'Ground Floor',
      elevation: 0,
      height: 3.2,
    },
  ],
  walls: [
    // Outer perimeter
    { id: 'w_ext_n', levelId: 'lvl_ground', a: { x: -8, y: -6 }, b: { x: 8, y: -6 }, thickness: 0.28, height: 3.2, matL: 'render-white', matR: 'paint-warm-white' },
    { id: 'w_ext_e', levelId: 'lvl_ground', a: { x: 8, y: -6 }, b: { x: 8, y: 6 }, thickness: 0.28, height: 3.2, matL: 'render-white', matR: 'paint-warm-white' },
    { id: 'w_ext_s', levelId: 'lvl_ground', a: { x: 8, y: 6 }, b: { x: -8, y: 6 }, thickness: 0.28, height: 3.2, matL: 'render-white', matR: 'paint-warm-white' },
    { id: 'w_ext_w', levelId: 'lvl_ground', a: { x: -8, y: 6 }, b: { x: -8, y: -6 }, thickness: 0.28, height: 3.2, matL: 'render-white', matR: 'paint-warm-white' },

    // Interior divider: Living / Dining from Master Suite
    { id: 'w_div_v', levelId: 'lvl_ground', a: { x: 1, y: -6 }, b: { x: 1, y: 6 }, thickness: 0.18, height: 3.2, matL: 'paint-warm-white', matR: 'paint-warm-white' },

    // Suite divider: Bedroom & Ensuite Bathroom
    { id: 'w_div_h', levelId: 'lvl_ground', a: { x: 1, y: 1 }, b: { x: 8, y: 1 }, thickness: 0.18, height: 3.2, matL: 'zellige-green', matR: 'paint-warm-white' },

    // Kitchen pantry / utility divider
    { id: 'w_kitchen_pantry', levelId: 'lvl_ground', a: { x: -8, y: -1.5 }, b: { x: -3.5, y: -1.5 }, thickness: 0.15, height: 3.2, matL: 'paint-warm-white', matR: 'paint-warm-white' },
    { id: 'w_kitchen_wall', levelId: 'lvl_ground', a: { x: -3.5, y: -6 }, b: { x: -3.5, y: -1.5 }, thickness: 0.15, height: 3.2, matL: 'paint-warm-white', matR: 'paint-warm-white' },
  ],
  openings: [
    // Panoramic glass wall on South facade
    { id: 'op_win_south_1', wallId: 'w_ext_s', type: 'window', style: 'grid', t: 4.5, width: 5.0, height: 2.8, sill: 0.1, frameMat: 'steel-black' },
    { id: 'op_win_south_2', wallId: 'w_ext_s', type: 'window', style: 'grid', t: 11.5, width: 4.0, height: 2.8, sill: 0.1, frameMat: 'steel-black' },

    // Front entrance pivot door on North facade
    { id: 'op_door_main', wallId: 'w_ext_n', type: 'door', style: 'pivot', t: 4.5, width: 1.2, height: 2.6, sill: 0, frameMat: 'oak-smoked' },

    // Windows on East and West
    { id: 'op_win_east', wallId: 'w_ext_e', type: 'window', style: 'casement', t: 3.5, width: 2.4, height: 1.8, sill: 0.8, frameMat: 'steel-black' },
    { id: 'op_win_west', wallId: 'w_ext_w', type: 'window', style: 'casement', t: 4.0, width: 2.0, height: 1.6, sill: 0.9, frameMat: 'steel-black' },

    // Interior doors
    { id: 'op_door_suite', wallId: 'w_div_v', type: 'door', style: 'single', t: 3.5, width: 0.9, height: 2.3, sill: 0, frameMat: 'oak-natural' },
    { id: 'op_door_bath', wallId: 'w_div_h', type: 'door', style: 'slider', t: 4.5, width: 0.95, height: 2.3, sill: 0, frameMat: 'oak-natural' },
    { id: 'op_door_pantry', wallId: 'w_kitchen_wall', type: 'door', style: 'cased', t: 2.5, width: 1.0, height: 2.4, sill: 0, frameMat: 'paint-warm-white' },
  ],
  rooms: [
    {
      id: 'rm_living',
      levelId: 'lvl_ground',
      point: { x: -2, y: 2.5 },
      name: 'Great Living Pavilion',
      floorMat: 'herringbone-oak',
      wallMat: 'paint-warm-white',
      ceilingMat: 'ceiling-white',
      ceilingHeight: 3.2,
    },
    {
      id: 'rm_kitchen',
      levelId: 'lvl_ground',
      point: { x: -6, y: -3.8 },
      name: 'Sculptural Kitchen',
      floorMat: 'concrete-polished',
      wallMat: 'paint-warm-white',
      ceilingMat: 'ceiling-white',
      ceilingHeight: 3.2,
    },
    {
      id: 'rm_bedroom',
      levelId: 'lvl_ground',
      point: { x: 4.5, y: -2.5 },
      name: 'Master Suite',
      floorMat: 'oak-natural',
      wallMat: 'paint-warm-white',
      ceilingMat: 'ceiling-white',
      ceilingHeight: 3.2,
    },
    {
      id: 'rm_bathroom',
      levelId: 'lvl_ground',
      point: { x: 4.5, y: 3.5 },
      name: 'Ensuite Spa Bathroom',
      floorMat: 'terrazzo-venetian',
      wallMat: 'zellige-green',
      ceilingMat: 'ceiling-white',
      ceilingHeight: 3.2,
    },
  ],
  objects: [
    // Living room furniture
    {
      id: 'obj_sofa',
      levelId: 'lvl_ground',
      kind: 'sofa-sectional',
      position: { x: -2.0, y: 2.2 },
      elevation: 0,
      rotation: 0,
      params: { w: 3.0, d: 1.9, h: 0.78 },
      materials: { primary: 'boucle-ivory', base: 'oak-smoked' },
    },
    {
      id: 'obj_lounge_chair',
      levelId: 'lvl_ground',
      kind: 'lounge-chair',
      position: { x: 0.0, y: 2.8 },
      elevation: 0,
      rotation: -Math.PI / 4,
      params: { w: 0.85, d: 0.9, h: 0.74 },
      materials: { primary: 'leather-cognac', frame: 'brass-brushed' },
    },
    {
      id: 'obj_coffee_table',
      levelId: 'lvl_ground',
      kind: 'coffee-table-marble',
      position: { x: -1.8, y: 2.0 },
      elevation: 0,
      rotation: 0,
      params: { w: 1.4, d: 0.8, h: 0.34 },
      materials: { primary: 'calacatta', base: 'steel-black' },
    },
    {
      id: 'obj_plant_living',
      levelId: 'lvl_ground',
      kind: 'ficus-planter',
      position: { x: -7.0, y: 5.0 },
      elevation: 0,
      rotation: 0,
      params: { w: 0.9, d: 0.9, h: 2.2 },
      materials: { pot: 'terracotta-tile', foliage: 'paint-sage' },
    },

    // Dining area
    {
      id: 'obj_dining_table',
      levelId: 'lvl_ground',
      kind: 'dining-table-oak',
      position: { x: -1.5, y: -2.5 },
      elevation: 0,
      rotation: 0,
      params: { w: 2.4, d: 1.0, h: 0.75 },
      materials: { primary: 'oak-natural', legs: 'oak-natural' },
    },

    // Kitchen Island
    {
      id: 'obj_island',
      levelId: 'lvl_ground',
      kind: 'kitchen-island',
      position: { x: -5.5, y: -4.0 },
      elevation: 0,
      rotation: 0,
      params: { w: 2.8, d: 1.1, h: 0.92 },
      materials: { stone: 'calacatta', cabinets: 'ebonised-oak', fittings: 'brass-brushed' },
    },

    // Master Bedroom Bed
    {
      id: 'obj_bed',
      levelId: 'lvl_ground',
      kind: 'platform-bed',
      position: { x: 5.0, y: -3.5 },
      elevation: 0,
      rotation: 0,
      params: { w: 2.2, d: 2.3, h: 0.95 },
      materials: { frame: 'oak-smoked', linen: 'linen-natural', headboard: 'boucle-ivory' },
    },

    // Ensuite Bathtub
    {
      id: 'obj_bath',
      levelId: 'lvl_ground',
      kind: 'bathtub-oval',
      position: { x: 5.0, y: 4.2 },
      elevation: 0,
      rotation: 0,
      params: { w: 1.8, d: 0.88, h: 0.62 },
      materials: { primary: 'carrara', fitting: 'steel-black' },
    },
  ],
  underlays: [],
  assets: [],
  customMaterials: [],
  overrides: {},
  schemes: [
    {
      id: 'scheme_warm_nordic',
      name: 'Scheme A: Warm Nordic Oak',
      rooms: {},
      walls: {},
      objects: {},
      exteriorMat: 'render-white',
      overrides: {},
    },
    {
      id: 'scheme_dark_minimalist',
      name: 'Scheme B: Dark Architectural Minimalist',
      rooms: {
        rm_living: { floorMat: 'concrete-polished', wallMat: 'paint-charcoal', ceilingMat: 'paint-charcoal' },
        rm_bedroom: { floorMat: 'herringbone-walnut', wallMat: 'paint-bone', ceilingMat: 'ceiling-white' },
      },
      walls: {
        w_ext_n: { matL: 'charred-timber', matR: 'paint-charcoal' },
        w_ext_s: { matL: 'charred-timber', matR: 'paint-charcoal' },
      },
      objects: {
        obj_sofa: { primary: 'leather-black', base: 'steel-black' },
        obj_island: { stone: 'nero-marquina', cabinets: 'steel-black', fittings: 'steel-black' },
      },
      exteriorMat: 'charred-timber',
      overrides: {},
    },
  ],
  views: [
    {
      id: 'v_great_room',
      name: 'Great Living Room View',
      position: [-5.5, 1.65, 4.2],
      target: [-1.5, 1.4, 1.5],
      mode: 'walk',
    },
    {
      id: 'v_exterior_south',
      name: 'South Elevation & Terrace',
      position: [0, 6, 16],
      target: [0, 1.5, 0],
      mode: 'orbit',
    },
    {
      id: 'v_master_suite',
      name: 'Master Suite Interior',
      position: [2.0, 1.65, -1.0],
      target: [5.0, 1.2, -3.5],
      mode: 'walk',
    },
  ],
  site: {
    latitude: 37.7749, // San Francisco
    longitude: -122.4194,
    northAngle: 15,
    date: '2026-06-21', // Summer solstice
    minutes: 14 * 60 + 30, // 2:30 PM
    utcOffset: -7,
  },
  settings: {
    exteriorMat: 'render-white',
    groundMat: 'lawn',
    defaultFloorMat: 'herringbone-oak',
    defaultWallMat: 'paint-warm-white',
    defaultCeilingMat: 'ceiling-white',
    defaultDoorMat: 'oak-natural',
    defaultFrameMat: 'steel-black',
    currency: '$',
    costRates: DEFAULT_COST_RATES,
    openingRates: { door: 1200, window: 950 },
  },
};
