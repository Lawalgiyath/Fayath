import * as THREE from 'three';
import type { MaterialOverride } from '../core/types';
import { LIBRARY, LIB_MAP, type MatDef } from './library';
import type { TexData } from './textures';

export class MaterialManager {
  private cache = new Map<string, THREE.Material>();
  private textures = new Map<string, { map: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture }>();
  private defaultWhiteMat: THREE.MeshStandardMaterial;

  constructor() {
    this.defaultWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf0ede8,
      roughness: 0.8,
      metalness: 0.05,
    });
  }

  /**
   * Generates a normal map from a height field using a 3x3 Sobel filter.
   */
  private generateNormalMap(height: Float32Array, S: number, strength = 1.0): Uint8ClampedArray {
    const normals = new Uint8ClampedArray(S * S * 4);
    const getH = (x: number, y: number) => {
      const px = ((x % S) + S) % S;
      const py = ((y % S) + S) % S;
      return height[py * S + px];
    };

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Sobel kernels for dX and dY
        const tl = getH(x - 1, y - 1);
        const l = getH(x - 1, y);
        const bl = getH(x - 1, y + 1);
        const tr = getH(x + 1, y - 1);
        const r = getH(x + 1, y);
        const br = getH(x + 1, y + 1);
        const t = getH(x, y - 1);
        const b = getH(x, y + 1);

        const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
        const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

        // Vector: (-dX * strength, -dY * strength, 1.0) normalized
        let nx = -dX * strength * 2.0;
        let ny = -dY * strength * 2.0;
        let nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1.0;
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (y * S + x) * 4;
        normals[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        normals[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        normals[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        normals[idx + 3] = 255;
      }
    }
    return normals;
  }

  private createTexturePackage(matDef: MatDef, resolution = 512) {
    if (!matDef.gen) return null;
    const texData: TexData = matDef.gen(resolution);
    const S = texData.S;

    // 1. Albedo
    const albedoTex = new THREE.DataTexture(
      texData.albedo,
      S,
      S,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    albedoTex.wrapS = THREE.RepeatWrapping;
    albedoTex.wrapT = THREE.RepeatWrapping;
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.needsUpdate = true;

    // 2. Normal map
    let normalTex: THREE.DataTexture | undefined;
    if (matDef.normal && matDef.normal > 0) {
      const normalData = this.generateNormalMap(texData.height, S, matDef.normal);
      normalTex = new THREE.DataTexture(
        normalData,
        S,
        S,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      normalTex.wrapS = THREE.RepeatWrapping;
      normalTex.wrapT = THREE.RepeatWrapping;
      normalTex.needsUpdate = true;
    }

    // 3. Roughness map (stored in luminance)
    const roughBytes = new Uint8ClampedArray(S * S * 4);
    for (let i = 0; i < S * S; i++) {
      const val = Math.round(Math.min(1, Math.max(0, texData.rough[i])) * 255);
      const idx = i * 4;
      roughBytes[idx] = val;
      roughBytes[idx + 1] = val;
      roughBytes[idx + 2] = val;
      roughBytes[idx + 3] = 255;
    }
    const roughTex = new THREE.DataTexture(
      roughBytes,
      S,
      S,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.needsUpdate = true;

    return { map: albedoTex, normalMap: normalTex, roughnessMap: roughTex };
  }

  public getMaterial(
    materialId: string | undefined,
    override?: MaterialOverride,
    customTextureUrl?: string
  ): THREE.Material {
    const id = materialId || 'paint-warm-white';
    const cacheKey = `${id}_${override?.tint || ''}_${override?.scale || 1}_${override?.roughness ?? ''}_${customTextureUrl || ''}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const matDef = LIB_MAP.get(id) || LIBRARY[0];

    // Handle glass separately
    if (matDef.glass) {
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(override?.tint || matDef.glass.color),
        transparent: true,
        opacity: matDef.glass.opacity,
        roughness: override?.roughness ?? matDef.glass.roughness,
        metalness: 0.1,
        transmission: 0.9,
        ior: 1.52,
        thickness: 0.05,
        depthWrite: false,
      });
      this.cache.set(cacheKey, glassMat);
      return glassMat;
    }

    // Build or fetch textures
    let texPkg = this.textures.get(id);
    if (!texPkg && matDef.gen) {
      const created = this.createTexturePackage(matDef, 512);
      if (created) {
        texPkg = created;
        this.textures.set(id, created);
      }
    }

    let map = texPkg?.map;
    let normalMap = texPkg?.normalMap;
    let roughnessMap = texPkg?.roughnessMap;

    // Handle custom image texture upload
    if (customTextureUrl) {
      const loader = new THREE.TextureLoader();
      const customTex = loader.load(customTextureUrl);
      customTex.wrapS = THREE.RepeatWrapping;
      customTex.wrapT = THREE.RepeatWrapping;
      customTex.colorSpace = THREE.SRGBColorSpace;
      map = customTex;
    }

    // Clone textures if uv scale/rotation is overridden
    if (override?.scale && override.scale !== 1 && map) {
      map = map.clone();
      map.repeat.multiplyScalar(override.scale);
      map.needsUpdate = true;
      if (normalMap) {
        normalMap = normalMap.clone();
        normalMap.repeat.multiplyScalar(override.scale);
        normalMap.needsUpdate = true;
      }
      if (roughnessMap) {
        roughnessMap = roughnessMap.clone();
        roughnessMap.repeat.multiplyScalar(override.scale);
        roughnessMap.needsUpdate = true;
      }
    }

    const material = new THREE.MeshStandardMaterial({
      color: override?.tint ? new THREE.Color(override.tint) : 0xffffff,
      map: map || null,
      normalMap: normalMap || null,
      roughnessMap: roughnessMap || null,
      roughness: override?.roughness !== undefined ? override.roughness : (roughnessMap ? 1.0 : 0.7),
      metalness: matDef.metalness || 0.0,
      envMapIntensity: 1.0,
    });

    this.cache.set(cacheKey, material);
    return material;
  }

  public getQuickSwatchDataUrl(matId: string, size = 64): string {
    const matDef = LIB_MAP.get(matId);
    if (!matDef) return '';
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    if (matDef.gen) {
      const data = matDef.gen(size);
      const imgData = ctx.createImageData(size, size);
      imgData.data.set(data.albedo);
      ctx.putImageData(imgData, 0, 0);
    } else if (matDef.glass) {
      ctx.fillStyle = matDef.glass.color;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(size, 0);
      ctx.stroke();
    }
    return canvas.toDataURL();
  }

  public dispose() {
    this.cache.forEach((mat) => mat.dispose());
    this.cache.clear();
    this.textures.forEach((pkg) => {
      pkg.map.dispose();
      pkg.normalMap?.dispose();
      pkg.roughnessMap?.dispose();
    });
    this.textures.clear();
    this.defaultWhiteMat.dispose();
  }
}

export const matManager = new MaterialManager();
