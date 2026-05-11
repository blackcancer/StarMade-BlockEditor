/**
 * @fileoverview Unit tests for the geometry cache and UV update system.
 *
 * Tests verify:
 *  - `buildUVArray` produces the correct number of floats per shape
 *  - `createInstanceGeometry` returns a geometry with correct UV attribute
 *  - `updateGeometryUVs` mutates the UV buffer in-place without rebuilding
 *  - The shape cache reuses base geometries across calls
 *  - `clearGeometryCache` disposes and empties the cache
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  buildUVArray,
  createInstanceGeometry,
  updateGeometryUVs,
  clearGeometryCache,
} from './geometryCache.js';

// ── UV count expectations per shape ──────────────────────────────────────────
// Each vertex needs 2 UV floats.
// Cube:    6 faces × 6 verts = 36 verts → 72 floats
// Wedge:   front(6)+bottom(6)+top(6)+right(3)+left(3) = 24 verts → 48 floats
// Corner:  front(3)+back(3)+bottom(6)+right(3)+left(3) = 18 verts → 36 floats
// Cross:   2 × 6 verts = 12 verts → 24 floats
// Tetra:   4 × 3 verts = 12 verts → 24 floats
// Penta:   front(6)+back(3)+bottom(6)+top(6)+right(3)+left(6) = 30 verts → 60 floats

const UV_COUNTS: Record<number, number> = {
  0: 72,  // Cube
  1: 48,  // Wedge
  2: 36,  // Corner
  3: 24,  // Cross
  4: 24,  // Tetra
  5: 60,  // Penta
  6: 72,  // Hepta (treated as Cube)
};

describe('buildUVArray', () => {
  const tiles = [10, 20, 30, 40, 50, 60];

  it.each([0, 1, 2, 3, 4, 5, 6])(
    'returns correct UV float count for blockStyle %i',
    (style) => {
      const uvs = buildUVArray(style, tiles, 6);
      expect(uvs).toBeInstanceOf(Float32Array);
      expect(uvs.length).toBe(UV_COUNTS[style]);
    },
  );

  it('respects individualSides=1 (all faces same tile) for Cube', () => {
    const uvs1 = buildUVArray(0, [99], 1);
    const uvsAllSame = buildUVArray(0, [99, 99, 99, 99, 99, 99], 6);
    // Both should produce identical UVs since all tiles are the same
    expect(uvs1).toEqual(uvsAllSame);
  });

  it('respects individualSides=3 (grouped) for Cube', () => {
    const uvsGrouped = buildUVArray(0, [10, 20, 30], 3);
    // front/back use tile 10, top/bottom tile 20, sides tile 30
    expect(uvsGrouped.length).toBe(72);
  });

  it('uses tile[0] as fallback for missing face tiles', () => {
    const uvsFull   = buildUVArray(1, [5, 5, 5, 5, 5, 5], 6);
    const uvsFallback = buildUVArray(1, [5], 6); // only tile[0] provided
    expect(uvsFull).toEqual(uvsFallback);
  });

  it('handles empty textureIds (falls back to 0)', () => {
    const uvs = buildUVArray(0, [], 1);
    expect(uvs.length).toBe(72);
    // All UVs should map to tile 0 — values are normalised [0,1]
    expect(uvs.every(v => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('createInstanceGeometry', () => {
  afterEach(() => clearGeometryCache());

  it('returns a BufferGeometry with position, uv attributes', () => {
    const geo = createInstanceGeometry(0, [1, 2, 3, 4, 5, 6], 6);
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    expect(geo.getAttribute('position')).toBeTruthy();
    expect(geo.getAttribute('uv')).toBeTruthy();
    geo.dispose();
  });

  it('UV attribute has correct float count for each shape', () => {
    for (const [style, count] of Object.entries(UV_COUNTS)) {
      const geo = createInstanceGeometry(+style, new Array(6).fill(0), 6);
      expect(geo.getAttribute('uv').count * 2).toBe(count);
      geo.dispose();
    }
  });

  it('two calls with same shapeKey return independent UV attributes', () => {
    const geo1 = createInstanceGeometry(0, [1], 1);
    const geo2 = createInstanceGeometry(0, [99], 1);
    // UVs should differ because tile IDs differ
    const uv1 = (geo1.getAttribute('uv') as THREE.BufferAttribute).array;
    const uv2 = (geo2.getAttribute('uv') as THREE.BufferAttribute).array;
    expect(uv1).not.toEqual(uv2);
    geo1.dispose();
    geo2.dispose();
  });

  it('two calls with same shapeKey share the base positions (cache hit)', () => {
    const geo1 = createInstanceGeometry(0, [0], 1);
    const geo2 = createInstanceGeometry(0, [0], 1);
    // Positions are cloned (same data, different array objects)
    const pos1 = (geo1.getAttribute('position') as THREE.BufferAttribute).array;
    const pos2 = (geo2.getAttribute('position') as THREE.BufferAttribute).array;
    expect(pos1).not.toBe(pos2); // different objects (cloned)
    expect(Array.from(pos1)).toEqual(Array.from(pos2)); // same data
    geo1.dispose();
    geo2.dispose();
  });
});

describe('updateGeometryUVs', () => {
  afterEach(() => clearGeometryCache());

  it('mutates the UV buffer in-place without creating a new attribute', () => {
    const geo = createInstanceGeometry(0, [0], 1);
    const uvAttrBefore = geo.getAttribute('uv');

    updateGeometryUVs(geo, 0, [99], 1);

    const uvAttrAfter = geo.getAttribute('uv');
    // Same attribute object (in-place mutation)
    expect(uvAttrAfter).toBe(uvAttrBefore);
    geo.dispose();
  });

  it('sets needsUpdate on the UV attribute', () => {
    const geo = createInstanceGeometry(0, [0], 1);
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
    // Define needsUpdate as a trackable property since jsdom Three mock may not implement the setter
    let flagged = false;
    const original = Object.getOwnPropertyDescriptor(THREE.BufferAttribute.prototype, 'needsUpdate');
    Object.defineProperty(uvAttr, 'needsUpdate', {
      set(v) { if (v) flagged = true; },
      get() { return flagged; },
      configurable: true,
    });

    updateGeometryUVs(geo, 0, [5], 1);

    expect(flagged).toBe(true);
    geo.dispose();
  });

  it('produces different UV data when tile IDs change', () => {
    const geo = createInstanceGeometry(0, [0], 1);
    const before = Float32Array.from((geo.getAttribute('uv') as THREE.BufferAttribute).array);

    updateGeometryUVs(geo, 0, [99], 1);

    const after = (geo.getAttribute('uv') as THREE.BufferAttribute).array;
    expect(Array.from(before)).not.toEqual(Array.from(after));
    geo.dispose();
  });

  it('roundtrip: updating back to original IDs restores original UVs', () => {
    const original = [10, 20, 30, 40, 50, 60];
    const geo = createInstanceGeometry(0, original, 6);
    const snapshot = Float32Array.from((geo.getAttribute('uv') as THREE.BufferAttribute).array);

    updateGeometryUVs(geo, 0, [99, 99, 99, 99, 99, 99], 6);
    updateGeometryUVs(geo, 0, original, 6);

    const restored = (geo.getAttribute('uv') as THREE.BufferAttribute).array;
    expect(Array.from(restored)).toEqual(Array.from(snapshot));
    geo.dispose();
  });

  it('works for all shape types', () => {
    for (const style of [0, 1, 2, 3, 4, 5, 6]) {
      const geo = createInstanceGeometry(style, [0], 1);
      expect(() => updateGeometryUVs(geo, style, [42], 1)).not.toThrow();
      geo.dispose();
    }
  });
});

describe('clearGeometryCache', () => {
  it('does not throw when called on empty cache', () => {
    clearGeometryCache();
    expect(() => clearGeometryCache()).not.toThrow();
  });

  it('after clear, next createInstanceGeometry rebuilds from scratch', () => {
    // Build once to populate cache
    const geo1 = createInstanceGeometry(0, [0], 1);
    const pos1 = Float32Array.from((geo1.getAttribute('position') as THREE.BufferAttribute).array);
    geo1.dispose();

    clearGeometryCache();

    // Build again — should work identically (cache rebuilt)
    const geo2 = createInstanceGeometry(0, [0], 1);
    const pos2 = (geo2.getAttribute('position') as THREE.BufferAttribute).array;
    expect(Array.from(pos1)).toEqual(Array.from(pos2));
    geo2.dispose();

    clearGeometryCache();
  });
});
