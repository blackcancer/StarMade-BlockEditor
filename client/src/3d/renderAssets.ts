/** @fileoverview Native asset requests with explicit ownership and disposal of obsolete asynchronous results. */
import { ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, Texture, TextureLoader } from 'three';
import { createStarMadeCubeAtlasLayout, type StarMadeCubeTexturePack, type StarMadeLodModelDefinition } from 'starmade-3d';

/** Manifest supplied by the selected installation's confined resource service. */
export interface RenderManifest {
  revision: string;
  shadersUrl: string;
  layers: Array<{ layer: number; url: string; normalUrl?: string }>;
  overlayUrl?: string;
  lodModels: StarMadeLodModelDefinition[];
  lodBaseUrl: string;
  warnings: string[];
}
/** Owned textures and their matching shader corpus; dispose when the preview generation is replaced. */
export interface RenderAssets {
  manifest: RenderManifest;
  shaders: Readonly<Record<string, string>>;
  pack: StarMadeCubeTexturePack;
  dispose(): void;
}

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Asset request failed: HTTP ${response.status}`);
  return data as T;
}

/** Load the shader corpus and selected native layers, preserving normal-map alpha as material data. */
export async function loadRenderAssets(options: { size: number; pack: string; layers: number[]; signal: AbortSignal }): Promise<RenderAssets> {
  const { signal } = options;
  const manifest = await json<RenderManifest>(`/api/render-assets/manifest?size=${options.size}&pack=${encodeURIComponent(options.pack)}`, signal);
  const owned = new Set<Texture>();
  let closed = false;
  const dispose = () => {
    closed = true;
    for (const texture of owned) texture.dispose();
    owned.clear();
  };
  const loader = new TextureLoader();
  const load = async (url: string): Promise<Texture> => {
    const texture = await loader.loadAsync(url);
    if (closed || signal.aborted) { texture.dispose(); throw new DOMException('Asset load aborted', 'AbortError'); }
    texture.colorSpace = NoColorSpace;
    texture.flipY = false;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.needsUpdate = true;
    owned.add(texture);
    return texture;
  };
  try {
    const selected = options.layers.map(layer => {
      const entry = manifest.layers.find(candidate => candidate.layer === layer);
      if (!entry) throw new Error(`Missing texture layer ${layer} in the selected installation.`);
      return entry;
    });
    const layers = new Map<number, Texture>();
    const normals = new Map<number, Texture>();
    const [shaders, overlay] = await Promise.all([
      json<Readonly<Record<string, string>>>(manifest.shadersUrl, signal),
      manifest.overlayUrl ? load(manifest.overlayUrl) : undefined,
      ...selected.flatMap(entry => [
        load(entry.url).then(texture => layers.set(entry.layer, texture)),
        ...(entry.normalUrl ? [load(entry.normalUrl).then(texture => normals.set(entry.layer, texture))] : []),
      ]),
    ]);
    signal.throwIfAborted();
    return { manifest, shaders, pack: { layout: createStarMadeCubeAtlasLayout(options.size), layers,
      normalLayers: normals.size ? normals : undefined, overlay }, dispose };
  } catch (error) { dispose(); throw error; }
}
