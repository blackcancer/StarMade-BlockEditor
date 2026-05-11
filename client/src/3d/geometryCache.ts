/**
 * @fileoverview Geometry cache and UV-update utilities for the BlockMesh viewer.
 *
 * ## Problem solved
 * Previously, `makeBlockGeometry` was called inside a `useMemo` that depended on
 * BOTH shape params (blockStyle, individualSides) AND texture IDs (effectiveTextureIds).
 * This caused a full geometry rebuild on EVERY texture change:
 *  - Animation frames  (2× per second for animated blocks)
 *  - Face tile changes (user selects a different atlas tile)
 *  - Active/inactive toggle (shifts texture IDs by +1 for hasActivationTexture)
 *
 * Each rebuild allocated new Float32Arrays for positions, normals AND UVs, created
 * new WebGL VBOs, and left the old geometry for GC — unnecessary pressure.
 *
 * ## Solution: shape cache + in-place UV update
 *
 * Shapes change rarely (only when blockStyle or individualSides changes).
 * Texture IDs change frequently (every animation frame, every face change).
 *
 * We now separate the two concerns:
 *
 *  1. **Shape cache** — `Map<"blockStyle:individualSides", BufferGeometry>` keyed only on
 *     shape params. Built once per shape, kept alive for the app lifetime.
 *     Positions and normals never change for a given shape.
 *
 *  2. **Instance geometry** — cloned from the shape cache, owns its UV attribute.
 *     Created on shape change; the UV buffer is then updated in place on texture change.
 *
 *  3. **`buildUVArray`** — standalone UV computation extracted from each geometry builder,
 *     so we can recompute only the UV data without rebuilding vertex positions/normals.
 *
 *  4. **`updateGeometryUVs`** — mutates the UV Float32Array in place and sets
 *     `needsUpdate = true`, which signals WebGL to re-upload only the UV buffer.
 *     No geometry recreation, no GC, no VBO reallocation for positions/normals.
 *
 * ## Impact
 *  - Animated blocks: 2 full geometry rebuilds/s → 0 (only UV buffer re-upload ~288 B)
 *  - Shape change (blockStyle): still creates a new instance geometry, but positions and
 *    normals are copied from the JS-side cache (no recomputation, just Float32Array.slice())
 *  - Material swap (atlas, texturePack): unchanged — material is a separate concern
 *
 * @module geometryCache
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { makeBlockGeometry } from './geometries/index.js';
import {
  quadUVs,
  starMadeFaceQuadUVs,
  starMadeFaceTriUVs,
} from './geometries/uvUtils.js';

// =============================================================================
// UV computation — per shape type
// =============================================================================

/**
 * Resolve the 6 face tile IDs from the raw textureId array and IndividualSides mode.
 *
 * @param {number[]} textureIds Raw textureId values from the block definition.
 * @param {number}   individualSides UV grouping mode (1 | 3 | 6).
 * @returns {{ f, b, top, bot, r, l }} Resolved tile IDs per face.
 */
function resolveFaceIds(
  textureIds: number[],
  individualSides: number,
): { f: number; b: number; top: number; bot: number; r: number; l: number } {
  const t = (i: number) => textureIds[i] ?? textureIds[0] ?? 0;

  switch (individualSides) {
    case 6:
      return { f: t(0), b: t(1), top: t(2), bot: t(3), r: t(4), l: t(5) };
    case 3:
      return { f: t(0), b: t(0), top: t(1), bot: t(1), r: t(2), l: t(2) };
    default: // 1 — all faces share tile [0]
      return { f: t(0), b: t(0), top: t(0), bot: t(0), r: t(0), l: t(0) };
  }
}

/**
 * Build the UV Float32Array for a Cube (BlockStyle 0 or 6).
 * 6 faces × 6 vertices × 2 UV coords = 72 floats.
 */
function buildCubeUVs(textureIds: number[], individualSides: number): Float32Array {
  const { f, b, top, bot, r, l } = resolveFaceIds(textureIds, individualSides);
  return new Float32Array([
    ...quadUVs(f),   // front
    ...quadUVs(b),   // back
    ...quadUVs(top), // top
    ...quadUVs(bot), // bottom
    ...quadUVs(r),   // right
    ...quadUVs(l),   // left
  ]);
}

/**
 * Build the UV Float32Array for a Wedge (BlockStyle 1).
 * front(12) + bottom(12) + top(12) + right-tri(6) + left-tri(6) = 48 floats.
 */
function buildWedgeUVs(textureIds: number[]): Float32Array {
  const t = (i: number) => textureIds[i] ?? textureIds[0] ?? 0;
  return new Float32Array([
    ...starMadeFaceQuadUVs(t(0), 'front'),
    ...starMadeFaceQuadUVs(textureIds[3] ?? t(0), 'bottom'),
    ...starMadeFaceQuadUVs(textureIds[2] ?? t(0), 'top'),
    ...starMadeFaceTriUVs(textureIds[4] ?? t(0), 'right', 0),
    ...starMadeFaceTriUVs(textureIds[5] ?? t(0), 'left', 0),
  ]);
}

/**
 * Build the UV Float32Array for a Corner (BlockStyle 2).
 * front-tri(6) + back-tri(6) + bottom(12) + right-tri(6) + left-tri(6) = 36 floats.
 */
function buildCornerUVs(textureIds: number[]): Float32Array {
  const t = (i: number) => textureIds[i] ?? textureIds[0] ?? 0;
  return new Float32Array([
    ...starMadeFaceTriUVs(t(0),                    'front',  0),
    ...starMadeFaceTriUVs(textureIds[1] ?? t(0),   'back',   0),
    ...starMadeFaceQuadUVs(textureIds[3] ?? t(0),  'bottom'),
    ...starMadeFaceTriUVs(textureIds[4] ?? t(0),   'right',  0),
    ...starMadeFaceTriUVs(textureIds[5] ?? t(0),   'left',   0),
  ]);
}

/**
 * Build the UV Float32Array for a Cross (BlockStyle 3).
 * Two crossed planes, both using tile [0]: 2 × 12 = 24 floats.
 */
function buildCrossUVs(textureIds: number[]): Float32Array {
  const tileId = textureIds[0] ?? 0;
  return new Float32Array([...quadUVs(tileId), ...quadUVs(tileId)]);
}

/**
 * Build the UV Float32Array for a Tetra (BlockStyle 4).
 * 4 triangles × 6 UV coords = 24 floats.
 */
function buildTetraUVs(textureIds: number[]): Float32Array {
  const frontId  = textureIds[0] ?? 0;
  const topId    = textureIds[2] ?? frontId;
  const bottomId = textureIds[3] ?? topId;
  const leftId   = textureIds[5] ?? textureIds[4] ?? frontId;
  return new Float32Array([
    ...starMadeFaceTriUVs(frontId,  'front',  0),
    ...starMadeFaceTriUVs(bottomId, 'bottom', 0),
    ...starMadeFaceTriUVs(topId,    'top',    0),
    ...starMadeFaceTriUVs(leftId,   'left',   0),
  ]);
}

/**
 * Build the UV Float32Array for a Penta (BlockStyle 5).
 * front(12) + back-tri(6) + bottom(12) + top(12) + right-tri(6) + left(12) = 60 floats.
 */
function buildPentaUVs(textureIds: number[]): Float32Array {
  const t = (i: number) => textureIds[i] ?? textureIds[0] ?? 0;
  return new Float32Array([
    ...starMadeFaceQuadUVs(t(0),                  'front'),
    ...starMadeFaceTriUVs(textureIds[1] ?? t(0),  'back',   0),
    ...starMadeFaceQuadUVs(textureIds[3] ?? t(0), 'bottom'),
    ...starMadeFaceQuadUVs(textureIds[2] ?? t(0), 'top'),
    ...starMadeFaceTriUVs(textureIds[4] ?? t(0),  'right',  0),
    ...starMadeFaceQuadUVs(textureIds[5] ?? t(0), 'left'),
  ]);
}

/**
 * Compute the UV Float32Array for any block shape.
 *
 * This is the UV-only counterpart of `makeBlockGeometry`. It computes only
 * the UV data, matching exactly the vertex layout produced by the geometry
 * builders. Used to update UV attributes in place without rebuilding geometry.
 *
 * @param {number}   blockStyle      Block mesh shape (0–6).
 * @param {number[]} textureIds      Effective per-face atlas tile IDs.
 * @param {number}   individualSides UV grouping mode (1 | 3 | 6).
 * @returns {Float32Array} UV coordinates for all vertices of the shape.
 */
export function buildUVArray(
  blockStyle:      number,
  textureIds:      number[],
  individualSides: number,
): Float32Array {
  switch (blockStyle) {
    case 1: return buildWedgeUVs(textureIds);
    case 2: return buildCornerUVs(textureIds);
    case 3: return buildCrossUVs(textureIds);
    case 4: return buildTetraUVs(textureIds);
    case 5: return buildPentaUVs(textureIds);
    default: return buildCubeUVs(textureIds, individualSides); // 0, 6, unknown
  }
}

// =============================================================================
// Shape cache
// =============================================================================

/**
 * Module-level shape geometry cache.
 *
 * Key: `"${blockStyle}:${individualSides}"`
 *
 * Stores one base geometry per unique shape. The base geometry has correct
 * positions and normals, with tile-0 UVs (placeholder — overwritten per instance).
 * Built once, kept alive for the entire app session (max 21 entries).
 */
const _shapeCache = new Map<string, THREE.BufferGeometry>();

/**
 * Get (or build and cache) the base geometry for a given shape.
 *
 * The returned geometry is owned by the cache and must NOT be disposed by callers.
 * Call `clearGeometryCache()` to release all cached geometries.
 *
 * @param {number} blockStyle      Block shape (0–6).
 * @param {number} individualSides UV mode (1 | 3 | 6) — affects UV structure for Cube.
 * @returns {THREE.BufferGeometry} Cached base geometry (do not dispose).
 */
function getOrBuildBaseGeometry(
  blockStyle:      number,
  individualSides: number,
): THREE.BufferGeometry {
  const key = `${blockStyle}:${individualSides}`;
  if (_shapeCache.has(key)) return _shapeCache.get(key)!;

  // Build with all-zero texture IDs — positions and normals are shape-only,
  // UVs will be overwritten by createInstanceGeometry / updateGeometryUVs.
  const geo = makeBlockGeometry(blockStyle, new Array(6).fill(0), individualSides);
  _shapeCache.set(key, geo);
  return geo;
}

// =============================================================================
// Instance geometry API
// =============================================================================

/**
 * Create an instance geometry for the given block configuration.
 *
 * Clones the cached base geometry (fast: just Float32Array copies) and
 * replaces the UV attribute with one computed from the actual texture IDs.
 *
 * The returned geometry is owned by the caller and must be disposed when no
 * longer needed (e.g., on shape change or component unmount).
 *
 * **When to call this:**
 *  - On block load / block change
 *  - When `blockStyle` or `individualSides` changes
 *
 * **Not needed for texture-only changes** — use `updateGeometryUVs` instead.
 *
 * @param {number}   blockStyle      Block mesh shape.
 * @param {number[]} textureIds      Effective per-face atlas tile IDs (initial UVs).
 * @param {number}   individualSides UV grouping mode.
 * @returns {THREE.BufferGeometry} New geometry owned by the caller.
 */
export function createInstanceGeometry(
  blockStyle:      number,
  textureIds:      number[],
  individualSides: number,
): THREE.BufferGeometry {
  const base = getOrBuildBaseGeometry(blockStyle, individualSides);

  // Clone the base geometry: creates independent copies of all TypedArrays.
  // This ensures disposing the instance geometry doesn't affect the cache.
  const geo = base.clone();

  // Replace the placeholder UV attribute with the real one.
  const uvArray = buildUVArray(blockStyle, textureIds, individualSides);
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

  return geo;
}

/**
 * Update the UV attribute of an existing instance geometry in place.
 *
 * **This is the hot path** — called on every texture change without rebuilding
 * the geometry. Only the UV Float32Array is mutated and re-uploaded to the GPU.
 * Positions and normals are untouched (no VBO reallocation).
 *
 * Cost: one Float32Array write + one small WebGL buffer upload (~288 B for a cube).
 *
 * **When to call this:**
 *  - Animation frame updates (every 0.5 s for animated blocks)
 *  - Active/inactive texture toggle (shifts tile IDs by +1)
 *  - Face tile assignment in the atlas picker
 *  - Any `effectiveTextureIds` change that does NOT change shape
 *
 * @param {THREE.BufferGeometry} geo            Instance geometry to update.
 * @param {number}               blockStyle      Block mesh shape.
 * @param {number[]}             textureIds      New per-face atlas tile IDs.
 * @param {number}               individualSides UV grouping mode.
 */
export function updateGeometryUVs(
  geo:             THREE.BufferGeometry,
  blockStyle:      number,
  textureIds:      number[],
  individualSides: number,
): void {
  const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
  const newUVs = buildUVArray(blockStyle, textureIds, individualSides);

  // Mutate in place — avoids any allocation.
  (uvAttr.array as Float32Array).set(newUVs);

  // Signal WebGL to re-upload this buffer on the next render frame.
  uvAttr.needsUpdate = true;
}

/**
 * Dispose all cached base geometries and clear the cache.
 *
 * Call this when the app unmounts or when the StarMade directory changes and
 * all geometry needs to be rebuilt (e.g., after atlas resolution change that
 * affects UV scale — though currently UVs are atlas-resolution-independent).
 *
 * In normal operation this is not needed since the cache is bounded (max 21 entries).
 */
export function clearGeometryCache(): void {
  for (const geo of _shapeCache.values()) geo.dispose();
  _shapeCache.clear();
}
