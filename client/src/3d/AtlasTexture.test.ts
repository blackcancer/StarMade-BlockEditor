import { describe, expect, it } from 'vitest';
import { ATLAS_COLS, ATLAS_ROWS, PAGE_GRID_COLS, PAGE_GRID_ROWS, tileUVRect } from './AtlasTexture.js';

describe('AtlasTexture constants/helpers', () => {
  it('uses the StarMade 4x2 composite atlas layout', () => {
    expect(PAGE_GRID_COLS).toBe(4);
    expect(PAGE_GRID_ROWS).toBe(2);
    expect(ATLAS_COLS).toBe(64);
    expect(ATLAS_ROWS).toBe(32);
  });

  it('maps tile IDs to UV rects in the composite atlas', () => {
    expect(tileUVRect(0)).toEqual({ u: 0, v: 31 / 32, u1: 1 / 64, v1: 1 });
    expect(tileUVRect(256).u).toBeCloseTo(16 / 64);
    expect(tileUVRect(1792).u).toBeCloseTo(48 / 64);
    expect(tileUVRect(1792).v).toBeCloseTo(15 / 32);
  });
});
