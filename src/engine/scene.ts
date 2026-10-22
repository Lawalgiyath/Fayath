import * as THREE from 'three';
import { dist, len, norm, perp, sub } from '../core/geometry';
import { detectRooms, wallSideRooms, type DetectedRoom } from '../core/rooms';
import type { Opening, ProjectDoc, SceneObject, Wall } from '../core/types';
import { solveWalls, type NodeCap, type WallFootprint } from '../core/walls';
import { matManager } from '../materials/manager';
import { CATALOG_MAP } from '../objects/catalog';
import { ParametricOpenings } from '../objects/parametric';

export class SceneBuilder {
  public root = new THREE.Group();
  public wallGroup = new THREE.Group();
  public roomFloorGroup = new THREE.Group();
  public roomCeilingGroup = new THREE.Group();
  public openingsGroup = new THREE.Group();
  public objectsGroup = new THREE.Group();
  public groundMesh: THREE.Mesh | null = null;

  public collisionMeshes: THREE.Mesh[] = [];
  public detectedRooms: DetectedRoom[] = [];

  constructor() {
    this.root.name = 'building_root';
    this.wallGroup.name = 'walls';
    this.roomFloorGroup.name = 'floors';
    this.roomCeilingGroup.name = 'ceilings';
    this.openingsGroup.name = 'openings';
    this.objectsGroup.name = 'objects';

    this.root.add(
      this.wallGroup,
      this.roomFloorGroup,
      this.roomCeilingGroup,
      this.openingsGroup,
      this.objectsGroup
    );
  }

  /**
   * Rebuilds the entire 3D architectural model from the document.
   */
  public build(doc: ProjectDoc, activeSchemeId?: string) {
    this.clear();

    const activeScheme = doc.schemes.find((s) => s.id === activeSchemeId);

    // 1. Detect rooms and their boundaries
    this.detectedRooms = detectRooms(doc);

    // 2. Solve wall graph for mitered corners and caps
    const { footprints, caps } = solveWalls(doc.walls);

    // 3. Build Ground Landscape Slab
    this.buildGround(doc);

    // 4. Build Rooms (Floors & Ceilings)
    this.buildRooms(doc, this.detectedRooms, activeScheme);

    // 5. Build Walls with Opening Cutouts
    this.buildWalls(doc, footprints, caps, activeScheme);

    // 6. Build Openings (Doors & Windows)
    this.buildOpenings(doc);

    // 7. Build Objects & Furniture
    this.buildObjects(doc, activeScheme);

    return this.root;
  }

  private clear() {
    const disposeChildren = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        } else if (child instanceof THREE.Group) {
          disposeChildren(child);
        }
      }
    };

    disposeChildren(this.wallGroup);
    disposeChildren(this.roomFloorGroup);
    disposeChildren(this.roomCeilingGroup);
    disposeChildren(this.openingsGroup);
    disposeChildren(this.objectsGroup);

    if (this.groundMesh) {
      this.root.remove(this.groundMesh);
      this.groundMesh.geometry.dispose();
      this.groundMesh = null;
    }

    this.collisionMeshes = [];
  }

  private buildGround(doc: ProjectDoc) {
    const groundMat = matManager.getMaterial(doc.settings.groundMat || 'lawn');
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    groundGeo.rotateX(-Math.PI / 2);

    // UV repeat for landscape
    const uvAttr = groundGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, uvAttr.getX(i) * 40, uvAttr.getY(i) * 40);
    }

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.y = -0.01; // slightly below z-fighting
    this.groundMesh.receiveShadow = true;
    this.groundMesh.userData = { type: 'ground' };
    this.root.add(this.groundMesh);
  }

  private buildRooms(doc: ProjectDoc, rooms: DetectedRoom[], scheme?: any) {
    for (const room of rooms) {
      if (room.poly.length < 3) continue;

      const level = doc.levels.find((l) => l.id === room.levelId) || doc.levels[0];
      const elev = level?.elevation || 0;
      const height = room.label?.ceilingHeight || level?.height || 2.8;

      // Material resolution with Scheme overrides
      const schemeRoom = scheme?.rooms?.[room.key];
      const floorMatId = schemeRoom?.floorMat || room.label?.floorMat || doc.settings.defaultFloorMat || 'herringbone-oak';
      const ceilingMatId = schemeRoom?.ceilingMat || room.label?.ceilingMat || doc.settings.defaultCeilingMat || 'ceiling-white';

      const floorMat = matManager.getMaterial(floorMatId);
      const ceilingMat = matManager.getMaterial(ceilingMatId);

      // Floor Shape
      const shape = new THREE.Shape();
      shape.moveTo(room.poly[0].x, room.poly[0].y);
      for (let i = 1; i < room.poly.length; i++) {
        shape.lineTo(room.poly[i].x, room.poly[i].y);
      }
      shape.closePath();

      // Floor Mesh (Plan X->X, Plan Y->Z)
      const floorGeo = new THREE.ShapeGeometry(shape);
      floorGeo.rotateX(Math.PI / 2);

      // Assign real-world UVs (1 UV unit per meter)
      const posAttr = floorGeo.attributes.position;
      const uvs = new Float32Array(posAttr.count * 2);
      for (let i = 0; i < posAttr.count; i++) {
        uvs[i * 2] = posAttr.getX(i);
        uvs[i * 2 + 1] = posAttr.getZ(i);
      }
      floorGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      floorGeo.computeVertexNormals();

      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.y = elev + 0.001; // prevent z-fighting with slabs
      floorMesh.receiveShadow = true;
      floorMesh.userData = { type: 'room', key: room.key, room };
      this.roomFloorGroup.add(floorMesh);

      // Ceiling Mesh
      const ceilGeo = floorGeo.clone();
      ceilGeo.rotateX(Math.PI); // facing downward
      const ceilMesh = new THREE.Mesh(ceilGeo, ceilingMat);
      ceilMesh.position.y = elev + height;
      ceilMesh.userData = { type: 'ceiling', key: room.key };
      this.roomCeilingGroup.add(ceilMesh);
    }
  }

  private buildWalls(
    doc: ProjectDoc,
    footprints: Map<string, WallFootprint>,
    caps: NodeCap[],
    scheme?: any
  ) {
    for (const wall of doc.walls) {
      const fp = footprints.get(wall.id);
      if (!fp) continue;

      const level = doc.levels.find((l) => l.id === wall.levelId) || doc.levels[0];
      const elev = level?.elevation || 0;
      const wallH = wall.height || level?.height || 2.8;

      const sideRooms = wallSideRooms(this.detectedRooms, wall);
      const matLId =
        scheme?.walls?.[wall.id]?.matL ||
        wall.matL ||
        sideRooms.L?.label?.wallMat ||
        doc.settings.defaultWallMat ||
        'paint-warm-white';
      const matRId =
        scheme?.walls?.[wall.id]?.matR ||
        wall.matR ||
        sideRooms.R?.label?.wallMat ||
        doc.settings.defaultWallMat ||
        'paint-warm-white';

      const matL = matManager.getMaterial(matLId);
      const matR = matManager.getMaterial(matRId);

      // Openings hosted on this wall
      const openings = doc.openings
        .filter((o) => o.wallId === wall.id)
        .sort((a, b) => a.t - b.t);

      // Generate clean segmented wall meshes around openings
      this.buildSegmentedWall(wall, fp, wallH, elev, openings, matL, matR);
    }

    // Build Junction Caps for L/T/X intersections
    for (const cap of caps) {
      if (cap.poly.length < 3) continue;
      const level = doc.levels.find((l) => l.id === cap.levelId) || doc.levels[0];
      const elev = level?.elevation || 0;

      const shape = new THREE.Shape();
      shape.moveTo(cap.poly[0].x, cap.poly[0].y);
      for (let i = 1; i < cap.poly.length; i++) {
        shape.lineTo(cap.poly[i].x, cap.poly[i].y);
      }
      shape.closePath();

      const capGeo = new THREE.ExtrudeGeometry(shape, {
        depth: cap.height,
        bevelEnabled: false,
      });
      capGeo.rotateX(Math.PI / 2);

      const capMat = matManager.getMaterial(doc.settings.defaultWallMat || 'paint-warm-white');
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.y = elev + cap.height;
      capMesh.castShadow = true;
      capMesh.receiveShadow = true;
      this.wallGroup.add(capMesh);
    }
  }

  /**
   * Constructs wall segments with openings cleanly sliced out.
   */
  private buildSegmentedWall(
    wall: Wall,
    fp: WallFootprint,
    height: number,
    elevation: number,
    openings: Opening[],
    matL: THREE.Material,
    matR: THREE.Material
  ) {
    const wallLen = fp.length;
    const wallThick = wall.thickness;
    const d = fp.d; // direction (x, y)
    const n = fp.n; // left normal (x, y)

    // Slices along wall centerline from 0 to wallLen
    interface WallInterval {
      t0: number;
      t1: number;
      opening?: Opening;
    }

    const intervals: WallInterval[] = [];
    let curT = 0;

    for (const op of openings) {
      const opStart = Math.max(0, op.t - op.width / 2);
      const opEnd = Math.min(wallLen, op.t + op.width / 2);

      if (opStart > curT + 0.01) {
        intervals.push({ t0: curT, t1: opStart });
      }
      intervals.push({ t0: opStart, t1: opEnd, opening: op });
      curT = opEnd;
    }

    if (curT < wallLen - 0.01) {
      intervals.push({ t0: curT, t1: wallLen });
    }

    const wallSubGroup = new THREE.Group();
    wallSubGroup.userData = { type: 'wall', id: wall.id };

    for (const interval of intervals) {
      const segLen = interval.t1 - interval.t0;
      if (segLen <= 0.005) continue;

      if (!interval.opening) {
        // Solid wall column from floor to ceiling
        const mesh = this.createWallBox(
          wall,
          fp,
          interval.t0,
          interval.t1,
          0,
          height,
          elevation,
          matL,
          matR
        );
        wallSubGroup.add(mesh);
        this.collisionMeshes.push(mesh);
      } else {
        const op = interval.opening;
        // 1. Lintel above opening
        const lintelH = Math.max(0, height - (op.sill + op.height));
        if (lintelH > 0.01) {
          const lintelMesh = this.createWallBox(
            wall,
            fp,
            interval.t0,
            interval.t1,
            op.sill + op.height,
            height,
            elevation,
            matL,
            matR
          );
          wallSubGroup.add(lintelMesh);
        }

        // 2. Sill under opening (for windows)
        if (op.sill > 0.01) {
          const sillMesh = this.createWallBox(
            wall,
            fp,
            interval.t0,
            interval.t1,
            0,
            op.sill,
            elevation,
            matL,
            matR
          );
          wallSubGroup.add(sillMesh);
          this.collisionMeshes.push(sillMesh);
        }
      }
    }

    this.wallGroup.add(wallSubGroup);
  }

  private createWallBox(
    wall: Wall,
    fp: WallFootprint,
    t0: number,
    t1: number,
    y0: number,
    y1: number,
    elevation: number,
    matL: THREE.Material,
    matR: THREE.Material
  ): THREE.Mesh {
    const len = t1 - t0;
    const h = y1 - y0;
    const th = wall.thickness;

    const geo = new THREE.BoxGeometry(len, h, th);

    // Plan X -> X, Plan Y -> Z
    // Angle of wall in XZ plane
    const angle = Math.atan2(fp.d.y, fp.d.x);

    // Center point along wall
    const midT = (t0 + t1) / 2;
    const cx = wall.a.x + fp.d.x * midT;
    const cz = wall.a.y + fp.d.y * midT;
    const cy = elevation + (y0 + y1) / 2;

    const materials = [
      matL, // +x end
      matL, // -x end
      matL, // top
      matL, // bottom
      matL, // +z (left)
      matR, // -z (right)
    ];

    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(cx, cy, cz);
    mesh.rotation.y = -angle; // Three.js Y-rotation
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'wall', id: wall.id };

    return mesh;
  }

  private buildOpenings(doc: ProjectDoc) {
    for (const op of doc.openings) {
      const wall = doc.walls.find((w) => w.id === op.wallId);
      if (!wall) continue;

      const level = doc.levels.find((l) => l.id === wall.levelId) || doc.levels[0];
      const elev = level?.elevation || 0;

      const d = norm(sub(wall.b, wall.a));
      const angle = Math.atan2(d.y, d.x);

      // Position in plan
      const posX = wall.a.x + d.x * op.t;
      const posZ = wall.a.y + d.y * op.t;

      let bundle;
      if (op.type === 'door') {
        bundle = ParametricOpenings.createDoor(op, wall);
      } else {
        bundle = ParametricOpenings.createWindow(op, wall);
      }

      bundle.group.position.set(posX, elev, posZ);
      bundle.group.rotation.y = -angle;
      bundle.group.userData = { type: 'opening', id: op.id };

      this.openingsGroup.add(bundle.group);
    }
  }

  private buildObjects(doc: ProjectDoc, scheme?: any) {
    for (const obj of doc.objects) {
      const level = doc.levels.find((l) => l.id === obj.levelId) || doc.levels[0];
      const elev = level?.elevation || 0;

      const catalogDef = CATALOG_MAP.get(obj.kind);
      if (!catalogDef) continue;

      // Apply scheme overrides to object materials if present
      const effectiveObj: SceneObject = {
        ...obj,
        materials: {
          ...obj.materials,
          ...(scheme?.objects?.[obj.id] || {}),
        },
      };

      const group = catalogDef.createGeometry(effectiveObj);
      group.position.set(obj.position.x, elev + obj.elevation, obj.position.y);
      group.rotation.y = obj.rotation;
      group.userData = { type: 'object', id: obj.id, object: obj };

      this.objectsGroup.add(group);
    }
  }
}
