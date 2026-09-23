/** @fileoverview Export the native preview using the game's 64 px build-icon camera convention. */
import { Box3, Color, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, OrthographicCamera, Scene, Texture, Vector2, Vector3, Vector4, type ShaderMaterial, type WebGLRenderer } from 'three';
import { applyStarMadeSceneSunToShaderMaterial, captureInspectionPreview, frameInspectionBounds, updateStarMadeBlockLightSourcesViewSpace,
  updateStarMadeCubeShaderClipPlanes, updateStarMadeCubeShaderMVP } from 'starmade-3d';
import type { NativePreview } from './nativePreview.js';

// Native cube icon 25 occupies pixels 8..55: 48 px inside a transparent 64 px image.
const ICON_SIZE = 64;
const CUBE_PADDING = Math.sqrt(2 / 3) / 0.75;

/** Copy mutable uniform values while retaining shared GPU texture ownership. */
function copyUniform(value: unknown): any {
  if (value === null || typeof value !== 'object' || value instanceof Texture) return value;
  if (Array.isArray(value)) return value.map(copyUniform);
  if (ArrayBuffer.isView(value)) return structuredClone(value);
  if (typeof (value as { clone?: unknown }).clone === 'function') return (value as { clone(): unknown }).clone();
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyUniform(child)]));
}

/** Match the game icon exposure after native shading, keeping alpha byte-for-byte unchanged. */
async function exposeIcon(blob: Blob): Promise<Blob> {
  const image = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = ICON_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Icon export needs a 2D canvas.');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
    for (let index = 0; index < pixels.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) pixels.data[index + channel] = Math.round(pixels.data[index + channel] * 1.4);
    }
    context.putImageData(pixels, 0, 0);
    return await new Promise((resolve, reject) => canvas.toBlob(result => result
      ? resolve(result) : reject(new Error('Icon export could not encode the PNG image.')), 'image/png'));
  } finally { image.close(); }
}

/**
 * Capture the current native geometry, orientation, animation frame and active state.
 * Uses an orthographic camera at elevation 19.47 degrees, a fixed sun and thin opaque-shape outlines.
 * No floor or selection overlay is included; RGB exposure is applied after the native PNG capture.
 * Rendering is synchronous; every host renderer setting and original uniform reference is restored before resolution.
 */
export async function captureNativeIcon(renderer: WebGLRenderer, preview: NativePreview): Promise<Blob> {
  const object = preview.object.clone(true);
  object.getObjectByName('selected-face')?.removeFromParent();
  object.updateMatrixWorld(true);
  const bounds = new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5));
  bounds.union(new Box3().setFromObject(object));
  const camera = new OrthographicCamera(-1, 1, 1, -1);
  frameInspectionBounds(camera, bounds, new Vector3(1, 0.5, 1), CUBE_PADDING);
  const scene = new Scene(); scene.add(object);
  const previous = { size: renderer.getSize(new Vector2()), ratio: renderer.getPixelRatio(),
    viewport: renderer.getViewport(new Vector4()), scissor: renderer.getScissor(new Vector4()), scissorTest: renderer.getScissorTest(),
    color: renderer.getClearColor(new Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear,
    target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), level: renderer.getActiveMipmapLevel() };
  const values = preview.materials.map(material => Object.fromEntries(Object.entries(material.uniforms).map(([key, uniform]) => [key, uniform.value])));
  const userData = preview.materials.map(material => material.userData);
  const edges: EdgesGeometry[] = [];
  const outlineMaterial = new LineBasicMaterial({ color: 0x000000 });
  try {
    object.traverse(child => {
      if (!(child instanceof Mesh) || !child.geometry.hasAttribute('ivert') || (child.material as ShaderMaterial).transparent || object.userData.starMadePreview?.style === 3) return;
      const geometry = new EdgesGeometry(child.geometry, 20); edges.push(geometry);
      const outline = new LineSegments(geometry, outlineMaterial); outline.name = 'icon-outline'; outline.renderOrder = 1;
      child.add(outline);
    });
    // Reserve one output pixel for each outer stroke while keeping the 48 px cube footprint.
    if (edges.length > 0) { camera.zoom = 46 / 48; camera.updateProjectionMatrix(); }
    renderer.setPixelRatio(1); renderer.setSize(ICON_SIZE, ICON_SIZE, false);
    renderer.setViewport(new Vector4(0, 0, ICON_SIZE, ICON_SIZE)); renderer.setScissorTest(false);
    renderer.setClearColor(new Color(0), 0); renderer.autoClear = true;
    preview.materials.forEach((material, index) => {
      // Keep the dictionary and uniform identities cached by Three's compiled program.
      for (const [key, value] of Object.entries(values[index])) material.uniforms[key].value = copyUniform(value);
      material.userData = { ...userData[index] };
      applyStarMadeSceneSunToShaderMaterial(material, { position: new Vector3(900, 600, 450) });
      updateStarMadeCubeShaderClipPlanes(material, camera.near, camera.far);
      updateStarMadeCubeShaderMVP(material, camera.matrixWorldInverse, camera.projectionMatrix);
      updateStarMadeBlockLightSourcesViewSpace(material, camera.matrixWorldInverse);
      material.uniformsNeedUpdate = true;
    });
    const data = captureInspectionPreview(renderer, scene, camera);
    if (!data.startsWith('data:image/png;base64,')) throw new Error('Native icon capture did not produce a PNG image.');
    const bytes = Uint8Array.from(atob(data.slice('data:image/png;base64,'.length)), char => char.charCodeAt(0));
    return exposeIcon(new Blob([bytes], { type: 'image/png' }));
  } finally {
    preview.materials.forEach((material, index) => {
      for (const [key, value] of Object.entries(values[index])) material.uniforms[key].value = value;
      material.userData = userData[index];
      material.uniformsNeedUpdate = true;
    });
    for (const geometry of edges) geometry.dispose();
    outlineMaterial.dispose();
    renderer.setPixelRatio(previous.ratio); renderer.setSize(previous.size.x, previous.size.y, false);
    renderer.setRenderTarget(previous.target, previous.face, previous.level);
    renderer.setViewport(previous.viewport); renderer.setScissor(previous.scissor); renderer.setScissorTest(previous.scissorTest);
    renderer.setClearColor(previous.color, previous.alpha); renderer.autoClear = previous.autoClear;
  }
}
