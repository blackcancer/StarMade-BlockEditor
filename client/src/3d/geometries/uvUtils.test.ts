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

  // ── Opt 2: tileUV LUT ─────────────────────────────────────────────────────
  it('tileUV LUT: same result as the reference formula for all 2048 tile IDs', () => {
    // Reference formula (same logic as the old runtime version)
    function tileUV_ref(tileId: number) {
      const ATLAS_COLS = 64, ATLAS_ROWS = 32, PAGE_COLS = 16, PAGE_ROWS = 16;
      const PAGE_TILES = 256, PAGE_GRID_COLS = 4;
      const page    = Math.floor(tileId / PAGE_TILES);
      const local   = tileId % PAGE_TILES;
      const pageCol = page % PAGE_GRID_COLS;
      const pageRow = Math.floor(page / PAGE_GRID_COLS);
      const col     = pageCol * PAGE_COLS + (local % PAGE_COLS);
      const row     = pageRow * PAGE_ROWS + Math.floor(local / PAGE_COLS);
      return {
        x:  col       / ATLAS_COLS,
        y:  1 - (row + 1) / ATLAS_ROWS,
        x1: (col + 1) / ATLAS_COLS,
        y1: 1 - row       / ATLAS_ROWS,
      };
    }
    for (let id = 0; id < 2048; id++) {
      const lut = tileUV(id);
      const ref = tileUV_ref(id);
      expect(lut.x).toBeCloseTo(ref.x,  8);
      expect(lut.y).toBeCloseTo(ref.y,  8);
      expect(lut.x1).toBeCloseTo(ref.x1, 8);
      expect(lut.y1).toBeCloseTo(ref.y1, 8);
    }
  });

  it('tileUV LUT: out-of-range tile ID falls back to tile 0', () => {
    const tile0 = tileUV(0);
    expect(tileUV(-1)).toEqual(tile0);
    expect(tileUV(2048)).toEqual(tile0);
    expect(tileUV(9999)).toEqual(tile0);
  });

  // ── Opt 5: starMadeFaceTriangles constant ───────────────────────────────
  it('starMadeFaceQuadUVs produces consistent results for all 6 faces', () => {
    const faces = ['front', 'back', 'top', 'bottom', 'right', 'left'] as const;
    for (const face of faces) {
      const uv = starMadeFaceQuadUVs(42, face);
      expect(uv).toHaveLength(12); // 2 triangles × 3 vertices × 2 UV coords
      // All UV values must be in [0, 1]
      expect(uv.every(v => v >= 0 && v <= 1)).toBe(true);
    }
  });

  it('starMadeFaceTriUVs triangle 0 and 1 differ for each face', () => {
    const faces = ['front', 'back', 'top', 'bottom', 'right', 'left'] as const;
    for (const face of faces) {
      const t0 = starMadeFaceTriUVs(10, face, 0);
      const t1 = starMadeFaceTriUVs(10, face, 1);
      expect(t0).toHaveLength(6); // 1 triangle × 3 vertices × 2 UV coords
      expect(t1).toHaveLength(6);
      // The two triangles of a quad should differ (they cover different corners)
      expect(t0).not.toEqual(t1);
    }
  });
});
