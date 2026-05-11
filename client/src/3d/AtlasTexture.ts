/**
 * @fileoverview Atlas texture loader with cache management for Three.js.
 *
 * Loads StarMade block diffuse and normal atlas textures from the local API
 * endpoint (`/api/textures/atlas`). The server composites multiple StarMade
 * texture pages into a single PNG image that is then used as a UV-mapped
 * texture in the 3D block preview.
 *
 * ## Atlas layout
 * The composite atlas is a 64×32 tile grid arranged in a 4 columns × 2 rows
 * page grid. Each page corresponds to one of StarMade's native texture files:
 *
 *  Page 0 → `t000.png`    (tile IDs   0–255)
 *  Page 1 → `t001.png`    (tile IDs 256–511)
 *  Page 2 → `t002.png`    (tile IDs 512–767)
 *  Page 3 → `t003.png`    (tile IDs 768–1023)
 *  Pages 4–6 → reserved/empty
 *  Page 7 → `custom.png`  (tile IDs 1792–2047)
 *
 * Each tile in the source PNG is `atlasSize` × `atlasSize` pixels
 * (64 / 128 / 256 px depending on the selected texture resolution).
 * In the composite atlas each page contains 16×16 = 256 tiles.
 *
 * ## Caching strategy
 * - A resolved `THREE.Texture` is cached by key `"pack:size:kind"` so that
 *   subsequent requests for the same atlas return the cached object instantly.
 * - Concurrent requests for the same key share a single in-flight Promise,
 *   preventing duplicate HTTP requests (request deduplication).
 * - `invalidateAtlasCache()` disposes all cached textures and clears both maps.
 *   It is called whenever a custom atlas or tile is imported.
 *
 * @module AtlasTexture
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';

// ── Atlas grid constants ──────────────────────────────────────────────────────
// These must match the values in uvUtils.ts and the server-side textures.ts.

/** Number of page columns in the composite atlas grid (4 pages wide). */
export const PAGE_GRID_COLS = 4;

/** Number of page rows in the composite atlas grid (2 pages tall). */
export const PAGE_GRID_ROWS = 2;

/** Total number of tile columns in the composite atlas (4 pages × 16 tiles). */
export const ATLAS_COLS = 64;

/** Total number of tile rows in the composite atlas (2 pages × 16 tiles). */
export const ATLAS_ROWS = 32;

/** Number of tile columns per page (one StarMade texture file = 16×16 tiles). */
export const PAGE_COLS = 16;

/** Number of tile rows per page. */
export const PAGE_ROWS = 16;

/** Total tiles per page (16 × 16 = 256). */
export const PAGE_TILES = PAGE_COLS * PAGE_ROWS;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Type of texture map to load.
 * - `'diffuse'` — RGB colour/albedo atlas (the standard texture)
 * - `'normal'`  — tangent-space normal map atlas for bump-mapping
 */
export type AtlasMapKind = 'diffuse' | 'normal';

// ── Internal caches ───────────────────────────────────────────────────────────

/** Singleton Three.js texture loader shared across all atlas loads. */
const _loader = new THREE.TextureLoader();

/**
 * Resolved texture cache.
 * Key format: `"<texturePack>:<size>:<mapKind>"` (e.g. `"Default:256:diffuse"`).
 */
const _cachedTextures = new Map<string, THREE.Texture>();

/**
 * In-flight request deduplication map.
 * If a load is already in progress for a key, new callers receive the same Promise.
 */
const _loadingPromises = new Map<string, Promise<THREE.Texture>>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load a StarMade block atlas as a Three.js `Texture`.
 *
 * Returns the cached texture immediately if it was loaded before.
 * If a load is already in progress (another caller requested the same key),
 * returns the same pending Promise to avoid duplicate HTTP requests.
 *
 * The loaded texture is configured for pixel-perfect rendering:
 * - `magFilter` and `minFilter` are set to `NearestFilter` to match StarMade's
 *   crisp, unfiltered pixel art aesthetic.
 * - `colorSpace` is set to `SRGBColorSpace` for diffuse maps (correct gamma
 *   handling) and `NoColorSpace` for normal maps (linear data).
 *
 * @param {number} [size=256]            Tile resolution in pixels (64 | 128 | 256).
 * @param {string} [texturePack='Default'] Texture pack name (subfolder under
 *                                         `data/textures/block/`).
 * @param {AtlasMapKind} [mapKind='diffuse'] Which map to load.
 * @returns {Promise<THREE.Texture>} Resolved Three.js texture ready for use.
 * @throws {Error} If the atlas PNG cannot be loaded (network or server error).
 */
export async function loadAtlasTexture(
  size = 256,
  texturePack = 'Default',
  mapKind: AtlasMapKind = 'diffuse',
): Promise<THREE.Texture> {
  const key = `${texturePack}:${size}:${mapKind}`;

  // Return from cache if already resolved.
  const cached = _cachedTextures.get(key);
  if (cached) return cached;

  // Return the in-flight promise if a load is already underway.
  const pending = _loadingPromises.get(key);
  if (pending) return pending;

  // Start a new load and register it in the dedup map.
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    _loader.load(
      `/api/textures/atlas?size=${size}&pack=${encodeURIComponent(texturePack)}&map=${mapKind}&v=4`,
      (tex) => {
        // Pixel art / nearest-neighbour filtering — matches StarMade's rendering.
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        // Diffuse maps are sRGB; normal maps carry linear tangent-space data.
        tex.colorSpace = mapKind === 'diffuse' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.needsUpdate = true;
        _cachedTextures.set(key, tex);
        _loadingPromises.delete(key);
        resolve(tex);
      },
      undefined, // onProgress — not used
      (err) => {
        _loadingPromises.delete(key);
        reject(err);
      },
    );
  });

  _loadingPromises.set(key, promise);
  return promise;
}

/**
 * Invalidate all cached atlas textures.
 *
 * Disposes every cached `THREE.Texture` (freeing GPU memory) and clears
 * both the texture cache and the in-flight request deduplication map.
 *
 * Should be called after importing a custom atlas or individual tile so that
 * the 3D viewer picks up the new texture on next render.
 */
export function invalidateAtlasCache(): void {
  for (const tex of _cachedTextures.values()) tex.dispose();
  _cachedTextures.clear();
  _loadingPromises.clear();
}

// ── UV utility ────────────────────────────────────────────────────────────────

/**
 * Compute the UV rectangle for a tile ID within the composite atlas.
 *
 * Converts a StarMade tile ID to normalised (0–1) UV coordinates for use in
 * custom canvas overlays and the atlas picker hover/selection indicators.
 *
 * Coordinate system: origin at bottom-left (Three.js / WebGL convention).
 * Y axis is flipped relative to the PNG row order.
 *
 * @param {number} tileId StarMade atlas tile ID (0–2047).
 * @returns {{ u: number; v: number; u1: number; v1: number }}
 *   Normalised UV rect: `(u, v)` = bottom-left, `(u1, v1)` = top-right.
 */
export function tileUVRect(tileId: number): { u: number; v: number; u1: number; v1: number } {
  const page = Math.floor(tileId / PAGE_TILES);
  const local = tileId % PAGE_TILES;
  const pageCol = page % PAGE_GRID_COLS;
  const pageRow = Math.floor(page / PAGE_GRID_COLS);
  const col = pageCol * PAGE_COLS + (local % PAGE_COLS);
  const row = pageRow * PAGE_ROWS + Math.floor(local / PAGE_COLS);
  return {
    u:  col / ATLAS_COLS,
    v:  1 - (row + 1) / ATLAS_ROWS, // flip Y: row 0 = top of PNG = UV v=1
    u1: (col + 1) / ATLAS_COLS,
    v1: 1 - row / ATLAS_ROWS,
  };
}
