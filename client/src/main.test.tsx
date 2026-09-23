import React from 'react';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ render: vi.fn(), createRoot: vi.fn() }));
vi.mock('react-dom/client', () => ({ default: { createRoot: mocks.createRoot } }));
vi.mock('./App.js', () => ({ App: function TestApp() { return null; } }));
it('mounts the application into the HTML root with StrictMode enabled', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  mocks.createRoot.mockReturnValue({ render: mocks.render });
  await import('./main.js');
  expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById('root'));
  expect(mocks.render.mock.calls[0][0].type).toBe(React.StrictMode);
  expect(mocks.render.mock.calls[0][0].props.children.type.name).toBe('TestApp');
});
