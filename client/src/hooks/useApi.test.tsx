import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { useBlocks, useConfig, useCreateBlock, useDeleteBlock, useSaveBlock } from './useApi.js';

vi.mock('../3d/AtlasTexture.js', () => ({ invalidateAtlasCache: vi.fn() }));

const makeBlock = (patch: Partial<BlockDef> = {}): BlockDef => ({
  id: 1,
  name: 'Hull',
  icon: 1,
  textureId: [1, 2, 3, 4, 5, 6],
  xmlTypeName: 'HULL',
  hp: 10,
  mass: 1,
  volume: 1,
  price: 100,
  description: '',
  armor: 0,
  isPlacable: true,
  inShop: true,
  hasOrientation: false,
  canActivate: false,
  isDeprecated: false,
  blockStyle: 0,
  slab: 0,
  slabIds: [],
  styleIds: [],
  effectArmor: {},
  computerReference: 0,
  lightSource: false,
  lightSourceColor: [1, 1, 1, 1],
  transparency: false,
  door: false,
  logicBlock: false,
  individualSides: 6,
  sideTexturesPointToOrientation: false,
  hasActivationTexture: false,
  extendedTexture4x4: false,
  onlyDrawnInBuildMode: false,
  lodShapeFromFar: 0,
  animated: false,
  extraProperties: {},
  isCustom: false,
  ...patch,
});

const jsonResponse = (data: unknown, ok = true, statusText = 'OK') => ({ ok, statusText, json: async () => data }) as Response;

function Harness() {
  const { saveConfig } = useConfig(false);
  const { reload } = useBlocks(false);
  const { save } = useSaveBlock();
  const { deleteBlock } = useDeleteBlock();
  const { createBlock } = useCreateBlock();
  const first = useBlockStore(s => s.blocks[0]);
  return (
    <>
      <button onClick={() => saveConfig({ starmadeDir: '/game', atlasSize: 64, texturePack: 'Default' })}>save-config</button>
      <button onClick={reload}>reload</button>
      <button onClick={save}>save-block</button>
      <button onClick={() => first && deleteBlock(first)}>delete-block</button>
      <button onClick={createBlock}>create-block</button>
    </>
  );
}

describe('useApi hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    useConfigStore.setState({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default', isValid: false });
    useBlockStore.setState({ blocks: [], selectedBlock: null, draft: null, isDirty: false, loading: false, error: null });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('saves config and normalizes missing API fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ starmadeDir: '/game', isValid: true }));
    render(<Harness />);
    fireEvent.click(screen.getByText('save-config'));

    await waitFor(() => expect(useConfigStore.getState().starmadeDir).toBe('/game'));
    expect(fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({ method: 'POST' }));
    expect(useConfigStore.getState()).toMatchObject({ worldDir: 'world0', atlasSize: 256, texturePack: 'Default', isValid: true });
  });

  it('reloads blocks only when config is valid and clears loading/error state', async () => {
    useConfigStore.setState({ isValid: true });
    const block = makeBlock();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([block]));
    render(<Harness />);
    fireEvent.click(screen.getByText('reload'));

    expect(useBlockStore.getState().loading).toBe(true);
    await waitFor(() => expect(useBlockStore.getState().blocks).toEqual([block]));
    expect(useBlockStore.getState()).toMatchObject({ loading: false, error: null });
  });

  it('stores reload errors and always resets loading', async () => {
    useConfigStore.setState({ isValid: true });
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));
    render(<Harness />);
    fireEvent.click(screen.getByText('reload'));

    await waitFor(() => expect(useBlockStore.getState().error).toContain('network down'));
    expect(useBlockStore.getState().loading).toBe(false);
  });

  it('saves current draft, replaces the block and resets dirty state', async () => {
    const original = makeBlock();
    const saved = makeBlock({ name: 'Saved' });
    useBlockStore.setState({ blocks: [original], draft: { ...original, name: 'Draft' }, isDirty: true });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(saved));
    render(<Harness />);
    fireEvent.click(screen.getByText('save-block'));

    await waitFor(() => expect(useBlockStore.getState().blocks[0].name).toBe('Saved'));
    expect(useBlockStore.getState().selectedBlock?.name).toBe('Saved');
    expect(useBlockStore.getState().isDirty).toBe(false);
  });

  it('reports save failures without mutating the block list', async () => {
    const original = makeBlock();
    useBlockStore.setState({ blocks: [original], draft: original });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 'Forbidden'));
    render(<Harness />);
    fireEvent.click(screen.getByText('save-block'));

    await waitFor(() => expect(useBlockStore.getState().error).toContain('Save failed: Forbidden'));
    expect(useBlockStore.getState().blocks).toEqual([original]);
  });

  it('creates and deletes custom blocks while keeping selection consistent', async () => {
    const first = makeBlock({ id: 1 });
    const created = makeBlock({ id: 2, isCustom: true });
    useBlockStore.setState({ blocks: [first] });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(created))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    render(<Harness />);

    fireEvent.click(screen.getByText('create-block'));
    await waitFor(() => expect(useBlockStore.getState().blocks.map(b => b.id)).toEqual([1, 2]));
    expect(useBlockStore.getState().selectedBlock?.id).toBe(2);

    fireEvent.click(screen.getByText('delete-block'));
    await waitFor(() => expect(useBlockStore.getState().blocks.map(b => b.id)).toEqual([2]));
    expect(useBlockStore.getState().selectedBlock?.id).toBe(2);
  });

  it('supports no-op save when there is no draft', async () => {
    render(<Harness />);
    await act(async () => fireEvent.click(screen.getByText('save-block')));
    expect(fetch).not.toHaveBeenCalled();
  });
});
