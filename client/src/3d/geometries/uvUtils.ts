/**
 * @fileoverview Block geometry utilities — UV helpers.
 *
 * Shared UV calculation logic for all block shapes.
 * The texture atlas is a 16×16 grid; each tile ID maps to a (col, row) cell.
 *
 * UV origin in Three.js: bottom-left = (0,0), top-right = (1,1).
 * The atlas has row 0 at the top, so we flip: v = 1 - row/16.
 *
 * Ported from starmade_gl.js (StarOS project, @Blackcancer).
 *
 * @author InitSysRev
 * @version 1.0.0
 */

/** Number of tiles per row/column in the atlas. */
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;

/**
 * Compute normalised UV coordinates for a tile ID.
 *
 * @param {number} tileId Atlas tile ID (0–255 for a 16×16 atlas).
 * @returns {{ x: number; y: number; x1: number; y1: number }}
 *   UV rect: (x, y) = bottom-left corner, (x1, y1) = top-right corner.
 */
export function tileUV(tileId: number): { x: number; y: number; x1: number; y1: number } {
  const col = tileId % ATLAS_COLS;
  const row = Math.floor(tileId / ATLAS_COLS);
  return {
    x:  col       / ATLAS_COLS,
    y:  1 - (row + 1) / ATLAS_ROWS,   // flip Y axis
    x1: (col + 1) / ATLAS_COLS,
    y1: 1 - row       / ATLAS_ROWS,
  };
}

/**
 * Build a flat UV array for one quad (two triangles), given tile ID.
 *
 * Triangle 0: (x,y1)  (x1,y1)  (x,y)    → vertices 0,1,2
 * Triangle 1: (x1,y1) (x1,y)   (x,y)    → vertices 3,4,5
 *
 * @param {number} tileId Atlas tile ID.
 * @returns {number[]} 12 UV floats (2 per vertex × 6 vertices).
 */
export function quadUVs(tileId: number): number[] {
  const { x, y, x1, y1 } = tileUV(tileId);
  // tri 0 and tri 1 sharing the quad corners
  return [
    x,  y1,   x1, y1,   x,  y,    // triangle 0
    x1, y1,   x1, y,    x,  y,    // triangle 1
  ];
}
