/**
 * @fileoverview Block geometry factory.
 *
 * Central dispatch: given a blockStyle (0–5) and texture IDs,
 * returns the appropriate THREE.BufferGeometry.
 *
 * BlockStyle mapping (from BlockConfig.xml + starmade_gl.js):
 *   0 = Cube    (most blocks)
 *   1 = Wedge   (sloped/roof)
 *   2 = Corner  (L-corner)
 *   3 = Cross   (flora, double-plane)
 *   4 = Tetra   (tetrahedron)
 *   5 = Penta   (pentagon prism)
 *   6 = Hepta   (treated as Cube for now — rare hull variant)
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import * as THREE from 'three';
import { makeCubeGeometry }         from './CubeGeom.js';
import { makeWedgeGeometry }        from './WedgeGeom.js';
import { makeCornerGeometry }       from './CornerGeom.js';
import { makeCrossGeometry }        from './CrossGeom.js';
import { makeTetraGeometry, makePentaGeometry } from './TetraPentaGeom.js';

export { ATLAS_COLS, ATLAS_ROWS, PAGE_COLS, PAGE_ROWS, PAGE_TILES, PAGE_GRID_COLS, PAGE_GRID_ROWS, tileUV, quadUVs } from './uvUtils.js';

/**
 * Build the Three.js BufferGeometry for a StarMade block.
 *
 * @param {number} blockStyle    Block shape style (0–5 from BlockConfig).
 * @param {number[]} textureIds  6 atlas tile IDs [front, back, top, bottom, right, left].
 * @param {number} individualSides UV mapping mode (1=all same, 3=top/bottom diff, 6=all diff).
 * @returns {THREE.BufferGeometry} Geometry ready for use with a textured material.
 */
export function makeBlockGeometry(
  blockStyle:      number,
  textureIds:      number[],
  individualSides: number = 1,
): THREE.BufferGeometry {
  switch (blockStyle) {
    case 1: return makeWedgeGeometry(textureIds);
    case 2: return makeCornerGeometry(textureIds);
    case 3: return makeCrossGeometry(textureIds);
    case 4: return makeTetraGeometry(textureIds);
    case 5: return makePentaGeometry(textureIds);
    default:
      // Cube (0) + Hepta (6) + unknown
      return makeCubeGeometry(textureIds, individualSides);
  }
}

/**
 * Whether a block style requires a DoubleSide material.
 *
 * @param {number} blockStyle Block style.
 * @returns {boolean} True for Cross (style 3).
 */
export function needsDoubleSide(blockStyle: number): boolean {
  return blockStyle === 3;
}

/**
 * Human-readable name for a block style.
 *
 * @param {number} blockStyle Block style.
 * @returns {string} Display name.
 */
export function blockStyleName(blockStyle: number): string {
  switch (blockStyle) {
    case 0: return 'Cube';
    case 1: return 'Wedge';
    case 2: return 'Corner';
    case 3: return 'Cross';
    case 4: return 'Tetra';
    case 5: return 'Penta';
    case 6: return 'Hepta';
    default: return `Style ${blockStyle}`;
  }
}
