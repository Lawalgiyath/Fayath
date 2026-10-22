import { create } from 'zustand';
import { addWall, deleteWall } from './ops';
import type { DoorStyle, Opening, ProjectDoc, SceneObject, Selection, Vec2, Wall, WindowStyle } from './types';
import { MODERN_VILLA_PROJECT } from '../samples/sampleProjects';

export type ViewLayoutMode = '3d' | '2d' | 'split';

export interface AppState {
  doc: ProjectDoc;
  activeLevelId: string;
  activeSchemeId: string;
  activeTool: 'select' | 'wall' | 'door' | 'window' | 'room' | 'object' | 'measure' | 'calibrate';
  viewMode: ViewLayoutMode;
  cameraMode: 'orbit' | 'walk' | 'fly' | 'plan';
  selection: Selection;

  // Tool options
  wallThickness: number;
  doorStyle: DoorStyle;
  doorWidth: number;
  doorHeight: number;
  windowStyle: WindowStyle;
  windowWidth: number;
  windowHeight: number;
  windowSill: number;
  catalogKey: string;
  selectedMaterialId: string;

  // View & Render options
  sectionCutEnabled: boolean;
  sectionCutHeight: number;
  sunStudyPlaying: boolean;
  showUnderlay: boolean;
  underlayOpacity: number;

  // History
  undoStack: ProjectDoc[];
  redoStack: ProjectDoc[];

  // Actions
  setDoc: (doc: ProjectDoc, pushHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  setActiveLevel: (levelId: string) => void;
  setActiveScheme: (schemeId: string) => void;
  setActiveTool: (tool: AppState['activeTool']) => void;
  setViewMode: (mode: ViewLayoutMode) => void;
  setCameraMode: (mode: AppState['cameraMode']) => void;
  setSelection: (sel: Selection) => void;

  // Model mutations
  createWall: (a: Vec2, b: Vec2) => Wall | null;
  removeWall: (id: string) => void;
  updateWallMat: (id: string, side: 'matL' | 'matR', matId: string) => void;

  createOpening: (wallId: string, t: number) => Opening | null;
  updateOpening: (id: string, partial: Partial<Opening>) => void;
  removeOpening: (id: string) => void;

  createObject: (pos: Vec2) => SceneObject;
  updateObject: (id: string, partial: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;

  updateRoomMat: (roomKey: string, slot: 'floorMat' | 'wallMat' | 'ceilingMat', matId: string) => void;

  setSunTime: (minutes: number) => void;
  toggleSunStudy: () => void;
  setSectionCut: (enabled: boolean, height?: number) => void;
  setToolOption: <K extends keyof AppState>(key: K, value: AppState[K]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  doc: MODERN_VILLA_PROJECT,
  activeLevelId: 'lvl_ground',
  activeSchemeId: 'scheme_warm_nordic',
  activeTool: 'select',
  viewMode: '3d',
  cameraMode: 'orbit',
  selection: null,

  wallThickness: 0.2,
  doorStyle: 'single',
  doorWidth: 0.9,
  doorHeight: 2.1,
  windowStyle: 'casement',
  windowWidth: 1.4,
  windowHeight: 1.3,
  windowSill: 0.9,
  catalogKey: 'sofa-sectional',
  selectedMaterialId: 'herringbone-oak',

  sectionCutEnabled: false,
  sectionCutHeight: 1.2,
  sunStudyPlaying: false,
  showUnderlay: true,
  underlayOpacity: 0.65,

  undoStack: [],
  redoStack: [],

  setDoc: (newDoc, pushHistory = true) => {
    const { doc, undoStack } = get();
    set({
      doc: newDoc,
      undoStack: pushHistory ? [...undoStack.slice(-30), JSON.parse(JSON.stringify(doc))] : undoStack,
      redoStack: pushHistory ? [] : get().redoStack,
    });
  },

  undo: () => {
    const { undoStack, redoStack, doc } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      doc: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [JSON.parse(JSON.stringify(doc)), ...redoStack],
      selection: null,
    });
  },

  redo: () => {
    const { undoStack, redoStack, doc } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    set({
      doc: next,
      undoStack: [...undoStack, JSON.parse(JSON.stringify(doc))],
      redoStack: redoStack.slice(1),
      selection: null,
    });
  },

  setActiveLevel: (levelId) => set({ activeLevelId: levelId, selection: null }),
  setActiveScheme: (schemeId) => set({ activeSchemeId: schemeId }),
  setActiveTool: (activeTool) => set({ activeTool, selection: activeTool === 'select' ? get().selection : null }),
  setViewMode: (viewMode) => set({ viewMode }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setSelection: (selection) => set({ selection }),

  createWall: (a, b) => {
    const { doc, activeLevelId, wallThickness } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    const level = cloned.levels.find((l) => l.id === activeLevelId) || cloned.levels[0];
    const w = addWall(cloned, activeLevelId, a, b, wallThickness, level?.height || 2.8);
    if (w) {
      get().setDoc(cloned);
    }
    return w;
  },

  removeWall: (id) => {
    const { doc } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    deleteWall(cloned, id);
    get().setDoc(cloned);
    set({ selection: null });
  },

  updateWallMat: (id, side, matId) => {
    const { doc } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    const w = cloned.walls.find((x) => x.id === id);
    if (w) {
      w[side] = matId;
      get().setDoc(cloned);
    }
  },

  createOpening: (wallId, t) => {
    const { doc, activeTool, doorStyle, doorWidth, doorHeight, windowStyle, windowWidth, windowHeight, windowSill } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    const isDoor = activeTool === 'door';

    const op: Opening = {
      id: `op_${Date.now().toString(36)}`,
      wallId,
      type: isDoor ? 'door' : 'window',
      style: isDoor ? doorStyle : windowStyle,
      t,
      width: isDoor ? doorWidth : windowWidth,
      height: isDoor ? doorHeight : windowHeight,
      sill: isDoor ? 0 : windowSill,
    };

    cloned.openings.push(op);
    get().setDoc(cloned);
    return op;
  },

  updateOpening: (id, partial) => {
    const { doc } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    const op = cloned.openings.find((x) => x.id === id);
    if (op) {
      Object.assign(op, partial);
      get().setDoc(cloned);
    }
  },

  removeOpening: (id) => {
    const { doc } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    cloned.openings = cloned.openings.filter((x) => x.id !== id);
    get().setDoc(cloned);
    set({ selection: null });
  },

  createObject: (pos) => {
    const { doc, activeLevelId, catalogKey } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    const obj: SceneObject = {
      id: `obj_${Date.now().toString(36)}`,
      levelId: activeLevelId,
      kind: catalogKey,
      position: pos,
      elevation: 0,
      rotation: 0,
      params: {},
      materials: {},
    };
    cloned.objects.push(obj);
    get().setDoc(cloned);
    return obj;
  },

  updateObject: (id, partial) => {
    const { doc } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    const obj = cloned.objects.find((x) => x.id === id);
    if (obj) {
      Object.assign(obj, partial);
      get().setDoc(cloned);
    }
  },

  removeObject: (id) => {
    const { doc } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    cloned.objects = cloned.objects.filter((x) => x.id !== id);
    get().setDoc(cloned);
    set({ selection: null });
  },

  updateRoomMat: (roomKey, slot, matId) => {
    const { doc, activeLevelId } = get();
    const cloned: ProjectDoc = JSON.parse(JSON.stringify(doc));
    let room = cloned.rooms.find((r) => r.id === roomKey);
    if (!room) {
      room = {
        id: roomKey,
        levelId: activeLevelId,
        point: { x: 0, y: 0 },
        name: 'Room',
      };
      cloned.rooms.push(room);
    }
    room[slot] = matId;
    get().setDoc(cloned);
  },

  setSunTime: (minutes) => {
    const { doc } = get();
    set({
      doc: {
        ...doc,
        site: { ...doc.site, minutes },
      },
    });
  },

  toggleSunStudy: () => set((state) => ({ sunStudyPlaying: !state.sunStudyPlaying })),
  setSectionCut: (sectionCutEnabled, sectionCutHeight) =>
    set({
      sectionCutEnabled,
      sectionCutHeight: sectionCutHeight !== undefined ? sectionCutHeight : get().sectionCutHeight,
    }),
  setToolOption: (key, value) => set({ [key]: value } as any),
}));
