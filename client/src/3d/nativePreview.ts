/** @fileoverview Builds native StarMade geometry/materials with a single owner for preview GPU resources. */
import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, EdgesGeometry,
  Mesh, Material, PerspectiveCamera, PointLight, ShaderMaterial, Texture, Vector3, type Object3D } from 'three';
import { applyStarMadeBlockLightSourcesToCubeShaderMaterial, applyStarMadeBlockLightToEncodedCubeGeometry,
  collectStarMadeLodShaderMaterials, computeStarMadeBlockLightVolume, createStarMadeBlockLightSolidFromBlock,
  createStarMadeBlockLightSourceFromBlock, createStarMadeCubeShaderMaterial, createStarMadeEncodedCubeGeometry,
  createStarMadeLodInstance, createStarMadeLodModelRegistry, loadStarMadeLodPrototypes,
  resolveStarMadeBlockLodModelReference, setStarMadeCubeShaderAllLight, setStarMadeShaderSources,
  updateStarMadeCubeShaderClipPlanes, updateStarMadeCubeShaderMVP, updateStarMadeCubeShaderTime,
  updateStarMadeBlockLightSourcesViewSpace,
  type BlockDefinition, type StarMadeLodBlockInstance, type StarMadeEncodedCubeShapeFace } from 'starmade-3d';
import type { RenderAssets } from './renderAssets.js';
import { loadDisplayPreview } from './displayPreview.js';

/** One independently disposable native preview object, updated by the host render loop. */
export interface NativePreview {
  object: Group;
  materials: ShaderMaterial[];
  update(delta: number, camera: PerspectiveCamera): void;
  dispose(): void;
}

function resources(root: Object3D, geometries: Set<BufferGeometry>, materials: Set<Material>, textures: Set<Texture>) {
  root.traverse(object => {
    if (!(object instanceof Mesh || object instanceof LineSegments)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
      if (material instanceof ShaderMaterial) {
        for (const uniform of Object.values(material.uniforms)) if (uniform.value instanceof Texture) textures.add(uniform.value);
      }
    }
  });
}

function highlight(geometry: BufferGeometry, face: number): LineSegments {
  const faces = geometry.userData.starMadeShapeFaces as StarMadeEncodedCubeShapeFace[];
  const positions = geometry.getAttribute('position');
  const vertices: number[] = [];
  faces.forEach((entry, index) => {
    if (entry.lightSide !== face) return;
    for (const corner of [0, 1, 2, 0, 2, 3]) {
      const vertex = index * 4 + corner;
      vertices.push(positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex));
    }
  });
  const surface = new BufferGeometry();
  surface.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const edges = new EdgesGeometry(surface); surface.dispose();
  const lines = new LineSegments(edges, new LineBasicMaterial({ color: 0xffcc55, depthTest: false }));
  lines.name = 'selected-face'; lines.renderOrder = 10;
  return lines;
}

/** Create a native cube or LOD preview from the current draft; construction failures retain no owned GPU resources. */
export async function createNativePreview(options: {
  block: BlockDefinition; assets: RenderAssets; orientation: number; active: boolean; highlightFace: number;
}): Promise<NativePreview> {
  const { block, assets, orientation, active } = options;
  setStarMadeShaderSources(assets.shaders);
  const object = new Group(); object.name = 'native-block-preview';
  const geometries = new Set<BufferGeometry>(), ownedMaterials = new Set<Material>(), textures = new Set<Texture>();
  const shared = new Set([...assets.pack.layers.values(), ...assets.pack.normalLayers?.values() ?? [], assets.pack.overlay]);
  const materials: ShaderMaterial[] = [];
  let display: Awaited<ReturnType<typeof loadDisplayPreview>> | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    display?.dispose();
    resources(object, geometries, ownedMaterials, textures);
    object.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const material of ownedMaterials) material.dispose();
    for (const texture of textures) if (!shared.has(texture)) texture.dispose();
  };
  try {
    const sources = block.lightSource ? [createStarMadeBlockLightSourceFromBlock(block, {
      grid: [2, 2], position: [2, 2, 2], active, orientation,
    })] : [];
    const volume = computeStarMadeBlockLightVolume({ size: [5, 5, 5], sources,
      solids: [createStarMadeBlockLightSolidFromBlock(block, { position: [2, 2, 2], orientation })] });
    const sun = { position: new Vector3(450, 900, 450) };
    if (block.lodShape || block.lodShapeActive) {
      const reference = resolveStarMadeBlockLodModelReference(block, createStarMadeLodModelRegistry(assets.manifest.lodModels), assets.manifest.lodBaseUrl, active);
      if (!reference) throw new Error(`Missing LOD model: ${active && block.lodShapeActive ? block.lodShapeActive : block.lodShape}`);
      const entry: StarMadeLodBlockInstance = { key: 'preview', blockDefinition: block, modelReference: reference,
        block: { orientation, active }, worldPosition: [0, 0, 0], position: [0, 0, 0], entityName: 'preview', blockId: block.id };
      const loaded = await loadStarMadeLodPrototypes([entry]);
      const prototype = loaded.prototypes.get(reference.name);
      if (!prototype) throw new Error(`Could not load LOD model: ${reference.name}`);
      resources(prototype, geometries, ownedMaterials, textures);
      const lod = createStarMadeLodInstance(prototype, entry, { volume, volumeShift: [2, 2, 2], sunOcclusionFloor: 1, sun });
      object.add(lod); materials.push(...collectStarMadeLodShaderMaterials(lod));
    } else {
      const geometry = createStarMadeEncodedCubeGeometry({ block, orientation, active, starMadeAtlasLayout: assets.pack.layout });
      geometries.add(geometry);
      applyStarMadeBlockLightToEncodedCubeGeometry(geometry, [0, 0, 0], { volume, volumeShift: [2, 2, 2], occlusionFloor: 1 });
      const material = createStarMadeCubeShaderMaterial({ textureLayers: assets.pack.layers,
        normalTextureLayers: assets.pack.normalLayers, overlayMap: assets.pack.overlay, blended: block.transparent,
        alphaDiscard: block.transparent || block.blockStyle === 3, doubleSided: block.blockStyle === 3, sun });
      materials.push(material);
      setStarMadeCubeShaderAllLight(material, 1);
      applyStarMadeBlockLightSourcesToCubeShaderMaterial(material, sources.map(source => ({ ...source, position: [0, 0, 0] as const })), [0, 0, 0]);
      const mesh = new Mesh(geometry, material); mesh.name = 'native-block-mesh'; mesh.castShadow = true;
      object.add(mesh);
      if (options.highlightFace >= 0) object.add(highlight(geometry, options.highlightFace));
    }
    if (block.id === 479) {
      display = await loadDisplayPreview(orientation);
      object.add(display.root);
    }
    if (block.lightSource && active) {
      const [r, g, b, intensity] = block.lightSourceColor;
      const light = new PointLight(0xffffff, intensity * 2.5, 22, 1);
      light.color.setRGB(r, g, b); light.position.set(0, 0.22, 0); object.add(light);
    }
    object.userData.starMadePreview = { blockId: block.id, style: block.blockStyle, orientation, active,
      revision: assets.manifest.revision, native: true };
    return { object, materials, dispose, update(delta, camera) {
      camera.updateMatrixWorld();
      display?.updateVisibility(camera);
      display?.updateTime(delta);
      for (const material of materials) {
        updateStarMadeCubeShaderTime(material, delta);
        updateStarMadeCubeShaderClipPlanes(material, camera.near, camera.far);
        updateStarMadeCubeShaderMVP(material, camera.matrixWorldInverse, camera.projectionMatrix);
        updateStarMadeBlockLightSourcesViewSpace(material, camera.matrixWorldInverse);
      }
    } };
  } catch (error) { dispose(); throw error; }
}
