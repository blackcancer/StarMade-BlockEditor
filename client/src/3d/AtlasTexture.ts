/**
 * @fileoverview Atlas texture loader for Three.js.
 *
 * Loads StarMade diffuse and normal atlas textures from the local API.
 */

import * as THREE from 'three';

export const PAGE_GRID_COLS = 4;
export const PAGE_GRID_ROWS = 2;
export const ATLAS_COLS = 64;
export const ATLAS_ROWS = 32;
export const PAGE_COLS = 16;
export const PAGE_ROWS = 16;
export const PAGE_TILES = PAGE_COLS * PAGE_ROWS;

export type AtlasMapKind = 'diffuse' | 'normal';

const _loader = new THREE.TextureLoader();
const _cachedTextures = new Map<string, THREE.Texture>();
const _loadingPromises = new Map<string, Promise<THREE.Texture>>();

export async function loadAtlasTexture(
  size = 256,
  texturePack = 'Default',
  mapKind: AtlasMapKind = 'diffuse',
): Promise<THREE.Texture> {
  const key = `${texturePack}:${size}:${mapKind}`;
  const cached = _cachedTextures.get(key);
  if (cached) return cached;

  const pending = _loadingPromises.get(key);
  if (pending) return pending;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    _loader.load(
      `/api/textures/atlas?size=${size}&pack=${encodeURIComponent(texturePack)}&map=${mapKind}&v=4`,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = mapKind === 'diffuse' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.needsUpdate = true;
        _cachedTextures.set(key, tex);
        _loadingPromises.delete(key);
        resolve(tex);
      },
      undefined,
      (err) => {
        _loadingPromises.delete(key);
        reject(err);
      },
    );
  });

  _loadingPromises.set(key, promise);
  return promise;
}

export function invalidateAtlasCache(): void {
  for (const tex of _cachedTextures.values()) tex.dispose();
  _cachedTextures.clear();
  _loadingPromises.clear();
}

export function tileUVRect(tileId: number): { u: number; v: number; u1: number; v1: number } {
  const page = Math.floor(tileId / PAGE_TILES);
  const local = tileId % PAGE_TILES;
  const pageCol = page % PAGE_GRID_COLS;
  const pageRow = Math.floor(page / PAGE_GRID_COLS);
  const col = pageCol * PAGE_COLS + (local % PAGE_COLS);
  const row = pageRow * PAGE_ROWS + Math.floor(local / PAGE_COLS);
  return {
    u:  col / ATLAS_COLS,
    v:  1 - (row + 1) / ATLAS_ROWS,
    u1: (col + 1) / ATLAS_COLS,
    v1: 1 - row / ATLAS_ROWS,
  };
}
