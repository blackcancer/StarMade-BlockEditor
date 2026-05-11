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
 * ## Opt 2 — `tileUV` look-up table (LUT)
 * `tileUV()` is called on every `buildUVArray()` invocation, which happens on
 * every animation frame for animated blocks (2×/s). The formula involves
 * integer divisions, modulos and floating-point divisions — cheap individually
 * but called for every face tile on the hot path.
 *
 * A module-level LUT pre-computes all 2048 possible results at load time:
 *   2048 entries × 4 floats × 4 bytes = 32 KB  — well within L1 cache.
 * After warm-up `tileUV(n)` becomes a single array lookup.
 *
 * ## Opt 5 — `starMadeFaceTriangles` frozen constant
 * The 6-face winding table is a pure constant — the same 12 arrays are
 * recomputed on every call to `starMadeFaceQuadUVs` / `starMadeFaceTriUVs`.
 * Freezing it as a module-level constant eliminates the switch-statement and
 * the temporary array allocations entirely.
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
export const PAGE_TILES = PAGE_COLS * PAGE_ROWS; // 256

// ── Opt 2: tileUV look-up table ───────────────────────────────────────────────

/**
 * Total number of atlas tile slots: 8 pages × 256 tiles = 2048.
 * Tile IDs 0–2047 are all valid. IDs 1024–1791 map to reserved (empty) pages;
 * their UVs point to transparent regions of the atlas PNG.
 */
const TOTAL_TILES = PAGE_GRID_COLS * PAGE_GRID_ROWS * PAGE_TILES; // 2048

/**
 * Pre-computed UV rectangles for every possible tile ID (0–2047).
 *
 * Layout: flat Float32Array, 4 floats per tile: [x, y, x1, y1]
 *   x   = left UV  (normalised, 0–1)
 *   y   = bottom UV (normalised, 0–1, Y-flipped from PNG row order)
 *   x1  = right UV
 *   y1  = top UV
 *
 * Memory: 2048 × 4 × 4 bytes = 32 kB (fits comfortably in L1 cache).
 * Built once at module load; subsequent `tileUV(n)` calls are O(1) array reads.
 */
const _tileUVLUT = (() => {
  const buf = new Float32Array(TOTAL_TILES * 4);
  for (let tileId = 0; tileId < TOTAL_TILES; tileId++) {
    const page    = Math.floor(tileId / PAGE_TILES);
    const local   = tileId % PAGE_TILES;
    const pageCol = page % PAGE_GRID_COLS;
    const pageRow = Math.floor(page / PAGE_GRID_COLS);
    const col     = pageCol * PAGE_COLS + (local % PAGE_COLS);
    const row     = pageRow * PAGE_ROWS + Math.floor(local / PAGE_COLS);
    const base    = tileId * 4;
    buf[base]     = col       / ATLAS_COLS;               // x  (left)
    buf[base + 1] = 1 - (row + 1) / ATLAS_ROWS;           // y  (bottom, Y-flipped)
    buf[base + 2] = (col + 1) / ATLAS_COLS;               // x1 (right)
    buf[base + 3] = 1 - row       / ATLAS_ROWS;           // y1 (top, Y-flipped)
  }
  return buf;
})();

/**
 * Return the normalised UV rectangle for a tile ID.
 *
 * Uses the pre-computed LUT — O(1) array reads, no arithmetic.
 * Falls back to tile 0 for out-of-range IDs (animation offsets can overshoot
 * on the last tile of a sheet; clamping silently keeps rendering stable).
 *
 * @param {number} tileId Atlas tile ID (0–2047).
 * @returns {{ x: number; y: number; x1: number; y1: number }}
 *   UV rect: (x, y) = bottom-left, (x1, y1) = top-right.
 */
export function tileUV(tileId: number): { x: number; y: number; x1: number; y1: number } {
  const id   = (tileId >= 0 && tileId < TOTAL_TILES) ? tileId : 0;
  const base = id * 4;
  return {
    x:  _tileUVLUT[base],
    y:  _tileUVLUT[base + 1],
    x1: _tileUVLUT[base + 2],
    y1: _tileUVLUT[base + 3],
  };
}

// ── Opt 5: starMadeFaceTriangles frozen constant ───────────────────────────────

export type StarMadeFace = 'front' | 'back' | 'bottom' | 'top' | 'right' | 'left';
type Corner = 'tl' | 'tr' | 'br' | 'bl';

/**
 * Per-face UV winding tables for StarOS-compatible UV mapping.
 *
 * Each face entry holds two triangle corner sequences:
 *   [triangle0_corners, triangle1_corners]
 *
 * Previously computed by a switch-statement on every call to
 * `starMadeFaceQuadUVs` / `starMadeFaceTriUVs`. Now a frozen module-level
 * constant — zero allocations, zero branching, direct property access.
 *
 * Winding order matches `starmade_gl.js` faceVertexUvs for correct texture
 * alignment on all 6 block faces.
 */
const FACE_TRIANGLES: Readonly<Record<StarMadeFace, Readonly<[readonly Corner[], readonly Corner[]]>>> = Object.freeze({
  front:  [['tr', 'br', 'tl'], ['bl', 'tl', 'br']],
  back:   [['bl', 'tl', 'br'], ['tr', 'br', 'tl']],
  bottom: [['bl', 'br', 'tl'], ['tr', 'tl', 'br']],
  top:    [['bl', 'tl', 'br'], ['tr', 'br', 'tl']],
  right:  [['tr', 'br', 'tl'], ['bl', 'tl', 'br']],
  left:   [['tr', 'tl', 'br'], ['bl', 'br', 'tl']],
});

/**
 * Build 6 UV floats for one triangle of a face, given a tile ID and corner sequence.
 *
 * Inline helper — avoids the intermediate array allocation that the old
 * `starMadeFaceTriangles()` + `starMadeTriangle()` pair produced.
 */
function triangleUVs(tileId: number, corners: readonly Corner[]): number[] {
  const { x, y, x1, y1 } = tileUV(tileId);
  const pts: Record<Corner, readonly [number, number]> = {
    tl: [x, y1],
    tr: [x1, y1],
    br: [x1, y],
    bl: [x, y],
  };
  return corners.flatMap(c => pts[c]);
}

// ── Public UV builders ────────────────────────────────────────────────────────

/**
 * Build a flat UV array for one quad (two triangles), given tile ID.
 *
 * Vertex layout (6 vertices, 12 UV floats):
 *   Triangle 0: (x,y)  (x1,y)  (x,y1)    — bottom-left, bottom-right, top-left
 *   Triangle 1: (x1,y) (x1,y1) (x,y1)    — bottom-right, top-right, top-left
 *
 * @param {number} tileId Atlas tile ID (0–2047).
 * @returns {number[]} 12 UV floats (2 per vertex × 6 vertices).
 */
export function quadUVs(tileId: number): number[] {
  const { x, y, x1, y1 } = tileUV(tileId);
  return [
    x,  y,    x1, y,    x,  y1,   // triangle 0
    x1, y,    x1, y1,   x,  y1,   // triangle 1
  ];
}

/**
 * StarOS-compatible UV winding for a full face quad (2 triangles × 3 vertices = 12 floats).
 *
 * Uses the pre-computed FACE_TRIANGLES constant — no switch, no allocation.
 *
 * @param {number}       tileId Atlas tile ID.
 * @param {StarMadeFace} face   Face name.
 * @returns {number[]} 12 UV floats.
 */
export function starMadeFaceQuadUVs(tileId: number, face: StarMadeFace): number[] {
  const [tri0, tri1] = FACE_TRIANGLES[face];
  return [...triangleUVs(tileId, tri0), ...triangleUVs(tileId, tri1)];
}

/**
 * StarOS-compatible UV winding for a single triangle from a named face (6 floats).
 *
 * `triangleIndex` is 0 for the first triangle of that face in starmade_gl.js,
 * 1 for the second.
 *
 * @param {number}       tileId         Atlas tile ID.
 * @param {StarMadeFace} face           Face name.
 * @param {0 | 1}        triangleIndex  Which triangle of the face (default 0).
 * @returns {number[]} 6 UV floats.
 */
export function starMadeFaceTriUVs(tileId: number, face: StarMadeFace, triangleIndex = 0): number[] {
  const corners = FACE_TRIANGLES[face][Math.max(0, Math.min(1, triangleIndex)) as 0 | 1];
  return triangleUVs(tileId, corners);
}
