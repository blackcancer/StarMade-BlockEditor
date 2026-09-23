import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MeshBasicMaterial, PerspectiveCamera, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { starMadeDisplayMatrix } from 'starmade-3d';
import { loadDisplayPreview } from './displayPreview.js';

let background: Texture;
let context: Record<string, any>;
let fontLoad: ReturnType<typeof vi.fn>;
beforeEach(() => {
  context = { measureText: () => ({ width: 48, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 }),
    scale: vi.fn(), strokeText: vi.fn(), fillText: vi.fn() };
  vi.stubGlobal('document', { fonts: { add: vi.fn(), delete: vi.fn() },
    createElement: vi.fn(() => ({ getContext: () => context })) });
  fontLoad = vi.fn().mockImplementation(function(this: FontFace) { return Promise.resolve(this); });
  vi.stubGlobal('FontFace', class { load = fontLoad; });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }));
  background = new Texture(); vi.spyOn(background, 'dispose');
  vi.spyOn(TextureLoader.prototype, 'loadAsync').mockResolvedValue(background);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('uses the native screen/text geometry, six face frames, font and depth-tested unlit materials', async () => {
  for (let orientation = 0; orientation < 6; orientation++) {
    const panel = await loadDisplayPreview(orientation);
    expect(panel.root.matrix.equals(starMadeDisplayMatrix([0, 0, 0], orientation, [0, 0, 0]))).toBe(true);
    expect(background.colorSpace).toBe(SRGBColorSpace);
    expect((panel.background.material as MeshBasicMaterial).map).toBe(background);
    expect(panel.background.material).toMatchObject({ depthTest: true, depthWrite: false, toneMapped: false });
    expect(context.fillText).toHaveBeenCalledWith('Display', 1, 17);
    expect(document.fonts.add).toHaveBeenCalled();
    const camera = new PerspectiveCamera(); camera.position.z = 40; camera.updateMatrixWorld();
    panel.updateVisibility(camera); expect(panel.text.visible).toBe(false);
    camera.position.z = 2; camera.updateMatrixWorld(); panel.updateVisibility(camera); expect(panel.text.visible).toBe(true);
    panel.dispose(); expect(panel.root.parent).toBe(null);
  }
  expect(background.dispose).toHaveBeenCalledTimes(6);
  expect(document.fonts.delete).toHaveBeenCalledTimes(6);
});

it('fails explicitly and cleans up acquired resources at every failed loading stage', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
  await expect(loadDisplayPreview(0)).rejects.toThrow('Display font unavailable: HTTP 404');
  expect(document.fonts.add).not.toHaveBeenCalled();
  fontLoad.mockRejectedValueOnce(new Error('Invalid font'));
  await expect(loadDisplayPreview(0)).rejects.toThrow('Invalid font');
  vi.mocked(TextureLoader.prototype.loadAsync).mockRejectedValueOnce(new Error('Missing screen'));
  await expect(loadDisplayPreview(0)).rejects.toThrow('Missing screen');
  expect(document.fonts.delete).toHaveBeenCalledOnce();
  vi.mocked(document.createElement).mockReturnValueOnce({ getContext: () => null } as unknown as HTMLCanvasElement);
  await expect(loadDisplayPreview(0)).rejects.toThrow('2D canvas');
  expect(background.dispose).toHaveBeenCalledOnce();
  expect(document.fonts.delete).toHaveBeenCalledTimes(2);
});
