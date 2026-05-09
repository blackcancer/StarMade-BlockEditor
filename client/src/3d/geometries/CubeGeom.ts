/**
 * @fileoverview Cube block geometry — BlockStyle 0.
 *
 * Faithful port of the Cube class from starmade_gl.js (StarOS BPViewer).
 * Original: @Blackcancer / StarOS project.
 *
 * Supports IndividualSides modes:
 *   1 — all 6 faces use the same texture tile (textureId[0])
 *   3 — front/back use tile [0], top/bottom tile [1], sides tile [2]
 *   6 — each face has its own tile: [front, back, top, bottom, right, left]
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { quadUVs } from './uvUtils.js';

/**
 * Build a Cube BufferGeometry with per-face UV mapping from the atlas.
 *
 * Vertices (same as starmade_gl.js):
 *   0: (-0.5, -0.5,  0.5)  front-bottom-left
 *   1: ( 0.5, -0.5,  0.5)  front-bottom-right
 *   2: (-0.5,  0.5,  0.5)  front-top-left
 *   3: ( 0.5,  0.5,  0.5)  front-top-right
 *   4: (-0.5, -0.5, -0.5)  back-bottom-left
 *   5: ( 0.5, -0.5, -0.5)  back-bottom-right
 *   6: (-0.5,  0.5, -0.5)  back-top-left
 *   7: ( 0.5,  0.5, -0.5)  back-top-right
 *
 * @param {number[]} textureIds 6 atlas tile IDs [front, back, top, bottom, right, left].
 * @param {number} individualSides UV mode: 1 | 3 | 6.
 * @returns {THREE.BufferGeometry} Geometry ready for MeshStandardMaterial with atlasMap.
 */
export function makeCubeGeometry(
  textureIds: number[],
  individualSides: number = 1,
): THREE.BufferGeometry {
  // ── Choose tile IDs per face ──────────────────────────────────────────────
  let frontId: number, backId: number, topId: number, bottomId: number, rightId: number, leftId: number;
  switch (individualSides) {
    case 6:
      [frontId, backId, topId, bottomId, rightId, leftId] = textureIds;
      break;
    case 3:
      frontId  = backId  = textureIds[0] ?? 0;
      topId    = bottomId = textureIds[1] ?? 0;
      rightId  = leftId  = textureIds[2] ?? 0;
      break;
    default: // 1
      frontId = backId = topId = bottomId = rightId = leftId = textureIds[0] ?? 0;
  }

  // ── Vertex positions (6 quads × 2 tris × 3 verts = 36 vertices) ─────────
  const positions = new Float32Array([
    // Front  (z =  0.5)
    -0.5, -0.5,  0.5,    0.5, -0.5,  0.5,   -0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,    0.5,  0.5,  0.5,   -0.5,  0.5,  0.5,
    // Back   (z = -0.5)
     0.5, -0.5, -0.5,   -0.5, -0.5, -0.5,    0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,   -0.5,  0.5, -0.5,    0.5,  0.5, -0.5,
    // Top    (y =  0.5)
    -0.5,  0.5,  0.5,    0.5,  0.5,  0.5,   -0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,    0.5,  0.5, -0.5,   -0.5,  0.5, -0.5,
    // Bottom (y = -0.5)
    -0.5, -0.5, -0.5,    0.5, -0.5, -0.5,   -0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,    0.5, -0.5,  0.5,   -0.5, -0.5,  0.5,
    // Right  (x =  0.5)
     0.5, -0.5,  0.5,    0.5, -0.5, -0.5,    0.5,  0.5,  0.5,
     0.5, -0.5, -0.5,    0.5,  0.5, -0.5,    0.5,  0.5,  0.5,
    // Left   (x = -0.5)
    -0.5, -0.5, -0.5,   -0.5, -0.5,  0.5,   -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,   -0.5,  0.5,  0.5,   -0.5,  0.5, -0.5,
  ]);

  // ── Face normals ─────────────────────────────────────────────────────────
  const normals = new Float32Array([
    ...Array(6).fill([ 0,  0,  1]).flat(),  // front
    ...Array(6).fill([ 0,  0, -1]).flat(),  // back
    ...Array(6).fill([ 0,  1,  0]).flat(),  // top
    ...Array(6).fill([ 0, -1,  0]).flat(),  // bottom
    ...Array(6).fill([ 1,  0,  0]).flat(),  // right
    ...Array(6).fill([-1,  0,  0]).flat(),  // left
  ]);

  // ── UVs per face ─────────────────────────────────────────────────────────
  const uvs = new Float32Array([
    ...quadUVs(frontId),
    ...quadUVs(backId),
    ...quadUVs(topId),
    ...quadUVs(bottomId),
    ...quadUVs(rightId),
    ...quadUVs(leftId),
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  return geo;
}
