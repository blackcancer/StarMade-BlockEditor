import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconPicker } from './IconPicker.js';

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

    fireEvent.mouseMove(canvas, { clientX: 36 * 16, clientY: 1 });
    const hover = document.querySelector('.atlas-picker-hovered') as HTMLElement;
    expect(hover.style.left).toBe(`${36 * 16}px`);
    expect(hover.style.top).toBe('0px');

    fireEvent.mouseLeave(canvas);
    expect(document.querySelector('.atlas-picker-hovered')).toBeNull();

    fireEvent.click(canvas, { clientX: 36 * 48, clientY: 36 * 99 });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
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
});
