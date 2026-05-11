import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  PAGE_GRID_COLS,
  PAGE_GRID_ROWS,
  invalidateAtlasCache,
  loadAtlasTexture,
  tileUVRect,
} from './AtlasTexture.js';

describe('AtlasTexture constants/helpers', () => {
  beforeEach(() => {
    invalidateAtlasCache();
  });

  afterEach(() => {
    invalidateAtlasCache();
    vi.restoreAllMocks();
  });

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

  it('loads atlas textures with API parameters, texture settings and cache reuse', async () => {
    const diffuse = new THREE.Texture();
    const normal = new THREE.Texture();
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load')
      .mockImplementationOnce((url, onLoad) => {
        expect(url).toBe('/api/textures/atlas?size=64&pack=Fancy%20Pack&map=diffuse&v=4');
        queueMicrotask(() => onLoad?.(diffuse));
        return undefined as unknown as THREE.Texture;
      })
      .mockImplementationOnce((url, onLoad) => {
        expect(url).toBe('/api/textures/atlas?size=64&pack=Fancy%20Pack&map=normal&v=4');
        queueMicrotask(() => onLoad?.(normal));
        return undefined as unknown as THREE.Texture;
      });

    const first = await loadAtlasTexture(64, 'Fancy Pack', 'diffuse');
    const cached = await loadAtlasTexture(64, 'Fancy Pack', 'diffuse');
    const normalMap = await loadAtlasTexture(64, 'Fancy Pack', 'normal');

    expect(first).toBe(diffuse);
    expect(cached).toBe(diffuse);
    expect(normalMap).toBe(normal);
    expect(load).toHaveBeenCalledTimes(2);
    expect(diffuse.magFilter).toBe(THREE.NearestFilter);
    expect(diffuse.minFilter).toBe(THREE.NearestFilter);
    expect(diffuse.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(normal.colorSpace).toBe(THREE.NoColorSpace);
    expect(diffuse.version).toBeGreaterThan(0);
  });

  it('shares pending loads, clears failed loads and disposes cached textures on invalidation', async () => {
    let resolveLoad: ((tex: THREE.Texture) => void) | undefined;
    const pendingTexture = new THREE.Texture();
    pendingTexture.dispose = vi.fn();
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad, _progress, onError) => {
      if (!resolveLoad) {
        resolveLoad = onLoad;
      } else if (onError) {
        queueMicrotask(() => onError(new Error('missing')));
      }
      return undefined as unknown as THREE.Texture;
    });

    const pendingA = loadAtlasTexture(128, 'Default', 'diffuse');
    const pendingB = loadAtlasTexture(128, 'Default', 'diffuse');
    expect(load).toHaveBeenCalledTimes(1);
    resolveLoad?.(pendingTexture);
    await expect(pendingA).resolves.toBe(pendingTexture);
    await expect(pendingB).resolves.toBe(pendingTexture);

    invalidateAtlasCache();
    expect(pendingTexture.dispose).toHaveBeenCalled();

    await expect(loadAtlasTexture(256, 'Default', 'diffuse')).rejects.toThrow('missing');
    await expect(loadAtlasTexture(256, 'Default', 'diffuse')).rejects.toThrow('missing');
    expect(load).toHaveBeenCalledTimes(3);
  });
});
