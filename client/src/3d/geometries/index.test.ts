import { describe, expect, it } from 'vitest';
import { blockStyleName, makeBlockGeometry, needsDoubleSide } from './index.js';

const textures = [1, 2, 3, 4, 5, 6];

function counts(style: number, individualSides = 6) {
  const geometry = makeBlockGeometry(style, textures, individualSides);
  const result = {
    position: geometry.getAttribute('position').count,
    uv: geometry.getAttribute('uv').count,
    normal: geometry.getAttribute('normal').count,
  };
  geometry.dispose();
  return result;
}

describe('geometry factory', () => {
  it.each([
    [0, 36],
    [1, 24],
    [2, 18],
    [3, 12],
    [4, 12],
    [5, 30],
    [6, 36],
    [999, 36],
  ])('creates style %s with matching position/uv/normal counts', (style, expected) => {
    expect(counts(style)).toEqual({ position: expected, uv: expected, normal: expected });
  });

  it('resolves material sidedness and display names', () => {
    expect(needsDoubleSide(3)).toBe(true);
    expect(needsDoubleSide(0)).toBe(false);
    expect(blockStyleName(0)).toBe('Cube');
    expect(blockStyleName(999)).toBe('Style 999');
  });

  it('supports individualSides modes for cube geometry without breaking attributes', () => {
    expect(counts(0, 1).uv).toBe(36);
    expect(counts(0, 3).uv).toBe(36);
    expect(counts(0, 6).uv).toBe(36);
  });
});
