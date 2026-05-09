/**
 * @fileoverview Cross block geometry — BlockStyle 3.
 *
 * Port of the Cross class from starmade_gl.js (StarOS BPViewer).
 * Original: @Blackcancer / StarOS project.
 *
 * Two crossed planes (like vegetation/flora blocks).
 * Rendered with DoubleSide material so both faces are visible.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { quadUVs } from './uvUtils.js';

/**
 * Build a Cross (crossed-planes) BufferGeometry.
 *
 * @param {number[]} textureIds Atlas tile IDs. Only [0] is used for both planes.
 * @returns {THREE.BufferGeometry} Cross geometry (requires DoubleSide material).
 */
export function makeCrossGeometry(textureIds: number[]): THREE.BufferGeometry {
  const tileId = textureIds[0] ?? 0;

  // Two planes crossing at the centre:
  //  Plane 1: on the XY plane at z=0
  //  Plane 2: on the YZ plane at x=0
  const positions = new Float32Array([
    // Plane 1 (XY, z=0)
    -0.5, -0.5,  0,    0.5, -0.5,  0,   -0.5,  0.5,  0,
     0.5, -0.5,  0,    0.5,  0.5,  0,   -0.5,  0.5,  0,
    // Plane 2 (YZ, x=0)
     0,  -0.5, -0.5,   0, -0.5,  0.5,   0,  0.5, -0.5,
     0,  -0.5,  0.5,   0,  0.5,  0.5,   0,  0.5, -0.5,
  ]);

  const uvs = new Float32Array([
    ...quadUVs(tileId),
    ...quadUVs(tileId),
  ]);

  const normals = new Float32Array([
    ...Array(6).fill([0, 0, 1]).flat(),  // plane 1 front
    ...Array(6).fill([1, 0, 0]).flat(),  // plane 2
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  return geo;
}
