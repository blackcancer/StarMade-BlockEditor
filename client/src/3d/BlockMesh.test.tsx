import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Group, PerspectiveCamera } from 'three';
import type { BlockDefinition } from 'starmade-3d';
import type { RenderAssets } from './renderAssets.js';
const state = vi.hoisted(() => ({ frame: null as null | ((state: { camera: PerspectiveCamera }, delta: number) => void), create: vi.fn() }));
vi.mock('@react-three/fiber', () => ({ useFrame: (callback: typeof state.frame) => { state.frame = callback; } }));
vi.mock('./nativePreview.js', () => ({ createNativePreview: state.create }));
import { BlockMesh } from './BlockMesh.js';
const block = { id: 1 } as BlockDefinition;
const assets = {} as RenderAssets;
const preview = () => ({ object: new Group(), update: vi.fn(), dispose: vi.fn() });
beforeEach(() => { state.create.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('native scene lifecycle in React', () => {
  it('updates the current object and disposes it on block change and unmount', async () => {
    const first = preview(), second = preview(); state.create.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const onError = vi.fn(), onReady = vi.fn();
    const { rerender, unmount } = render(<BlockMesh block={block} assets={assets} orientation={0} isActive highlightFace={-1} onError={onError} onReady={onReady} />);
    state.frame!({ camera: new PerspectiveCamera() }, 0.1);
    await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
    expect(onReady).toHaveBeenCalledWith(first);
    const camera = new PerspectiveCamera(); state.frame!({ camera }, 0.2);
    expect(first.update).toHaveBeenCalledWith(0.2, camera);
    rerender(<BlockMesh block={block} assets={assets} orientation={1} isActive={false} highlightFace={2} onError={onError} onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(2));
    expect(first.dispose).toHaveBeenCalledOnce(); unmount(); expect(second.dispose).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });
  it('destroys a late LOD result after unmount and suppresses obsolete errors', async () => {
    let resolve!: (value: ReturnType<typeof preview>) => void;
    state.create.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const onError = vi.fn(), onReady = vi.fn();
    const view = render(<BlockMesh block={block} assets={assets} orientation={0} isActive highlightFace={-1} onError={onError} onReady={onReady} />);
    view.unmount(); const late = preview(); await act(async () => resolve(late));
    expect(late.dispose).toHaveBeenCalledOnce(); expect(onReady).not.toHaveBeenCalled();
    let reject!: (reason: unknown) => void;
    state.create.mockImplementationOnce(() => new Promise((_done, fail) => { reject = fail; }));
    const again = render(<BlockMesh block={block} assets={assets} orientation={0} isActive highlightFace={-1} onError={onError} onReady={onReady} />);
    again.unmount(); await act(async () => reject(new Error('Old installation')));
    expect(onError).not.toHaveBeenCalled();
  });
  it('reports a current native construction failure through its parent', async () => {
    state.create.mockRejectedValue(new Error('Missing native material'));
    const onError = vi.fn();
    render(<BlockMesh block={block} assets={assets} orientation={0} isActive highlightFace={-1} onError={onError} onReady={vi.fn()} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Missing native material'));
  });
  it('normalizes a non-Error rejection from an external loader', async () => {
    state.create.mockRejectedValue('Loader rejected'); const onError = vi.fn();
    render(<BlockMesh block={block} assets={assets} orientation={0} isActive highlightFace={-1} onError={onError} onReady={vi.fn()} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Loader rejected'));
  });
});
