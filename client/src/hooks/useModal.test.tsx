import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useModal } from './useModal.js';
const show = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
const close = vi.fn(function (this: HTMLDialogElement) { expect(this.isConnected).toBe(true); this.open = false; });
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperties(HTMLDialogElement.prototype, { showModal: { configurable: true, value: show }, close: { configurable: true, value: close } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Modal() { return <dialog ref={useModal()} aria-label="Picker"><button autoFocus>Close</button></dialog>; }
it('restores the opener captured before child autofocus and closes before DOM removal', () => {
  render(<button>Open picker</button>);
  const opener = screen.getByRole('button', { name: 'Open picker' }); opener.focus();
  const view = render(<Modal />);
  expect(screen.getByRole('dialog', { name: 'Picker' })).toBeTruthy(); expect(show).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  view.unmount(); expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(opener);
});
it('does not focus an opener removed while the dialog was open', () => {
  const source = render(<button>Open picker</button>);
  const opener = screen.getByRole('button', { name: 'Open picker' }); opener.focus();
  const focus = vi.spyOn(opener, 'focus');
  const view = render(<Modal />);
  source.unmount(); view.unmount();
  expect(focus).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(document.body);
});
it('allows initial configuration dialogs without a focusable opener', () => {
  const active = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(null);
  const view = render(<Modal />); active.mockRestore();
  view.unmount(); expect(close).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(document.body);
});
