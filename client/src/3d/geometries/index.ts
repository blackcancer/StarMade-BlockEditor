/** @fileoverview Atlas picker coordinates and native style names; geometry is supplied by StarMade-3D. */
/** Native texture page columns in the picker composite. */
export const PAGE_GRID_COLS = 4;
/** Native texture page rows in the picker composite. */
export const PAGE_GRID_ROWS = 2;
/** Tile columns in one native texture page. */
export const PAGE_COLS = 16;
/** Tile rows in one native texture page. */
export const PAGE_ROWS = 16;
/** Number of tiles in each native texture page. */
export const PAGE_TILES = 256;
/** Tile columns in the picker composite. */
export const ATLAS_COLS = 64;
/** Tile rows in the picker composite. */
export const ATLAS_ROWS = 32;
/** Return a diagnostic label for the native shape style. */
export function blockStyleName(style: number): string {
  return ['Cube', 'Wedge', 'Corner', 'Cross', 'Tetra', 'Penta', 'Normal24'][style] ?? `Style ${style}`;
}
