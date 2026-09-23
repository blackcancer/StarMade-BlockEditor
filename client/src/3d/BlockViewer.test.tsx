import React, { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import type { RenderAssets } from './renderAssets.js';
import { useI18nStore } from '../i18n/index.js';
const state = vi.hoisted(() => ({ load: vi.fn(), capture: vi.fn(), preview: { object: {} }, meshError: null as string | null, canvasError: false, webgl: true, gl: null as any }));
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, frameloop }: { children: React.ReactNode; onCreated: (state: any) => void; frameloop: string }) => {
    if (state.canvasError) throw new Error('Renderer creation failed');
    useEffect(() => { state.gl = { capabilities: { isWebGL2: state.webgl }, debug: {}, domElement: document.createElement('canvas') }; onCreated({ gl: state.gl }); }, [onCreated]);
    return <div data-testid="canvas" data-frameloop={frameloop}>{children}</div>;
  },
}));
vi.mock('@react-three/drei', () => ({ Grid: () => <div />, OrbitControls: () => <div /> }));
vi.mock('./BlockMesh.js', () => ({ BlockMesh: ({ block, isActive, onReady, onError }: any) => {
  useEffect(() => { if (state.meshError) onError(state.meshError); else onReady(state.preview); }, [onReady, onError]);
  return <div data-testid="block-mesh">{block.name}:{String(isActive)}</div>;
} }));
vi.mock('./renderAssets.js', () => ({ loadRenderAssets: state.load }));
vi.mock('./captureIcon.js', () => ({ captureNativeIcon: state.capture }));
import { BlockViewer } from './BlockViewer.js';
const block = (patch: Partial<BlockDef> = {}) => ({ id: 1, name: 'Hull', hp: 255, textureId: [1],
  individualSides: 1, blockStyle: 0, slab: 0, slabIds: [], lightSource: false,
  lightSourceColor: [1, 1, 1, 1], extraProperties: {}, ...patch } as BlockDef);
const bundle = (warnings: string[] = []) => ({ manifest: { revision: '1', warnings }, pack: {}, shaders: {}, dispose: vi.fn() } as unknown as RenderAssets);
beforeEach(() => {
  useI18nStore.getState().setLocale('en');
  state.load.mockReset(); state.capture.mockReset(); state.webgl = true; state.meshError = null; state.canvasError = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useConfigStore.setState({ starmadeDir: '/game', atlasSize: 64, texturePack: 'Default', isValid: false });
  useBlockStore.setState({ draft: null, orientation: 0, previewActive: true, highlightFace: -1, captureIcon: null });
});
afterEach(() => { cleanup(); useI18nStore.getState().setLocale('en'); vi.restoreAllMocks(); });

describe('native viewport loading and diagnostics', () => {
  it('does not request assets without a selected block and valid installation', () => {
    render(<BlockViewer />); expect(state.load).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('loads native resources, renders the current draft and reloads imports and installation changes', async () => {
    const first = bundle(['Native normal material layer 0 is missing.']), second = bundle(), third = bundle();
    state.load.mockResolvedValueOnce(first).mockResolvedValueOnce(second).mockResolvedValueOnce(third);
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() });
    const view = render(<BlockViewer />);
    await waitFor(() => expect(screen.getByTestId('block-mesh').textContent).toBe('Hull:true'));
    expect(screen.getByRole('status').textContent).toContain('Normal material layer 0 is missing.');
    expect(state.load.mock.calls[0][0]).toMatchObject({ size: 64, pack: 'Default', layers: [0] });
    act(() => window.dispatchEvent(new Event('atlas-imported')));
    await waitFor(() => expect(state.load).toHaveBeenCalledTimes(2));
    expect(first.dispose).toHaveBeenCalledOnce();
    act(() => useConfigStore.setState({ starmadeDir: '/other-game' }));
    await waitFor(() => expect(state.load).toHaveBeenCalledTimes(3));
    expect(second.dispose).toHaveBeenCalledOnce(); view.unmount(); expect(third.dispose).toHaveBeenCalledOnce();
  });
  it('disposes obsolete results and ignores obsolete rejections', async () => {
    let finish!: (value: RenderAssets) => void, reject!: (error: Error) => void;
    state.load.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() });
    const view = render(<BlockViewer />);
    expect(screen.getByRole('status').textContent).toContain('Loading');
    act(() => useConfigStore.setState({ starmadeDir: '/other' }));
    const obsolete = bundle(); await act(async () => finish(obsolete)); expect(obsolete.dispose).toHaveBeenCalledOnce();
    view.unmount(); await act(async () => reject(new Error('Old request')));
  });
  it('shows asset, invalid tile and native construction errors as text', async () => {
    state.load.mockRejectedValueOnce(new Error('Shader files missing'));
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() });
    const view = render(<BlockViewer />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Shader files missing'));
    act(() => useBlockStore.setState({ draft: block({ textureId: [1024] }) }));
    expect(screen.getByRole('alert').textContent).toContain('atlas'); view.unmount();
    state.load.mockResolvedValue(bundle()); state.meshError = 'Missing LOD desk';
    useBlockStore.setState({ draft: block() }); render(<BlockViewer />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Missing LOD desk'));
  });
  it('rejects WebGL1 explicitly and reports context loss and shader compile failures', async () => {
    state.webgl = false; const first = render(<BlockViewer />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('WebGL 2')); first.unmount();
    state.webgl = true; const second = render(<BlockViewer />);
    act(() => state.gl.domElement.dispatchEvent(new Event('webglcontextlost')));
    expect(screen.getByRole('alert').textContent).toContain('context'); second.unmount();
    render(<BlockViewer />); act(() => state.gl.debug.onShaderError());
    expect(screen.getByRole('alert').textContent).toContain('shader');
    fireEvent.click(screen.getByRole('button', { name: /Reload/ }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('keeps a synchronous renderer error visible and retries after recovery', async () => {
    state.canvasError = true; render(<BlockViewer />);
    expect(screen.getByRole('alert').textContent).toContain('Renderer creation failed');
    state.canvasError = false; fireEvent.click(screen.getByRole('button', { name: /Reload/ }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
  it('normalizes non-Error asset rejections', async () => {
    state.load.mockRejectedValue('Resource unavailable');
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() }); render(<BlockViewer />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Resource unavailable'));
  });
  it('registers native icon capture only for a ready preview and removes it on errors and unmount', async () => {
    state.load.mockResolvedValue(bundle()); const blob = new Blob(['png'], { type: 'image/png' }); state.capture.mockResolvedValue(blob);
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() });
    const view = render(<BlockViewer />);
    expect(useBlockStore.getState().captureIcon).toBeNull();
    await waitFor(() => expect(useBlockStore.getState().captureIcon).toBeTypeOf('function'));
    expect(await useBlockStore.getState().captureIcon!()).toBe(blob);
    expect(state.capture).toHaveBeenCalledWith(state.gl, state.preview);
    act(() => state.gl.debug.onShaderError()); expect(useBlockStore.getState().captureIcon).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reload/ }));
    await waitFor(() => expect(useBlockStore.getState().captureIcon).toBeTypeOf('function'));
    view.unmount(); expect(useBlockStore.getState().captureIcon).toBeNull();
  });
  it('pauses hidden viewport frames while keeping native icon export available', async () => {
    state.load.mockResolvedValue(bundle()); const blob = new Blob(['png']); state.capture.mockResolvedValue(blob);
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() });
    const view = render(<BlockViewer visible={false} />);
    await waitFor(() => expect(useBlockStore.getState().captureIcon).toBeTypeOf('function'));
    expect(screen.getByTestId('canvas').dataset.frameloop).toBe('never');
    expect(await useBlockStore.getState().captureIcon!()).toBe(blob);
    view.rerender(<BlockViewer visible />);
    expect(screen.getByTestId('canvas').dataset.frameloop).toBe('always');
  });
  it('retranslates an existing graphics error when the user changes language', async () => {
    state.webgl = false; const first = render(<BlockViewer />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('WebGL 2'));
    act(() => useI18nStore.getState().setLocale('fr'));
    expect(screen.getByRole('alert').textContent).toContain(useI18nStore.getState().t.viewer.webgl2Required);
    first.unmount(); state.webgl = true; render(<BlockViewer />);
    act(() => state.gl.domElement.dispatchEvent(new Event('webglcontextlost')));
    expect(screen.getByRole('alert').textContent).toContain('Le contexte graphique a été perdu');
    expect(screen.queryByText('Détails techniques')).toBeNull();
  });
  it('localizes manifest warnings and keeps unknown failures inside optional technical details', async () => {
    useI18nStore.getState().setLocale('fr');
    state.load.mockResolvedValue(bundle(['Native normal layer 7 has no alpha channel; material alpha is set to zero.']));
    useConfigStore.setState({ isValid: true }); useBlockStore.setState({ draft: block() });
    const view = render(<BlockViewer />);
    await waitFor(() => expect(screen.getByText(/La couche de normales 7/)).toBeTruthy());
    view.unmount(); state.load.mockRejectedValue(new Error('Unknown GPU driver problem')); render(<BlockViewer />);
    await waitFor(() => expect(screen.getByText('Détails techniques')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('L’opération n’a pas pu aboutir');
    expect(screen.getByText('Unknown GPU driver problem').closest('details')?.open).toBe(false);
  });
});
