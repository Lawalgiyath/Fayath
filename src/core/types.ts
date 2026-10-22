// Core document model. All distances are in meters. Plan coordinates use
// x to the right and y downward on screen; in 3D, plan x maps to X and plan y maps to Z.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Level {
  id: string;
  name: string;
  elevation: number;
  height: number; // default wall height for new walls on this level
}

export interface Wall {
  id: string;
  levelId: string;
  a: Vec2;
  b: Vec2;
  thickness: number;
  height: number;
  // Optional per-side material overrides. Left is the side to the left of a->b.
  matL?: string;
  matR?: string;
}

export type OpeningType = 'door' | 'window';
export type DoorStyle = 'single' | 'double' | 'slider' | 'cased' | 'pivot';
export type WindowStyle = 'casement' | 'fixed' | 'grid' | 'awning' | 'floor';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  style: DoorStyle | WindowStyle;
  t: number; // distance from wall start (a) to opening center
  width: number;
  height: number;
  sill: number;
  flip?: boolean; // swing side
  hand?: boolean; // hinge side
  frameMat?: string;
}

export interface RoomLabel {
  id: string;
  levelId: string;
  point: Vec2; // seed point used to bind label to a detected room polygon
  name: string;
  floorMat?: string;
  wallMat?: string;
  ceilingMat?: string;
  ceilingHeight?: number;
}

export interface SceneObject {
  id: string;
  levelId: string;
  kind: string; // catalog key or 'asset'
  position: Vec2;
  elevation: number;
  rotation: number; // radians, around vertical axis
  params: Record<string, number>; // w, d, h and kind specific values
  materials: Record<string, string>;
  assetId?: string;
}

export interface MaterialOverride {
  tint?: string;
  scale?: number;
  rotation?: number;
  roughness?: number;
}

export interface CustomMaterial {
  id: string;
  name: string;
  base?: string; // library material it was derived from
  image?: string; // data URL for uploaded albedo
  sizeM?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

export interface Underlay {
  id: string;
  levelId: string;
  src: string; // data URL
  origin: Vec2; // plan position of image top-left
  scale: number; // meters per pixel
  opacity: number;
  widthPx: number;
  heightPx: number;
  visible: boolean;
}

export interface Asset {
  id: string;
  name: string;
  dataUrl: string; // glb as data URL
}

export interface Scheme {
  id: string;
  name: string;
  rooms: Record<string, Pick<RoomLabel, 'floorMat' | 'wallMat' | 'ceilingMat'>>;
  walls: Record<string, { matL?: string; matR?: string }>;
  objects: Record<string, Record<string, string>>;
  exteriorMat: string;
  overrides: Record<string, MaterialOverride>;
}

export interface CameraView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  mode: 'orbit' | 'walk' | 'fly';
  thumb?: string;
}

export interface SiteSettings {
  latitude: number;
  longitude: number;
  northAngle: number; // degrees, rotation of plan north from screen up
  date: string; // ISO date yyyy-mm-dd
  minutes: number; // minutes since local midnight
  utcOffset: number; // hours
}

export interface ProjectSettings {
  exteriorMat: string;
  groundMat: string;
  defaultFloorMat: string;
  defaultWallMat: string;
  defaultCeilingMat: string;
  defaultDoorMat: string;
  defaultFrameMat: string;
  currency: string;
  costRates: Record<string, number>; // material id -> cost per m2
  openingRates: { door: number; window: number };
}

export interface ProjectDoc {
  version: number;
  name: string;
  levels: Level[];
  walls: Wall[];
  openings: Opening[];
  rooms: RoomLabel[];
  objects: SceneObject[];
  underlays: Underlay[];
  assets: Asset[];
  customMaterials: CustomMaterial[];
  overrides: Record<string, MaterialOverride>;
  schemes: Scheme[];
  views: CameraView[];
  site: SiteSettings;
  settings: ProjectSettings;
}

export type Selection =
  | { kind: 'wall'; id: string }
  | { kind: 'opening'; id: string }
  | { kind: 'object'; id: string }
  | { kind: 'room'; key: string }
  | null;
