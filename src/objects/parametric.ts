import * as THREE from 'three';
import type { DoorStyle, Opening, Wall, WindowStyle } from '../core/types';
import { matManager } from '../materials/manager';

export interface OpeningGeometryBundle {
  group: THREE.Group;
  cutout: {
    width: number;
    height: number;
    depth: number;
    offsetY: number;
  };
}

export class ParametricOpenings {
  /**
   * Generates a realistic parametric door assembly:
   * frame/jamb, leaf/panel, handle lever & rosette, threshold.
   */
  public static createDoor(opening: Opening, wall: Wall): OpeningGeometryBundle {
    const group = new THREE.Group();
    group.name = `door_${opening.id}`;

    const w = opening.width;
    const h = opening.height;
    const wallThick = wall.thickness;
    const frameThick = 0.05; // 50mm frame
    const frameDepth = wallThick + 0.02; // slightly wider than wall for architrave
    const leafThick = 0.04; // 40mm door leaf

    const frameMat = matManager.getMaterial(opening.frameMat || 'paint-warm-white');
    const leafMat = matManager.getMaterial(opening.frameMat || 'oak-natural');
    const metalMat = matManager.getMaterial('brass-brushed');

    const style = opening.style as DoorStyle;

    if (style !== 'cased') {
      // 1. Frame: Left jamb, Right jamb, Top lintel
      const leftJambGeo = new THREE.BoxGeometry(frameThick, h, frameDepth);
      const leftJamb = new THREE.Mesh(leftJambGeo, frameMat);
      leftJamb.position.set(-w / 2 + frameThick / 2, h / 2, 0);
      leftJamb.castShadow = true;
      leftJamb.receiveShadow = true;
      group.add(leftJamb);

      const rightJambGeo = new THREE.BoxGeometry(frameThick, h, frameDepth);
      const rightJamb = new THREE.Mesh(rightJambGeo, frameMat);
      rightJamb.position.set(w / 2 - frameThick / 2, h / 2, 0);
      rightJamb.castShadow = true;
      rightJamb.receiveShadow = true;
      group.add(rightJamb);

      const lintelGeo = new THREE.BoxGeometry(w, frameThick, frameDepth);
      const lintel = new THREE.Mesh(lintelGeo, frameMat);
      lintel.position.set(0, h - frameThick / 2, 0);
      lintel.castShadow = true;
      lintel.receiveShadow = true;
      group.add(lintel);

      // 2. Door leaf / leaves based on style
      const innerW = w - frameThick * 2;
      const innerH = h - frameThick;

      if (style === 'single' || style === 'pivot') {
        const leafGeo = new THREE.BoxGeometry(innerW, innerH, leafThick);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(0, innerH / 2, 0);
        leaf.castShadow = true;
        leaf.receiveShadow = true;

        // Lever handle
        const handleGroup = new THREE.Group();
        const rosetteGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16);
        rosetteGeo.rotateX(Math.PI / 2);
        const rosette = new THREE.Mesh(rosetteGeo, metalMat);

        const leverGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.12, 12);
        leverGeo.rotateZ(Math.PI / 2);
        const lever = new THREE.Mesh(leverGeo, metalMat);
        lever.position.set(0.05, 0, 0.035);

        handleGroup.add(rosette, lever);
        const handleX = innerW / 2 - 0.07;
        const handleY = 0.95; // 950mm from floor
        handleGroup.position.set(handleX, handleY - innerH / 2, leafThick / 2 + 0.005);
        leaf.add(handleGroup);

        group.add(leaf);
      } else if (style === 'double') {
        const leafW = innerW / 2 - 0.002;
        const leafGeo = new THREE.BoxGeometry(leafW, innerH, leafThick);

        const leafL = new THREE.Mesh(leafGeo, leafMat);
        leafL.position.set(-innerW / 4, innerH / 2, 0);
        leafL.castShadow = true;

        const leafR = new THREE.Mesh(leafGeo, leafMat);
        leafR.position.set(innerW / 4, innerH / 2, 0);
        leafR.castShadow = true;

        group.add(leafL, leafR);
      } else if (style === 'slider') {
        const leafW = innerW / 2 + 0.04;
        const leafGeo = new THREE.BoxGeometry(leafW, innerH, leafThick * 0.8);
        const leaf1 = new THREE.Mesh(leafGeo, leafMat);
        leaf1.position.set(-innerW / 4, innerH / 2, -0.02);

        const leaf2 = new THREE.Mesh(leafGeo, leafMat);
        leaf2.position.set(innerW / 4, innerH / 2, 0.02);

        group.add(leaf1, leaf2);
      }
    } else {
      // Cased opening: neat perimeter casing
      const casingMat = frameMat;
      const trimGeo = new THREE.BoxGeometry(0.03, h, wallThick + 0.04);
      const l = new THREE.Mesh(trimGeo, casingMat);
      l.position.set(-w / 2 + 0.015, h / 2, 0);
      const r = new THREE.Mesh(trimGeo, casingMat);
      r.position.set(w / 2 - 0.015, h / 2, 0);
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, wallThick + 0.04), casingMat);
      top.position.set(0, h - 0.015, 0);
      group.add(l, r, top);
    }

    return {
      group,
      cutout: {
        width: w,
        height: h,
        depth: wallThick + 0.1,
        offsetY: h / 2,
      },
    };
  }

  /**
   * Generates a realistic parametric window assembly:
   * outer frame, interior sash, double glazed pane, stone/metal sill.
   */
  public static createWindow(opening: Opening, wall: Wall): OpeningGeometryBundle {
    const group = new THREE.Group();
    group.name = `window_${opening.id}`;

    const w = opening.width;
    const h = opening.height;
    const sill = opening.sill;
    const wallThick = wall.thickness;
    const frameThick = 0.06;
    const frameDepth = 0.08;

    const frameMat = matManager.getMaterial(opening.frameMat || 'steel-black');
    const glassMat = matManager.getMaterial('glass-clear');
    const sillMat = matManager.getMaterial('limestone');

    const style = opening.style as WindowStyle;

    // 1. Outer Frame: Perimeter rectangle
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-w / 2, -h / 2);
    frameShape.lineTo(w / 2, -h / 2);
    frameShape.lineTo(w / 2, h / 2);
    frameShape.lineTo(-w / 2, h / 2);
    frameShape.closePath();

    const hole = new THREE.Path();
    const innerW = w - frameThick * 2;
    const innerH = h - frameThick * 2;
    hole.moveTo(-innerW / 2, -innerH / 2);
    hole.lineTo(innerW / 2, -innerH / 2);
    hole.lineTo(innerW / 2, innerH / 2);
    hole.lineTo(-innerW / 2, innerH / 2);
    hole.closePath();
    frameShape.holes.push(hole);

    const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: frameDepth,
      bevelEnabled: false,
    });
    frameGeo.center();
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, sill + h / 2, 0);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    group.add(frameMesh);

    // 2. Glass pane (with thickness)
    const glassGeo = new THREE.BoxGeometry(innerW + 0.01, innerH + 0.01, 0.015);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, sill + h / 2, 0);
    group.add(glassMesh);

    // 3. Grid / Mullions if style is grid or casement
    if (style === 'grid') {
      const mullionW = 0.03;
      const mullionMat = frameMat;

      // Vertical mullions (3 columns)
      for (let i = 1; i < 3; i++) {
        const mx = -innerW / 2 + (innerW / 3) * i;
        const vMullion = new THREE.Mesh(
          new THREE.BoxGeometry(mullionW, innerH, frameDepth * 0.7),
          mullionMat
        );
        vMullion.position.set(mx, sill + h / 2, 0);
        vMullion.castShadow = true;
        group.add(vMullion);
      }
      // Horizontal mullion (2 rows)
      const hMullion = new THREE.Mesh(
        new THREE.BoxGeometry(innerW, mullionW, frameDepth * 0.7),
        mullionMat
      );
      hMullion.position.set(0, sill + h / 2, 0);
      hMullion.castShadow = true;
      group.add(hMullion);
    } else if (style === 'casement') {
      // Split in center
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, innerH, frameDepth * 0.8),
        frameMat
      );
      mullion.position.set(0, sill + h / 2, 0);
      mullion.castShadow = true;
      group.add(mullion);
    }

    // 4. Exterior Sill ledge (protrudes outwards)
    const sillGeo = new THREE.BoxGeometry(w + 0.08, 0.04, 0.14);
    const sillMesh = new THREE.Mesh(sillGeo, sillMat);
    sillMesh.position.set(0, sill - 0.02, wallThick / 2 + 0.05);
    sillMesh.castShadow = true;
    group.add(sillMesh);

    return {
      group,
      cutout: {
        width: w,
        height: h,
        depth: wallThick + 0.1,
        offsetY: sill + h / 2,
      },
    };
  }
}
