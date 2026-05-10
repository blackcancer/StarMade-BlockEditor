/**
 * @fileoverview Tetra and Penta block geometries — BlockStyles 4 and 5.
 *
 * Port of the Tetra and Penta classes from starmade_gl.js (StarOS BPViewer).
 * Original: @Blackcancer / StarOS project.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { starMadeFaceQuadUVs, starMadeFaceTriUVs } from './uvUtils.js';

// =============================================================================
// TETRA — BlockStyle 4
// =============================================================================

/**
 * Build a Tetra BufferGeometry.
 *
 * A tetrahedron with 4 vertices and 4 triangular faces.
 *
 * Vertices:
 *   0: (-0.5, -0.5,  0.5)
 *   1: ( 0.5, -0.5,  0.5)
 *   2: (-0.5,  0.5,  0.5)
 *   3: (-0.5, -0.5, -0.5)
 *
 * Faces (from starmade_gl.js):
 *   front  (0,1,2) · bottom (0,3,1) · top (2,1,3) · left (0,2,3)
 *
 * @param {number[]} textureIds Atlas tile IDs [front, back, top, bottom, right, left].
 * @returns {THREE.BufferGeometry} Tetrahedron geometry.
 */
export function makeTetraGeometry(textureIds: number[]): THREE.BufferGeometry {
  const frontId  = textureIds[0] ?? 0;
  const topId    = textureIds[2] ?? frontId;
  const bottomId = textureIds[3] ?? topId ?? frontId;
  const leftId   = textureIds[5] ?? textureIds[4] ?? frontId;

  const V: [number, number, number][] = [
    [-0.5, -0.5,  0.5],  // 0
    [ 0.5, -0.5,  0.5],  // 1
    [-0.5,  0.5,  0.5],  // 2
    [-0.5, -0.5, -0.5],  // 3
  ];

  function tri(...idx: number[]): number[] {
    return idx.flatMap(i => V[i]);
  }

  const positions = new Float32Array([
    ...tri(0, 1, 2),   // front
    ...tri(0, 3, 1),   // bottom
    ...tri(2, 1, 3),   // top
    ...tri(0, 2, 3),   // left
  ]);

  const uvs = new Float32Array([
    ...starMadeFaceTriUVs(frontId, 'front', 0),
    ...starMadeFaceTriUVs(bottomId, 'bottom', 0),
    ...starMadeFaceTriUVs(topId, 'top', 0),
    ...starMadeFaceTriUVs(leftId, 'left', 0),
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  geo.computeVertexNormals();
  return geo;
}

// =============================================================================
// PENTA — BlockStyle 5
// =============================================================================

/**
 * Build a Penta BufferGeometry.
 *
 * A pentagon prism (hepta-family block):
 * front quad, back triangle, bottom quad, sloped top, right tri, left sides.
 *
 * Vertices:
 *   0: (-0.5, -0.5,  0.5)
 *   1: ( 0.5, -0.5,  0.5)
 *   2: (-0.5,  0.5,  0.5)
 *   3: ( 0.5,  0.5,  0.5)
 *   4: (-0.5, -0.5, -0.5)
 *   5: ( 0.5, -0.5, -0.5)
 *   6: (-0.5,  0.5, -0.5)
 *
 * Faces (from starmade_gl.js):
 *   front  (0,1,2)+(3,2,1) · back (4,6,5) · bottom (0,4,1)+(5,1,4)
 *   top    (2,3,6)+(5,6,3) · right (1,5,3) · left (0,2,4)+(6,4,2)
 *
 * @param {number[]} textureIds Atlas tile IDs [front, back, top, bottom, right, left].
 * @returns {THREE.BufferGeometry} Pentagon prism geometry.
 */
export function makePentaGeometry(textureIds: number[]): THREE.BufferGeometry {
  const frontId  = textureIds[0] ?? 0;
  const backId   = textureIds[1] ?? textureIds[0] ?? 0;
  const topId    = textureIds[2] ?? textureIds[0] ?? 0;
  const bottomId = textureIds[3] ?? textureIds[0] ?? 0;
  const rightId  = textureIds[4] ?? textureIds[0] ?? 0;
  const leftId   = textureIds[5] ?? textureIds[0] ?? 0;

  const V: [number, number, number][] = [
    [-0.5, -0.5,  0.5],  // 0
    [ 0.5, -0.5,  0.5],  // 1
    [-0.5,  0.5,  0.5],  // 2
    [ 0.5,  0.5,  0.5],  // 3
    [-0.5, -0.5, -0.5],  // 4
    [ 0.5, -0.5, -0.5],  // 5
    [-0.5,  0.5, -0.5],  // 6
  ];

  function tri(...idx: number[]): number[] {
    return idx.flatMap(i => V[i]);
  }

  const positions = new Float32Array([
    ...tri(0, 1, 2), ...tri(3, 2, 1),  // front  (quad)
    ...tri(4, 6, 5),                    // back   (triangle)
    ...tri(0, 4, 1), ...tri(5, 1, 4),  // bottom (quad)
    ...tri(2, 3, 6), ...tri(5, 6, 3),  // top    (quad slope)
    ...tri(1, 5, 3),                    // right  (triangle)
    ...tri(0, 2, 4), ...tri(6, 4, 2),  // left   (quad)
  ]);

  const uvs = new Float32Array([
    ...starMadeFaceQuadUVs(frontId, 'front'),
    ...starMadeFaceTriUVs(backId, 'back', 0),
    ...starMadeFaceQuadUVs(bottomId, 'bottom'),
    ...starMadeFaceQuadUVs(topId, 'top'),
    ...starMadeFaceTriUVs(rightId, 'right', 0),
    ...starMadeFaceQuadUVs(leftId, 'left'),
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  geo.computeVertexNormals();
  return geo;
}
