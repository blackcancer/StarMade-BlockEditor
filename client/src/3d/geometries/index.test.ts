import { describe, expect, it } from 'vitest';
import { ATLAS_COLS, ATLAS_ROWS, PAGE_COLS, PAGE_ROWS, PAGE_TILES, PAGE_GRID_COLS, PAGE_GRID_ROWS, blockStyleName } from './index.js';
describe('picker atlas and native styles', () => {
  it('preserves the server composite coordinates including custom page seven', () => {
    expect([ATLAS_COLS, ATLAS_ROWS, PAGE_COLS, PAGE_ROWS, PAGE_TILES, PAGE_GRID_COLS, PAGE_GRID_ROWS]).toEqual([64, 32, 16, 16, 256, 4, 2]);
  });
  it('names every native style and unknown values', () => {
    expect(Array.from({length: 7}, (_, i) => blockStyleName(i))).toEqual(['Cube', 'Wedge', 'Corner', 'Cross', 'Tetra', 'Penta', 'Normal24']);
    expect(blockStyleName(99)).toBe('Style 99');
  });
});
