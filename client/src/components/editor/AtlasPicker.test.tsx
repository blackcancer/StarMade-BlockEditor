import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_TILES } from '../../3d/geometries/index.js';
import { useConfigStore } from '../../store/configStore.js';
import { AtlasPicker } from './AtlasPicker.js';

const { invalidateAtlasCache } = vi.hoisted(() => ({ invalidateAtlasCache: vi.fn() }));
vi.mock('../../3d/AtlasTexture.js', () => ({ invalidateAtlasCache }));

function installCanvasMocks() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
    imageSmoothingEnabled: false,
    strokeStyle: '',
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('Image', class MockImage {
    onload: null | (() => void) = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  });
  vi.stubGlobal('alert', vi.fn());
}

const okResponse = (body = 'ok') => ({ ok: true, text: async () => body }) as Response;
const badResponse = (body = 'bad') => ({ ok: false, text: async () => body }) as Response;

describe('AtlasPicker', () => {
  beforeEach(() => {
    installCanvasMocks();
    invalidateAtlasCache.mockClear();
    vi.stubGlobal('fetch', vi.fn());
    useConfigStore.setState({ atlasSize: 64, texturePack: 'Default', starmadeDir: '', worldDir: 'world0', isValid: true });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('selects atlas tiles from the 4x2 page grid and closes', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<AtlasPicker selectedTileId={0} onSelect={onSelect} onClose={onClose} />);

    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 5, top: 7, right: 0, bottom: 0, width: 0, height: 0, x: 5, y: 7, toJSON: () => ({}) });

    fireEvent.click(canvas, { clientX: 5 + 48 * 16, clientY: 7 + 1 });
    expect(onSelect).toHaveBeenCalledWith(PAGE_TILES);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tracks hover, clears it on leave, and ignores out-of-bounds clicks', () => {
    const onSelect = vi.fn();
    render(<AtlasPicker selectedTileId={0} onSelect={onSelect} onClose={vi.fn()} />);
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.mouseMove(canvas, { clientX: 49, clientY: 1 });
    expect((document.querySelector('.atlas-picker-hovered') as HTMLElement).style.left).toBe('48px');

    fireEvent.mouseLeave(canvas);
    expect(document.querySelector('.atlas-picker-hovered')).toBeNull();

    fireEvent.click(canvas, { clientX: 48 * 64, clientY: 1 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('manages custom atlas imports and dispatches refresh events', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse());
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onImported = vi.fn();
    window.addEventListener('atlas-imported', onImported);
    render(<AtlasPicker selectedTileId={PAGE_TILES * 7 + 3} onClose={vi.fn()} />);

    expect(screen.getByText('Custom atlas manager')).toBeTruthy();
    fireEvent.click(screen.getByText('Import full custom atlas…'));
    expect(clickSpy).toHaveBeenCalled();
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [] } });
    const fullAtlas = new File(['x'], 'atlas.png', { type: 'image/png' });
    fireEvent.change(fileInputs[0], { target: { files: [fullAtlas] } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/custom-atlas?size=64&map=diffuse', expect.objectContaining({ method: 'PUT', body: fullAtlas })));
    expect(invalidateAtlasCache).toHaveBeenCalled();
    expect(onImported).toHaveBeenCalled();
    window.removeEventListener('atlas-imported', onImported);
  });

  it('clamps custom tile slots, imports one tile as a normal map, and reports failures', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(badResponse('nope'))
      .mockResolvedValueOnce(badResponse('full nope'));
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<AtlasPicker selectedTileId={0} onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'normal' } });
    const slot = screen.getByLabelText('Slot') as HTMLInputElement;
    fireEvent.change(slot, { target: { value: '9999' } });
    expect(slot.value).toBe('255');

    fireEvent.click(screen.getByText('Replace selected tile…'));
    expect(clickSpy).toHaveBeenCalled();
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const tile = new File(['tile'], 'tile.png', { type: 'image/png' });
    fireEvent.change(fileInputs[1], { target: { files: [] } });
    fireEvent.change(fileInputs[1], { target: { files: [tile] } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(`/api/textures/custom-tile/${PAGE_TILES * 7 + 255}?size=64&map=normal`, expect.objectContaining({ method: 'PUT', body: tile })));

    fireEvent.change(fileInputs[1], { target: { files: [tile] } });
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Tile import failed: Error: nope')));

    const fullAtlas = new File(['atlas'], 'atlas.png', { type: 'image/png' });
    fireEvent.change(fileInputs[0], { target: { files: [fullAtlas] } });
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Custom atlas import failed: Error: full nope')));
  });

  it('selects custom slots in manager mode and closes with Escape/outside click', () => {
    const onClose = vi.fn();
    render(<AtlasPicker selectedTileId={0} onClose={onClose} />);
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.click(canvas, { clientX: 48 * 48 + 1, clientY: 48 * 16 + 1 });
    expect((screen.getByLabelText('Slot') as HTMLInputElement).value).toBe('0');

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByText('Custom atlas manager').closest('.atlas-picker-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
