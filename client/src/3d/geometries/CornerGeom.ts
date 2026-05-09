/**
 * @fileoverview Corner block geometry — BlockStyle 2.
 *
 * Port of the Corner class from starmade_gl.js (StarOS BPViewer).
 * Original: @Blackcancer / StarOS project.
 *
 * A corner is a 5-vertex shape: 3 quad faces + 2 triangle faces,
 * forming a corner wedge.
 *
 * Vertices:
 *   0: (-0.5, -0.5,  0.5)
 *   1: ( 0.5, -0.5,  0.5)
 *   2: (-0.5,  0.5,  0.5)
 *   3: (-0.5, -0.5, -0.5)
 *   4: ( 0.5, -0.5, -0.5)
 *
 * Faces (Face3 indices from starmade_gl.js):
 *   front:  (0,1,2)
 *   back:   (3,2,4)  ← note: not a full quad, 1 triangle
 *   bottom: (0,3,1) + (4,1,3)
 *   right:  (1,4,2)
 *   left:   (0,2,3)
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { quadUVs, tileUV } from './uvUtils.js';

/**
 * Build a Corner BufferGeometry.
 *
 * @param {number[]} textureIds Atlas tile IDs [front, back, _, bottom, right, left].
 * @returns {THREE.BufferGeometry} Corner geometry.
 */
export function makeCornerGeometry(textureIds: number[]): THREE.BufferGeometry {
  const frontId  = textureIds[0] ?? 0;
  const backId   = textureIds[1] ?? textureIds[0] ?? 0;
  const bottomId = textureIds[3] ?? textureIds[0] ?? 0;
  const rightId  = textureIds[4] ?? textureIds[0] ?? 0;
  const leftId   = textureIds[5] ?? textureIds[0] ?? 0;

  // Vertices: 0=(−½,−½,½) 1=(½,−½,½) 2=(−½,½,½) 3=(−½,−½,−½) 4=(½,−½,−½)
  const V = [
    [-0.5, -0.5,  0.5],  // 0
    [ 0.5, -0.5,  0.5],  // 1
    [-0.5,  0.5,  0.5],  // 2
    [-0.5, -0.5, -0.5],  // 3
    [ 0.5, -0.5, -0.5],  // 4
  ];

  function tri(...idx: number[]): number[] {
    return idx.flatMap(i => V[i]);
  }

  const positions = new Float32Array([
    ...tri(0, 1, 2),          // front triangle
    ...tri(3, 2, 4),          // back triangle
    ...tri(0, 3, 1),          // bottom tri 0
    ...tri(4, 1, 3),          // bottom tri 1
    ...tri(1, 4, 2),          // right triangle
    ...tri(0, 2, 3),          // left triangle
  ]);

  const { x, y, x1, y1 } = tileUV(frontId);
  const { x: bx, y: by, x1: bx1, y1: by1 } = tileUV(backId);

  const uvs = new Float32Array([
    // front tri
    x, y1, x1, y1, x, y,
    // back tri
    bx, by1, bx1, by, bx1, by1,
    // bottom quad
    ...quadUVs(bottomId),
    // right tri
    tileUV(rightId).x, tileUV(rightId).y1,
    tileUV(rightId).x1, tileUV(rightId).y,
    tileUV(rightId).x, tileUV(rightId).y,
    // left tri
    tileUV(leftId).x, tileUV(leftId).y1,
    tileUV(leftId).x, tileUV(leftId).y,
    tileUV(leftId).x1, tileUV(leftId).y,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  geo.computeVertexNormals();
  return geo;
}
