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

/**
 * Composite atlas layout:
 *  - vanilla t000/t001/t002/t003 pages
 *  - reserved layers 4/5/6
 *  - custom.png on layer 7, matching the engine/editor texture mapping.
 * arranged in a 4×2 page grid, each page being 16×16 tiles.
 */
export const PAGE_GRID_COLS = 4;
export const PAGE_GRID_ROWS = 2;
export const ATLAS_COLS = 64;
export const ATLAS_ROWS = 32;
export const PAGE_COLS = 16;
export const PAGE_ROWS = 16;
export const PAGE_TILES = PAGE_COLS * PAGE_ROWS;

/**
 * Compute normalised UV coordinates for a tile ID.
 *
 * @param {number} tileId Atlas tile ID (0–255 for a 16×16 atlas).
 * @returns {{ x: number; y: number; x1: number; y1: number }}
 *   UV rect: (x, y) = bottom-left corner, (x1, y1) = top-right corner.
 */
export function tileUV(tileId: number): { x: number; y: number; x1: number; y1: number } {
  const page = Math.floor(tileId / PAGE_TILES);
  const local = tileId % PAGE_TILES;
  const pageCol = page % PAGE_GRID_COLS;
  const pageRow = Math.floor(page / PAGE_GRID_COLS);
  const col = pageCol * PAGE_COLS + (local % PAGE_COLS);
  const row = pageRow * PAGE_ROWS + Math.floor(local / PAGE_COLS);
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
  // Vertex order used by Cube/Cross quads:
  // triangle 0 = bottom-left, bottom-right, top-left
  // triangle 1 = bottom-right, top-right, top-left
  // Keep text/images upright: left→right and bottom→top on the face.
  return [
    x,  y,    x1, y,    x,  y1,   // triangle 0
    x1, y,    x1, y1,   x,  y1,   // triangle 1
  ];
}

export type StarMadeFace = 'front' | 'back' | 'bottom' | 'top' | 'right' | 'left';

function starMadeFaceTriangles(face: StarMadeFace): [Array<'tl' | 'tr' | 'br' | 'bl'>, Array<'tl' | 'tr' | 'br' | 'bl'>] {
  switch (face) {
    case 'front':
      return [['tr', 'br', 'tl'], ['bl', 'tl', 'br']];
    case 'back':
      return [['bl', 'tl', 'br'], ['tr', 'br', 'tl']];
    case 'bottom':
      return [['bl', 'br', 'tl'], ['tr', 'tl', 'br']];
    case 'top':
      return [['bl', 'tl', 'br'], ['tr', 'br', 'tl']];
    case 'right':
      return [['tr', 'br', 'tl'], ['bl', 'tl', 'br']];
    case 'left':
      return [['tr', 'tl', 'br'], ['bl', 'br', 'tl']];
  }
}

function starMadeTriangle(tileId: number, corners: Array<'tl' | 'tr' | 'br' | 'bl'>): number[] {
  const { x, y, x1, y1 } = tileUV(tileId);
  const points = {
    tl: [x, y1],
    tr: [x1, y1],
    br: [x1, y],
    bl: [x, y],
  } as const;
  return corners.flatMap((corner) => points[corner]);
}

/**
 * StarOS-compatible UV winding for a full face quad.
 * Matches the faceVertexUvs ordering used by starmade_gl.js for cube faces.
 */
export function starMadeFaceQuadUVs(tileId: number, face: StarMadeFace): number[] {
  const [first, second] = starMadeFaceTriangles(face);
  return [
    ...starMadeTriangle(tileId, first),
    ...starMadeTriangle(tileId, second),
  ];
}

/**
 * StarOS-compatible UV winding for a single triangle taken from a named face.
 * `triangleIndex` is 0 for the first triangle of that face in starmade_gl.js, 1 for the second.
 */
export function starMadeFaceTriUVs(tileId: number, face: StarMadeFace, triangleIndex = 0): number[] {
  const triangles = starMadeFaceTriangles(face);
  return starMadeTriangle(tileId, triangles[Math.max(0, Math.min(1, triangleIndex))]);
}
