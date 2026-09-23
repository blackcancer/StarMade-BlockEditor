import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClampToEdgeWrapping, LinearFilter, NoColorSpace, Texture, TextureLoader } from 'three';
import { loadRenderAssets, type RenderManifest } from './renderAssets.js';

const manifest: RenderManifest = { revision: 'revision1', shadersUrl: '/api/render-assets/shaders.json',
  layers: [{ layer: 0, url: '/color0.png', normalUrl: '/normal0.png' }, { layer: 7, url: '/custom.png' }],
  overlayUrl: '/overlay.png', lodModels: [], lodBaseUrl: '/api/render-assets/lod', warnings: [] };
const shaders = { 'data/shader/own.vsh': 'void main() {}' };
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data } as Response);
const setup = (data = manifest) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(data)).mockResolvedValueOnce(response(shaders)));
  const textures: Texture[] = [];
  vi.spyOn(TextureLoader.prototype, 'loadAsync').mockImplementation(async () => {
    const texture = new Texture(); textures.push(texture); vi.spyOn(texture, 'dispose'); return texture;
  });
  return textures;
};
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('native preview assets lifetime', () => {
  it('loads only requested layers, material RGBA settings and shader corpus', async () => {
    const textures = setup();
    const assets = await loadRenderAssets({ size: 64, pack: 'Fancy Pack', layers: [0], signal: new AbortController().signal });
    expect(fetch).toHaveBeenCalledWith('/api/render-assets/manifest?size=64&pack=Fancy%20Pack', expect.anything());
    expect(TextureLoader.prototype.loadAsync).not.toHaveBeenCalledWith('/custom.png');
    expect(assets.shaders).toEqual(shaders);
    expect(assets.pack.layers.size).toBe(1);
    expect(assets.pack.normalLayers!.size).toBe(1);
    for (const texture of textures) expect(texture).toMatchObject({ colorSpace: NoColorSpace, flipY: false,
      magFilter: LinearFilter, wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping });
    assets.dispose(); assets.dispose();
    for (const texture of textures) expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  it('supports explicit optional omissions without inventing custom layers', async () => {
    setup({ ...manifest, overlayUrl: undefined, layers: [{ layer: 0, url: '/color.png' }], warnings: ['No normals'] });
    const assets = await loadRenderAssets({ size: 128, pack: 'Default', layers: [0], signal: new AbortController().signal });
    expect(assets.pack.normalLayers).toBeUndefined(); expect(assets.pack.overlay).toBeUndefined();
    expect(assets.manifest.warnings).toEqual(['No normals']); assets.dispose();
  });

  it('rejects missing selected custom layers and HTTP failures with actionable diagnostics', async () => {
    setup();
    await expect(loadRenderAssets({ size: 64, pack: 'Default', layers: [3], signal: new AbortController().signal })).rejects.toThrow(/3/);
    vi.mocked(fetch).mockReset().mockResolvedValue(response({ error: 'Game shaders missing' }, 503));
    await expect(loadRenderAssets({ size: 64, pack: 'Default', layers: [0], signal: new AbortController().signal })).rejects.toThrow(/Game shaders missing/);
    vi.mocked(fetch).mockReset().mockResolvedValue(response({}, 500));
    await expect(loadRenderAssets({ size: 64, pack: 'Default', layers: [0], signal: new AbortController().signal })).rejects.toThrow(/500/);
  });

  it('disposes completed and late textures after a partial load failure', async () => {
    const textures = setup();
    let finish!: (value: Texture) => void;
    vi.mocked(TextureLoader.prototype.loadAsync)
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockRejectedValueOnce(new Error('Normal atlas failed'));
    await expect(loadRenderAssets({ size: 64, pack: 'Default', layers: [0], signal: new AbortController().signal })).rejects.toThrow(/Normal atlas failed/);
    const late = new Texture(); vi.spyOn(late, 'dispose'); finish(late);
    await Promise.resolve(); await Promise.resolve();
    expect(late.dispose).toHaveBeenCalledOnce();
    for (const texture of textures) expect(texture.dispose).toHaveBeenCalledOnce();
  });

  it('aborts obsolete loads and never hands their textures to the next installation', async () => {
    setup(); const controller = new AbortController();
    let finish!: (value: Texture) => void;
    vi.mocked(TextureLoader.prototype.loadAsync).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = loadRenderAssets({ size: 64, pack: 'Default', layers: [0], signal: controller.signal });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    controller.abort(); const late = new Texture(); vi.spyOn(late, 'dispose'); finish(late);
    await expect(pending).rejects.toThrow(/abort/i); expect(late.dispose).toHaveBeenCalledOnce();
  });
});
