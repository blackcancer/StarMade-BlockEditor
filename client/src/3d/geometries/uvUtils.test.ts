import { describe, expect, it } from 'vitest';
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  PAGE_TILES,
  quadUVs,
  starMadeFaceQuadUVs,
  starMadeFaceTriUVs,
  tileUV,
} from './uvUtils.js';

describe('uvUtils', () => {
  it('maps vanilla, t003 and custom layers into the 4x2 composite atlas', () => {
    expect(tileUV(0)).toEqual({ x: 0, y: 31 / 32, x1: 1 / ATLAS_COLS, y1: 1 });
    expect(tileUV(768).x).toBeCloseTo(48 / ATLAS_COLS); // t003 starts on page column 3
    expect(tileUV(1792).x).toBeCloseTo(48 / ATLAS_COLS); // custom page starts on layer 7
    expect(tileUV(1792).y).toBeCloseTo(15 / ATLAS_ROWS);
    expect(PAGE_TILES).toBe(256);
  });

  it('keeps quad textures upright for the current vertex winding', () => {
    const uv = quadUVs(0);
    expect(uv).toHaveLength(12);
    expect(uv.slice(0, 6)).toEqual([0, 31 / 32, 1 / 64, 31 / 32, 0, 1]);
  });

  it('generates StarMade face UVs and clamps triangle indices', () => {
    expect(starMadeFaceQuadUVs(0, 'front')).toHaveLength(12);
    expect(starMadeFaceTriUVs(0, 'left', -5)).toEqual(starMadeFaceTriUVs(0, 'left', 0));
    expect(starMadeFaceTriUVs(0, 'left', 99)).toEqual(starMadeFaceTriUVs(0, 'left', 1));
  });
});
