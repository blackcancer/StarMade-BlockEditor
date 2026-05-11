import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore } from './store/blockStore.js';
import { useConfigStore } from './store/configStore.js';
import { App } from './App.js';

const mocks = vi.hoisted(() => ({
  saveConfig: vi.fn(),
  reload: vi.fn(),
  createBlock: vi.fn(),
  invalidateAtlasCache: vi.fn(),
}));

vi.mock('./components/sidebar/BlockList.js', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('./components/layout/Viewer.js', () => ({ ViewerColumn: () => <div data-testid="viewer" /> }));
vi.mock('./components/layout/Properties.js', () => ({ Properties: () => <div data-testid="properties" /> }));
vi.mock('./3d/AtlasTexture.js', () => ({ invalidateAtlasCache: mocks.invalidateAtlasCache }));
vi.mock('./hooks/useApi.js', () => ({
  useConfig: () => ({ saveConfig: mocks.saveConfig }),
  useBlocks: () => ({ reload: mocks.reload }),
  useCreateBlock: () => ({ createBlock: mocks.createBlock }),
}));

const jsonResponse = (data: unknown) => ({ json: async () => data }) as Response;

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ packs: [{ name: 'Default', sizes: [64, 128, 256] }] })));
    useConfigStore.setState({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default', isValid: false });
    useBlockStore.setState({ blocks: [] });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the three-column shell and prompts for a StarMade directory when invalid', () => {
    render(<App />);
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('viewer')).toBeTruthy();
    expect(screen.getByTestId('properties')).toBeTruthy();
    expect(screen.getByText('⚠ No StarMade directory configured')).toBeTruthy();
    expect(screen.getByText('Set the path to your StarMade installation directory to get started.')).toBeTruthy();
  });

  it('saves the initial config only when a non-empty directory is entered', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    expect(mocks.saveConfig).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('e.g. D:/Games/StarMade/StarMade'), { target: { value: 'D:/Games/StarMade' } });
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    expect(mocks.saveConfig).toHaveBeenCalledWith({ starmadeDir: 'D:/Games/StarMade' });
  });

  it('shows valid header state, loads texture packs, reloads and creates blocks', async () => {
    useConfigStore.setState({ starmadeDir: 'D:/Games/StarMade/StarMade', atlasSize: 128, texturePack: 'Default', isValid: true });
    useBlockStore.setState({ blocks: [{ id: 1 }, { id: 2 }] as any });
    render(<App />);

    expect(screen.getByText('✓ StarMade')).toBeTruthy();
    expect(screen.getByText('2 blocks')).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/packs?size=128'));

    fireEvent.click(screen.getByTitle('Reload blocks from disk'));
    fireEvent.click(screen.getByTitle('Create a new custom block'));
    expect(mocks.reload).toHaveBeenCalled();
    expect(mocks.createBlock).toHaveBeenCalled();
  });

  it('persists atlas size and texture pack changes with cache invalidation', async () => {
    useConfigStore.setState({ starmadeDir: '/StarMade', atlasSize: 64, texturePack: 'Default', isValid: true });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ packs: [{ name: 'Default', sizes: [64] }, { name: 'Custom', sizes: [64] }] }))
      .mockResolvedValueOnce(jsonResponse({ atlasSize: 128, texturePack: 'Default', isValid: true }))
      .mockResolvedValueOnce(jsonResponse({ packs: [{ name: 'Default', sizes: [128] }, { name: 'Custom', sizes: [128] }] }))
      .mockResolvedValueOnce(jsonResponse({ atlasSize: 128, texturePack: 'Custom', isValid: true }));

    render(<App />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '128' } });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({ method: 'POST' })));
    expect(mocks.invalidateAtlasCache).toHaveBeenCalled();
    expect(useConfigStore.getState()).toMatchObject({ atlasSize: 128, texturePack: 'Default', isValid: true });

    await waitFor(() => expect(screen.getByRole('option', { name: 'Custom' })).toBeTruthy());
    fireEvent.change(selects[1], { target: { value: 'Custom' } });
    await waitFor(() => expect(useConfigStore.getState().texturePack).toBe('Custom'));
  });

  it('handles fetch error for texture packs gracefully', async () => {
    useConfigStore.setState({ starmadeDir: '/StarMade', atlasSize: 64, texturePack: 'Default', isValid: true });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));
    render(<App />);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });

  it('uses fallback values from saveTextureConfig when API response is missing fields', async () => {
    useConfigStore.setState({ starmadeDir: '/StarMade', atlasSize: 64, texturePack: 'Default', isValid: true });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ packs: [] }))
      .mockResolvedValueOnce(jsonResponse({}));
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/packs?size=64'));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '128' } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({ method: 'POST' })));
    // atlasSize ?? next.atlasSize → 128, texturePack ?? 'Default', isValid ?? true
    expect(useConfigStore.getState()).toMatchObject({ atlasSize: 128, texturePack: 'Default', isValid: true });
  });
});
