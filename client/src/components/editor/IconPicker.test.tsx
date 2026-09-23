import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconPicker } from './IconPicker.js';

function installCanvasMocks() {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) },
    close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) },
  });
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
      if (fn && this._src) Promise.resolve().then(() => fn());
    }
    set src(value: string) {
      this._src = value;
      if (this._onload) Promise.resolve().then(() => this._onload?.());
    }
    get src() { return this._src; }
  });
}

describe('IconPicker', () => {
  beforeEach(installCanvasMocks);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('draws the icon sheets and selects the icon computed from canvas coordinates', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<IconPicker selectedIconId={0} onSelect={onSelect} onClose={onClose} />);

    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, right: 0, bottom: 0, width: 0, height: 0, x: 10, y: 20, toJSON: () => ({}) });

    fireEvent.click(canvas, { clientX: 10 + 37, clientY: 20 + 1 });
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tracks hover, ignores out-of-sheet clicks, and closes on Escape/outside click', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<IconPicker selectedIconId={9999} onSelect={onSelect} onClose={onClose} />);

    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) });

    // hover a valid icon
    fireEvent.mouseMove(canvas, { clientX: 36 * 16, clientY: 1 });
    const hover = document.querySelector('.atlas-picker-hovered') as HTMLElement;
    expect(hover.style.left).toBe(`${36 * 16}px`);
    expect(hover.style.top).toBe('0px');

    // hovering same position again — state function no-op branch (prev === nextIcon ? prev : nextIcon)
    fireEvent.mouseMove(canvas, { clientX: 36 * 16, clientY: 1 });

    fireEvent.mouseLeave(canvas);
    expect(document.querySelector('.atlas-picker-hovered')).toBeNull();

    // out-of-bounds (sheet >= ICON_SHEETS — high row means sheetRow×3 + sheetCol ≥ 6)
    fireEvent.click(canvas, { clientX: 36 * 48, clientY: 36 * 99 });
    expect(onSelect).not.toHaveBeenCalled();

    // col < 0 path: negative clientX below left edge
    fireEvent.click(canvas, { clientX: -1, clientY: 1 });
    expect(onSelect).not.toHaveBeenCalled();

    // row < 0 path: negative clientY below top edge
    fireEvent.click(canvas, { clientX: 1, clientY: -1 });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(canvas, { clientX: 1, clientY: 36 * 33 });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Build Icons').closest('.atlas-picker-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('stops modal clicks from closing and supports the explicit close button', () => {
    const onClose = vi.fn();
    render(<IconPicker selectedIconId={0} onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Build Icons'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses touch-sized 44px cells with matching coordinates and selection overlays', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    const select = vi.fn(); render(<IconPicker selectedIconId={1} onSelect={select} onClose={vi.fn()} />);
    const canvas = document.querySelector('canvas')!;
    expect(canvas.width).toBe(48 * 44);
    const selected = document.querySelector('.atlas-picker-selected') as HTMLElement;
    expect(selected.style.left).toBe('44px'); expect(selected.style.width).toBe('44px');
    fireEvent.click(canvas, { clientX: 45, clientY: 1 }); expect(select).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('handles null canvas context gracefully (early return guard)', () => {
    // Override getContext to return null — covers the !ctx early return branch
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() => render(<IconPicker selectedIconId={0} onSelect={vi.fn()} onClose={vi.fn()} />)).not.toThrow();
  });

  it('draws icon sheets on canvas after image load', async () => {
    const { act } = await import('@testing-library/react');
    render(<IconPicker selectedIconId={0} onSelect={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    const ctx = vi.mocked(HTMLCanvasElement.prototype.getContext).mock.results[0].value as CanvasRenderingContext2D;
    expect(ctx.drawImage).toHaveBeenCalledTimes(6 * 256);
    expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 64, 64, 0, 0, 36, 36);

  });
});
