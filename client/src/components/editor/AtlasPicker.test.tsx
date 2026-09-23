import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_TILES } from '../../3d/geometries/index.js';
import { useConfigStore } from '../../store/configStore.js';
import { AtlasPicker } from './AtlasPicker.js';
import { useI18nStore } from '../../i18n/index.js';
import fr from '../../i18n/fr.js';


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
    private _src = '';
    private _onload: (() => void) | null = null;
    get onload() { return this._onload; }
    set onload(fn: (() => void) | null) {
      this._onload = fn;
      if (fn && this._src) {
        // src was already set — fire onload now that handler is registered
        Promise.resolve().then(() => fn());
      }
    }
    set src(value: string) {
      this._src = value;
      if (this._onload) {
        Promise.resolve().then(() => this._onload?.());
      }
    }
    get src() { return this._src; }
  });
  vi.stubGlobal('alert', vi.fn());
}

const okResponse = (body = 'ok') => ({ ok: true, text: async () => body }) as Response;
const badResponse = (body = 'bad') => ({ ok: false, text: async () => body }) as Response;

describe('AtlasPicker', () => {
  beforeEach(() => {
    installCanvasMocks();
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) },
      close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) },
    });
    vi.stubGlobal('fetch', vi.fn());
    useConfigStore.setState({ atlasSize: 64, texturePack: 'Default', starmadeDir: '', worldDir: 'world0', isValid: true });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useI18nStore.getState().setLocale('en');
  });

  it('keeps recognized import failures in a translated accessible dialog message', async () => {
    useI18nStore.getState().setLocale('fr');
    vi.mocked(fetch).mockResolvedValueOnce(badResponse('{"error":"Expected a PNG"}'));
    render(<AtlasPicker selectedTileId={0} onClose={vi.fn()} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['bad'], 'bad.png')] } });
    expect(await screen.findByText(fr.errors.image)).toBeTruthy();
    expect(screen.getByRole('alert').closest('dialog')).toBeTruthy();
    expect(screen.queryByText(fr.errors.technicalDetails)).toBeNull();
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

    // Hover tile 1 (column 1)
    fireEvent.mouseMove(canvas, { clientX: 49, clientY: 1 });
    expect((document.querySelector('.atlas-picker-hovered') as HTMLElement).style.left).toBe('48px');

    // Hover same tile again — no-op branch (prev === nextTile ? prev : nextTile)
    fireEvent.mouseMove(canvas, { clientX: 49, clientY: 1 });

    fireEvent.mouseLeave(canvas);
    expect(document.querySelector('.atlas-picker-hovered')).toBeNull();

    // Out-of-bounds — col >= ATLAS_COLS (64): returns -1 → onClick returns early
    fireEvent.click(canvas, { clientX: 48 * 64, clientY: 1 });
    expect(onSelect).not.toHaveBeenCalled();

    // Negative col: clientX < 0 relative to rect → col < 0 → id=-1 → onClick returns early
    fireEvent.click(canvas, { clientX: -1, clientY: 1 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('in manager mode: valid click outside custom slot range is a no-op', () => {
    render(<AtlasPicker selectedTileId={0} onClose={vi.fn()} />);
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });
    // Click tile 0 (id < PAGE_TILES*7) — not in custom range, no onSelect → both branches uncovered by previous test
    const slotBefore = (screen.getByLabelText('Slot') as HTMLInputElement).value;
    fireEvent.click(canvas, { clientX: 1, clientY: 1 });
    // slot should be unchanged since id < PAGE_TILES*7
    expect((screen.getByLabelText('Slot') as HTMLInputElement).value).toBe(slotBefore);
  });

  it('handles null canvas context gracefully (early return guard)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() => render(<AtlasPicker selectedTileId={0} onClose={vi.fn()} />)).not.toThrow();
  });

  it('draws the atlas grid on canvas after image load', async () => {
    const { act } = await import('@testing-library/react');
    const ctx = {
      clearRect: vi.fn(), drawImage: vi.fn(), strokeRect: vi.fn(),
      imageSmoothingEnabled: false, strokeStyle: '', lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    render(<AtlasPicker selectedTileId={0} onClose={vi.fn()} />);
    // Flush promises so img.onload fires
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    expect((ctx as any).drawImage).toHaveBeenCalled();
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
    const fullAtlas = new File(['x'], 'atlas.bin', { type: '' });  // empty type → || 'application/octet-stream'
    fireEvent.change(fileInputs[0], { target: { files: [fullAtlas] } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/custom-atlas?size=64&map=diffuse', expect.objectContaining({ method: 'PUT', body: fullAtlas })));
    expect(onImported).toHaveBeenCalledOnce();
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
    // Open the details section first
    fireEvent.click(screen.getByText('Advanced: replace one tile'));
    fireEvent.change(slot, { target: { value: '9999' } });
    expect(slot.value).toBe('255');

    // empty value → +'' = NaN → || 0 → slot becomes 0
    fireEvent.change(slot, { target: { value: '' } });
    expect(slot.value).toBe('0');

    fireEvent.click(screen.getByText('Replace selected tile…'));
    expect(clickSpy).toHaveBeenCalled();
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const tile = new File(['tile'], 'tile.bin', { type: '' });  // empty type → || 'application/octet-stream'
    fireEvent.change(fileInputs[1], { target: { files: [] } });
    fireEvent.change(fileInputs[1], { target: { files: [tile] } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(`/api/textures/custom-tile/${PAGE_TILES * 7 + 0}?size=64&map=normal`, expect.objectContaining({ method: 'PUT', body: tile })));

    fireEvent.change(fileInputs[1], { target: { files: [tile] } });
    expect(await screen.findByText('nope')).toBeTruthy();
    expect(screen.getByRole('alert').querySelector('details')).toBeTruthy();

    const fullAtlas = new File(['atlas'], 'atlas.png', { type: 'image/png' });
    fireEvent.change(fileInputs[0], { target: { files: [fullAtlas] } });
    expect(await screen.findByText('full nope')).toBeTruthy();
  });

  it('selects custom slots in manager mode and closes with Escape/outside click', () => {
    const onClose = vi.fn();
    render(<AtlasPicker selectedTileId={0} onClose={onClose} />);
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.click(canvas, { clientX: 48 * 48 + 1, clientY: 48 * 16 + 1 });
    expect((screen.getByLabelText('Slot') as HTMLInputElement).value).toBe('0');

    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    fireEvent.click(screen.getByText('Custom atlas manager').closest('.atlas-picker-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it.each([0, 1])('finishes pending import %s after the modal closes', async index => {
    let resolve!: (res: Response) => void; vi.mocked(fetch).mockReturnValue(new Promise(r => { resolve = r; }));
    const onImported = vi.fn(); window.addEventListener('atlas-imported', onImported);
    const view = render(<AtlasPicker selectedTileId={0} onClose={vi.fn()} />);
    fireEvent.change(document.querySelectorAll('input[type=file]')[index], { target: { files: [new File(['png'], 'test.png', { type: 'image/png' })] } });
    view.unmount(); await act(async () => resolve(okResponse()));
    expect(onImported).toHaveBeenCalledOnce(); window.removeEventListener('atlas-imported', onImported);
  });

});
