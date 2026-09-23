import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Color, Float32BufferAttribute, Group, LineSegments, Matrix4, Mesh, ShaderMaterial, Texture, Vector2, Vector3, Vector4, type WebGLRenderer } from 'three';
import { captureNativeIcon } from './captureIcon.js';
import type { NativePreview } from './nativePreview.js';

const pixels = new Uint8ClampedArray([100, 50, 20, 128, 240, 0, 1, 0]);
let bitmap: { close: ReturnType<typeof vi.fn> }, context: any;
beforeEach(() => {
  bitmap = { close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  context = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels.slice() })), putImageData: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function fixture(highlight = true) {
  const texture = new Texture();
  const material = new ShaderMaterial({ uniforms: { zNear: { value: 0.1 }, zFar: { value: 200 },
    v_inv: { value: new Matrix4() }, mainTex0: { value: texture },
    samples: { value: new Float32Array([1, 2]) }, absent: { value: null },
    lightPos: { value: new Vector3(450, 900, 450) },
    nested: { value: [{ direction: new Vector3(1, 2, 3), strength: 2 }] } } });
  const geometry = new BoxGeometry(); geometry.setAttribute('ivert', new Float32BufferAttribute(new Float32Array(96), 4));
  const object = new Group(); object.add(new Mesh(geometry, material));
  if (highlight) { const selection = new Group(); selection.name = 'selected-face'; object.add(selection); }
  const preview = { object, materials: [material], update: vi.fn(), dispose: vi.fn() } satisfies NativePreview;
  const state = { size: new Vector2(900, 700), ratio: 2, viewport: new Vector4(1, 2, 800, 600), scissor: new Vector4(3, 4, 300, 200),
    scissorTest: true, color: new Color('#123456'), alpha: 0.8, target: {}, face: 2, level: 1 };
  const initial = { ...state, size: state.size.clone(), viewport: state.viewport.clone(), scissor: state.scissor.clone(), color: state.color.clone() };
  const renderer = { autoClear: false,
    getSize: (v: Vector2) => v.copy(state.size), getPixelRatio: () => state.ratio,
    getViewport: (v: Vector4) => v.copy(state.viewport), getScissor: (v: Vector4) => v.copy(state.scissor), getScissorTest: () => state.scissorTest,
    getClearColor: (v: Color) => v.copy(state.color), getClearAlpha: () => state.alpha,
    getRenderTarget: () => state.target, getActiveCubeFace: () => state.face, getActiveMipmapLevel: () => state.level,
    setSize: (w: number, h: number) => state.size.set(w, h), setPixelRatio: (n: number) => state.ratio = n,
    setViewport: (v: Vector4) => state.viewport.copy(v), setScissor: (v: Vector4) => state.scissor.copy(v), setScissorTest: (v: boolean) => state.scissorTest = v,
    setClearColor: (c: Color, a: number) => { state.color.copy(c); state.alpha = a; },
    setRenderTarget: (target: object, face: number, level: number) => { state.target = target; state.face = face; state.level = level; },
    render: vi.fn(), domElement: { toDataURL: vi.fn(() => 'data:image/png;base64,cG5n') },
  };
  return { preview, material, renderer: renderer as unknown as WebGLRenderer, state, initial };
}

describe('native build icon export', () => {
  it('uses the SDK export with a fixed transparent orthographic cube framing and restores the host exactly', async () => {
    const f = fixture(); const uniforms = f.material.uniforms, userData = f.material.userData;
    const values = Object.fromEntries(Object.entries(uniforms).map(([key, uniform]) => [key, uniform.value]));
    let outline!: LineSegments;
    vi.mocked(f.renderer.render).mockImplementation((scene, camera) => {
      expect(camera.type).toBe('OrthographicCamera');
      expect(camera.position.y / camera.position.x).toBeCloseTo(0.5);
      expect(camera.position.z / camera.position.x).toBeCloseTo(1);
      expect((camera as any).right).toBeCloseTo(Math.SQRT2 / 1.5);
      expect((camera as any).zoom).toBeCloseTo(46 / 48);
      expect(f.state.size.toArray()).toEqual([64, 64]); expect(f.state.ratio).toBe(1); expect(f.state.alpha).toBe(0);
      expect(f.renderer.autoClear).toBe(true); expect(f.state.scissorTest).toBe(false);
      expect(scene.getObjectByName('selected-face')).toBeUndefined();
      expect(scene.children).toHaveLength(1); expect(scene.children[0]).not.toBe(f.preview.object);
      outline = scene.getObjectByName('icon-outline') as LineSegments;
      expect(outline.isLineSegments).toBe(true); vi.spyOn(outline.geometry, 'dispose'); vi.spyOn(outline.material as any, 'dispose');
      expect(f.material.uniforms.lightPos.value.toArray()).toEqual([900, 600, 450]);
      expect(f.material.userData).not.toBe(userData);
      // Three r164 caches this dictionary when compiling the material's program.
      expect(f.material.uniforms).toBe(uniforms); expect(f.material.uniforms.mainTex0.value).toBe(values.mainTex0);
      expect(f.material.uniforms.nested.value[0]).not.toBe(values.nested[0]);
      expect(ArrayBuffer.isView(f.material.uniforms.samples.value)).toBe(true);
      expect(Array.from(f.material.uniforms.samples.value)).toEqual([1, 2]);
      expect(f.material.uniforms.samples.value).not.toBe(values.samples);
      expect(f.material.uniforms.v_inv.value).not.toEqual(values.v_inv);
    });
    const blob = await captureNativeIcon(f.renderer, f.preview);
    expect(blob.type).toBe('image/png'); expect(blob.size).toBe(3);
    expect(f.renderer.domElement.toDataURL).toHaveBeenCalledWith('image/png');
    expect(f.state).toEqual(f.initial); expect(f.renderer.autoClear).toBe(false);
    expect(f.material.uniforms).toBe(uniforms); expect(f.preview.update).not.toHaveBeenCalled();
    expect(f.material.userData).toBe(userData);
    for (const [key, value] of Object.entries(values)) expect(f.material.uniforms[key].value).toBe(value);
    expect(f.preview.object.getObjectByName('selected-face')).toBeTruthy();
    expect(outline.geometry.dispose).toHaveBeenCalledOnce(); expect((outline.material as any).dispose).toHaveBeenCalledOnce();
    expect(context.putImageData.mock.calls[0][0].data).toEqual(new Uint8ClampedArray([140, 70, 28, 128, 255, 0, 1, 0]));
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('keeps slabs at cube scale and fits larger LOD geometry', async () => {
    const f = fixture(false); (f.preview.object.children[0] as Mesh).scale.y = 0.25;
    const widths: number[] = [];
    vi.mocked(f.renderer.render).mockImplementation((_scene, camera) => { widths.push((camera as any).right); });
    await captureNativeIcon(f.renderer, f.preview);
    (f.preview.object.children[0] as Mesh).scale.set(3, 3, 3);
    await captureNativeIcon(f.renderer, f.preview);
    expect(widths[0]).toBeCloseTo(Math.SQRT2 / 1.5); expect(widths[1]).toBeCloseTo(widths[0] * 3);
  });

  it('restores canvas and shader state on rendering and serialization failures', async () => {
    const f = fixture(); const uniforms = f.material.uniforms;
    vi.mocked(f.renderer.render).mockImplementation(() => { throw new Error('GPU capture failed'); });
    await expect(captureNativeIcon(f.renderer, f.preview)).rejects.toThrow('GPU capture failed');
    expect(f.state).toEqual(f.initial); expect(f.material.uniforms).toBe(uniforms);
    vi.mocked(f.renderer.render).mockReset(); vi.mocked(f.renderer.domElement.toDataURL).mockReturnValue('data:,');
    await expect(captureNativeIcon(f.renderer, f.preview)).rejects.toThrow('PNG');
    expect(f.state).toEqual(f.initial); expect(f.material.uniforms).toBe(uniforms);
  });

  it.each(['sprite', 'transparent', 'lod'])('keeps %s silhouettes free of geometric outlines', async kind => {
    const f = fixture(false); f.preview.object.userData.starMadePreview = { style: kind === 'sprite' ? 3 : 0 };
    if (kind === 'transparent') f.material.transparent = true;
    if (kind === 'lod') (f.preview.object.children[0] as Mesh).geometry.deleteAttribute('ivert');
    vi.mocked(f.renderer.render).mockImplementation((scene, camera) => {
      expect(scene.getObjectByName('icon-outline')).toBeUndefined();
      expect((camera as any).zoom).toBe(1);
    });
    await captureNativeIcon(f.renderer, f.preview);
  });

  it('reports unavailable image conversion and closes decoded images after encoder failure', async () => {
    const f = fixture();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    await expect(captureNativeIcon(f.renderer, f.preview)).rejects.toThrow('2D');
    expect(bitmap.close).toHaveBeenCalledOnce(); expect(f.state).toEqual(f.initial);
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(callback => callback(null));
    await expect(captureNativeIcon(f.renderer, f.preview)).rejects.toThrow('PNG');
    expect(bitmap.close).toHaveBeenCalledTimes(2); expect(f.state).toEqual(f.initial);
  });
});
