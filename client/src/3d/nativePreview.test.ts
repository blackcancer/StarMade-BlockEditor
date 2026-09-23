import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, ShaderMaterial, Texture } from 'three';
import * as native from 'starmade-3d';
import * as display from './displayPreview.js';
import { createNativePreview } from './nativePreview.js';
import { toRenderBlock } from './renderBlock.js';
import type { BlockDef } from '../store/blockStore.js';
import type { RenderAssets } from './renderAssets.js';
vi.mock('starmade-3d', async importOriginal => ({ ...await importOriginal<typeof native>(), loadStarMadeLodPrototypes: vi.fn() }));

// Original minimal shader corpus: exercises the real factory and uniforms without distributing game files.
const vertex = 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const fragment = 'void main() { vec4 lightedColor = vec4(1.0); vec4 occlusion = vec4(1.0); gl_FragColor = lightedColor; }';
const lodFragment = 'void main() { float totOcc = 1.0; vec4 tex = vec4(1.0); gl_FragColor = tex; gl_FragColor.a = tex.a; }';
const shaders = {
  'data/shader/cube/quads13/cube-3rd.vsh': vertex,
  'data/shader/cube/quads13/cubeTArray.fsh': fragment,
  'data/shader/cube/lodCube/lodcube.vert.glsl': vertex,
  'data/shader/cube/lodCube/lodcube.frag.glsl': lodFragment,
};
const assets = (): RenderAssets => ({ manifest: { revision: '1', shadersUrl: '/shaders', layers: [],
  lodModels: [{ name: 'desk', filename: 'desk', relpath: 'desk' }], lodBaseUrl: '/lod', warnings: [] },
  shaders, pack: { layout: native.createStarMadeCubeAtlasLayout(64), layers: new Map([[0, new Texture()]]),
    normalLayers: new Map([[0, new Texture()]]) }, dispose() {} });
const block = (patch: Partial<BlockDef> = {}) => toRenderBlock({ id: 1, name: 'Test', hp: 255,
  textureId: [0], individualSides: 1, blockStyle: 0, slab: 0, slabIds: [], transparency: false,
  lightSource: false, lightSourceColor: [1, 1, 1, 1], extraProperties: {}, ...patch } as BlockDef);
beforeEach(() => native.setStarMadeShaderSources(shaders));
afterEach(() => vi.restoreAllMocks());

describe('real StarMade preview objects', () => {
  it('creates encoded native mesh, advances uniforms and releases only owned resources once', async () => {
    const resources = assets(); const shared = resources.pack.layers.get(0)!; vi.spyOn(shared, 'dispose');
    const preview = await createNativePreview({ block: block({ animated: true }), assets: resources, orientation: 0, active: true, highlightFace: -1 });
    const mesh = preview.object.children.find(child => child instanceof Mesh) as Mesh;
    const material = mesh.material as ShaderMaterial;
    expect(mesh.geometry.getAttribute('ivert')).toBeTruthy();
    expect(material.isShaderMaterial).toBe(true); expect(material.uniforms.mainTex0.value).toBe(shared);
    const camera = new PerspectiveCamera(50, 1, 0.2, 200);
    preview.update(0.6, camera);
    expect(material.uniforms.animationTime.value).toBe(1);
    expect(material.uniforms.zNear.value).toBe(0.2); expect(material.uniforms.zFar.value).toBe(200);
    vi.spyOn(mesh.geometry, 'dispose'); vi.spyOn(material, 'dispose');
    preview.dispose(); preview.dispose();
    expect(mesh.geometry.dispose).toHaveBeenCalledOnce(); expect(material.dispose).toHaveBeenCalledOnce();
    expect(shared.dispose).not.toHaveBeenCalled();
  });

  it('handles transparent sprites, active lamp light and exact source face highlighting', async () => {
    const preview = await createNativePreview({ block: block({ blockStyle: 3, transparency: true, lightSource: true }),
      assets: assets(), orientation: 2, active: true, highlightFace: 2 });
    expect(preview.materials[0].transparent).toBe(true);
    expect(preview.materials[0].uniforms.spotCount.value).toBe(1);
    expect(preview.object.getObjectByName('selected-face')).toBeTruthy();
    const camera = new PerspectiveCamera(); camera.position.set(5, 0, 0);
    preview.update(0.1, camera);
    expect(preview.materials[0].uniforms.starMadeLightSources.value[1].position.x).toBe(-5);
    preview.dispose();
    const off = await createNativePreview({ block: block({ lightSource: true }), assets: assets(), orientation: 0, active: false, highlightFace: -1 });
    expect(off.materials[0].uniforms.spotCount.value).toBe(0); off.dispose();
  });

  it('loads and instantiates actual LOD prototype geometry with native materials', async () => {
    const prototype = new Group(); const texture = new Texture(); texture.image = { width: 1, height: 1 };
    prototype.add(new Mesh(new BoxGeometry(), [new MeshStandardMaterial({ map: texture }), new MeshStandardMaterial()]));
    vi.mocked(native.loadStarMadeLodPrototypes).mockResolvedValue({ prototypes: new Map([['desk', prototype]]), missing: [] });
    const resources = assets(); delete (resources.pack as { normalLayers?: unknown }).normalLayers;
    const preview = await createNativePreview({ block: block({ extraProperties: { LodShape: 'desk' } }),
      assets: resources, orientation: 0, active: false, highlightFace: -1 });
    expect(preview.object.getObjectByName('lod:Test:desk')).toBeTruthy();
    expect(preview.materials.every(material => material.isShaderMaterial)).toBe(true);
    preview.update(0.1, new PerspectiveCamera()); preview.dispose();
  });

  it('reports missing LOD names and failed LOD loads instead of showing a false cube', async () => {
    await expect(createNativePreview({ block: block({ extraProperties: { LodShapeSwitchStyleActive: 'active-only' } }),
      assets: assets(), orientation: 0, active: true, highlightFace: -1 })).rejects.toThrow(/active-only/);
    await expect(createNativePreview({ block: block({ extraProperties: { LodShape: 'missing' } }),
      assets: assets(), orientation: 0, active: true, highlightFace: -1 })).rejects.toThrow(/missing/);
    vi.mocked(native.loadStarMadeLodPrototypes).mockResolvedValue({ prototypes: new Map(), missing: ['desk'] });
    await expect(createNativePreview({ block: block({ extraProperties: { LodShape: 'desk' } }),
      assets: assets(), orientation: 0, active: true, highlightFace: -1 })).rejects.toThrow(/desk/);
  });
});

it('attaches the native Display pass only to block 479 and gives it independent resource ownership', async () => {
  const root = new Group(); root.name = 'StarMade display 479';
  const updateVisibility = vi.fn(), updateTime = vi.fn();
  const dispose = vi.fn(() => root.removeFromParent());
  const loader = vi.spyOn(display, 'loadDisplayPreview').mockResolvedValue({ root, updateVisibility, updateTime, dispose } as any);
  const preview = await createNativePreview({ block: block({ id: 479 }), assets: assets(), orientation: 5, active: false, highlightFace: -1 });
  expect(loader).toHaveBeenCalledWith(5);
  expect(preview.object.getObjectByName('native-block-mesh')).toBeTruthy();
  expect(preview.object.getObjectByName('StarMade display 479')).toBe(root);
  const camera = new PerspectiveCamera(); preview.update(0.1, camera);
  expect(updateVisibility).toHaveBeenCalledWith(camera);
  expect(updateTime).toHaveBeenCalledWith(0.1);
  preview.dispose(); preview.dispose(); expect(dispose).toHaveBeenCalledOnce();
  loader.mockRejectedValueOnce(new Error('Missing Display assets'));
  await expect(createNativePreview({ block: block({ id: 479 }), assets: assets(), orientation: 0, active: true, highlightFace: -1 })).rejects.toThrow('Missing Display assets');
});
