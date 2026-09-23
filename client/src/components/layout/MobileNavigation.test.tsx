import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MobileNavigation, useCompactLayout } from './MobileNavigation.js';

let change: (event: { matches: boolean }) => void;
const remove = vi.fn();
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true,
    addEventListener: (_type: string, listener: typeof change) => { change = listener; }, removeEventListener: remove })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('exposes labelled tabs, their panels and the selected keyboard stop', () => {
  const select = vi.fn();
  render(<MobileNavigation panel="blocks" onChange={select} />);
  expect(screen.getByRole('tablist', { name: 'Editor panels' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Blocks' }).getAttribute('aria-selected')).toBe('true');
  const preview = screen.getByRole('tab', { name: 'Preview' });
  expect(preview.tabIndex).toBe(-1); expect(preview.getAttribute('aria-controls')).toBe('panel-preview');
  fireEvent.click(preview); expect(select).toHaveBeenCalledWith('preview');
});
it.each([
  ['blocks', 'ArrowRight', 'preview'], ['preview', 'ArrowLeft', 'blocks'],
  ['properties', 'ArrowRight', 'blocks'], ['blocks', 'ArrowLeft', 'properties'],
  ['preview', 'Home', 'blocks'], ['blocks', 'End', 'properties'],
] as const)('supports keyboard navigation from %s via %s', (panel, key, next) => {
  const select = vi.fn(); render(<MobileNavigation panel={panel} onChange={select} />);
  fireEvent.keyDown(document.getElementById(`tab-${panel}`)!, { key });
  expect(select).toHaveBeenCalledWith(next);
  expect(document.activeElement?.id).toBe(`tab-${next}`);
});
it('leaves unrelated keys and Tab to the browser', () => {
  const select = vi.fn(); render(<MobileNavigation panel="blocks" onChange={select} />);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Blocks' }), { key: 'Tab' });
  expect(select).not.toHaveBeenCalled();
});
it('tracks the responsive breakpoint and releases its listener', () => {
  function Probe() { return <div>{useCompactLayout() ? 'compact' : 'desktop'}</div>; }
  const view = render(<Probe />); expect(screen.getByText('compact')).toBeTruthy();
  expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1024px)');
  act(() => change({ matches: false })); expect(screen.getByText('desktop')).toBeTruthy();
  view.unmount(); expect(remove).toHaveBeenCalledWith('change', change);
});
