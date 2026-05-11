import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  getEffectiveTextureIds,
  getEmissiveStrength,
  getLightColor,
  getLightIntensity,
  getOrientationQuaternion,
  getSlabTransform,
  ORIENTATIONS,
} from './BlockMesh.js';

describe('BlockMesh pure helpers', () => {
  it('computes active/inactive and animated texture ids with individualSides=3 exception', () => {
    const base = { textureId: [10, 20, 30, 40, 50, 60], hasActivationTexture: true, animated: true, individualSides: 6 };
    expect(getEffectiveTextureIds(base, true, 2)).toEqual([12, 22, 32, 42, 52, 62]);
    expect(getEffectiveTextureIds(base, false, 2)).toEqual([13, 23, 33, 43, 53, 63]);
    expect(getEffectiveTextureIds({ ...base, individualSides: 3 }, false, 2)).toEqual([13, 23, 31, 41, 53, 63]);
    expect(getEffectiveTextureIds({ ...base, hasActivationTexture: false, animated: false }, false, 2)).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('maps vertical slab values to thickness and z offsets', () => {
    expect(getSlabTransform(0)).toEqual({ thickness: 1, offsetZ: 0 });
    expect(getSlabTransform(1)).toEqual({ thickness: 0.75, offsetZ: -0.125 });
    expect(getSlabTransform(2)).toEqual({ thickness: 0.5, offsetZ: -0.25 });
    expect(getSlabTransform(3)).toEqual({ thickness: 0.25, offsetZ: -0.375 });
    expect(getSlabTransform(99)).toEqual({ thickness: 1, offsetZ: 0 });
  });

  it('clamps light color/intensity and emissive strength to preview-safe ranges', () => {
    const color = getLightColor([2, -1, 0.5, 9]);
    expect(color.r).toBe(1);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0.5);
    expect(getLightColor(undefined).equals(new THREE.Color(1, 1, 1))).toBe(true);
    expect(getLightIntensity([1, 1, 1, -2])).toBe(0);
    expect(getLightIntensity(undefined)).toBe(1);
    expect(getEmissiveStrength(0)).toBe(0.18);
    expect(getEmissiveStrength(99)).toBe(0.85);
  });

  it('builds StarOS-compatible orientation quaternions and wraps indices safely', () => {
    expect(ORIENTATIONS).toHaveLength(12);
    const q0 = getOrientationQuaternion(0);
    const q12 = getOrientationQuaternion(12);
    expect(q0.angleTo(q12)).toBeCloseTo(0);

    const q1 = getOrientationQuaternion(1);
    const expected = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
    expect(q1.angleTo(expected)).toBeCloseTo(0);

    const qNeg = getOrientationQuaternion(-1);
    const qLast = getOrientationQuaternion(11);
    expect(qNeg.angleTo(qLast)).toBeCloseTo(0);
  });
});
