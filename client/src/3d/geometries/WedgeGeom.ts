/**
 * @fileoverview Wedge block geometry — BlockStyle 1.
 *
 * Port of the Wedge class from starmade_gl.js (StarOS BPViewer).
 * Original: @Blackcancer / StarOS project.
 *
 * A wedge is a triangular prism: front quad, bottom quad,
 * sloped top quad, plus right and left triangles.
 *
 * Vertices:
 *   0: (-0.5, -0.5,  0.5)
 *   1: ( 0.5, -0.5,  0.5)
 *   2: (-0.5,  0.5,  0.5)
 *   3: ( 0.5,  0.5,  0.5)
 *   4: (-0.5, -0.5, -0.5)
 *   5: ( 0.5, -0.5, -0.5)
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { quadUVs, tileUV } from './uvUtils.js';

/**
 * Build a Wedge BufferGeometry.
 *
 * @param {number[]} textureIds Atlas tile IDs [front, bottom, top_slope, right, left].
 * @returns {THREE.BufferGeometry} Wedge geometry.
 */
export function makeWedgeGeometry(textureIds: number[]): THREE.BufferGeometry {
  const frontId  = textureIds[0] ?? 0;
  const bottomId = textureIds[3] ?? textureIds[0] ?? 0;
  const topId    = textureIds[2] ?? textureIds[0] ?? 0;
  const rightId  = textureIds[4] ?? textureIds[0] ?? 0;
  const leftId   = textureIds[5] ?? textureIds[0] ?? 0;

  // ── Positions ─────────────────────────────────────────────────────────────
  // Front quad (0,1,2 and 3,2,1 → face3 style → 2 tris)
  // Bottom quad (0,4,1 and 5,1,4)
  // Top slope   (2,3,4 and 5,4,3)
  // Right tri   (1,5,3)
  // Left tri    (0,2,4)
  const positions = new Float32Array([
    // Front (0,1,2) + (3,2,1)
    -0.5, -0.5,  0.5,    0.5, -0.5,  0.5,   -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,   -0.5,  0.5,  0.5,    0.5, -0.5,  0.5,
    // Bottom (0,4,1) + (5,1,4)
    -0.5, -0.5,  0.5,   -0.5, -0.5, -0.5,    0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,    0.5, -0.5,  0.5,   -0.5, -0.5, -0.5,
    // Top slope (2,3,4) + (5,4,3)
    -0.5,  0.5,  0.5,    0.5,  0.5,  0.5,   -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,   -0.5, -0.5, -0.5,    0.5,  0.5,  0.5,
    // Right triangle (1,5,3)
     0.5, -0.5,  0.5,    0.5, -0.5, -0.5,    0.5,  0.5,  0.5,
    // Left triangle (0,2,4)
    -0.5, -0.5,  0.5,   -0.5,  0.5,  0.5,   -0.5, -0.5, -0.5,
  ]);

  // ── UVs ───────────────────────────────────────────────────────────────────
  const { x, y, x1, y1 } = tileUV(rightId);
  // Triangles: use the lower-right half of the tile
  const triUV = [x, y1, x1, y, x, y];   // right triangle
  const triUVL = [x, y1, x1, y1, x, y]; // left triangle

  const uvs = new Float32Array([
    ...quadUVs(frontId),
    ...quadUVs(bottomId),
    ...quadUVs(topId),
    ...triUV,
    ...triUVL,
  ]);

  // ── Normals (approximate) ─────────────────────────────────────────────────
  const slopeN = new THREE.Vector3(0, 1, 1).normalize();
  const normals = new Float32Array([
    ...Array(6).fill([0,  0,  1]).flat(),                             // front
    ...Array(6).fill([0, -1,  0]).flat(),                             // bottom
    ...Array(6).fill([slopeN.x, slopeN.y, slopeN.z]).flat().slice(0, 18), // top slope
    1, 0, 0,  1, 0, 0,  1, 0, 0,                                     // right
   -1, 0, 0, -1, 0, 0, -1, 0, 0,                                     // left
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  geo.computeVertexNormals(); // recompute for correct shading
  return geo;
}
