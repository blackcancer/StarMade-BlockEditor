/**
 * @fileoverview Atlas texture loader for Three.js.
 *
 * Loads the StarMade block texture atlas from the local API
 * (/api/textures/atlas) and exposes helpers to compute UV
 * coordinates and access individual tile data.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';

/** Number of tiles per row/column in the StarMade atlas. */
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;

/** Texture loader singleton. */
const _loader = new THREE.TextureLoader();

let _cachedTexture: THREE.Texture | null = null;
let _loadingPromise: Promise<THREE.Texture> | null = null;

/**
 * Load the block texture atlas from the API, caching it for reuse.
 *
 * @param {number} size Atlas tile size in pixels (default 256).
 * @returns {Promise<THREE.Texture>} Loaded Three.js texture.
 */
export async function loadAtlasTexture(size = 256): Promise<THREE.Texture> {
  if (_cachedTexture) return _cachedTexture;
  if (_loadingPromise)  return _loadingPromise;

  _loadingPromise = new Promise((resolve, reject) => {
    _loader.load(
      `/api/textures/atlas?size=${size}`,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        _cachedTexture = tex;
        _loadingPromise = null;
        resolve(tex);
      },
      undefined,
      (err) => {
        _loadingPromise = null;
        reject(err);
      }
    );
  });

  return _loadingPromise;
}

/**
 * Invalidate the atlas cache (call after the user uploads a new texture).
 */
export function invalidateAtlasCache(): void {
  if (_cachedTexture) {
    _cachedTexture.dispose();
    _cachedTexture = null;
  }
  _loadingPromise = null;
}

/**
 * Compute UV rect for a tile ID in the 16×16 atlas.
 *
 * @param {number} tileId Tile index (0–255).
 * @returns {{ u: number; v: number; u1: number; v1: number }} UV corners.
 */
export function tileUVRect(tileId: number): { u: number; v: number; u1: number; v1: number } {
  const col = tileId % ATLAS_COLS;
  const row = Math.floor(tileId / ATLAS_COLS);
  return {
    u:  col / ATLAS_COLS,
    v:  1 - (row + 1) / ATLAS_ROWS,
    u1: (col + 1) / ATLAS_COLS,
    v1: 1 - row / ATLAS_ROWS,
  };
}
