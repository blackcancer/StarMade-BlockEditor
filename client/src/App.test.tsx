import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore } from './store/blockStore.js';
import { useConfigStore } from './store/configStore.js';
import { useI18nStore } from './i18n/index.js';
import { App } from './App.js';
import en from './i18n/en.js';
import fr from './i18n/fr.js';
import { localizeMessage } from './i18n/messages.js';

const mocks = vi.hoisted(() => ({ saveConfig: vi.fn(), reload: vi.fn(), createBlock: vi.fn(), useConfig: vi.fn() }));
vi.mock('./components/sidebar/BlockList.js', () => ({ Sidebar: ({ onBlockOpen }: { onBlockOpen(): void }) => <div data-testid="sidebar"><button onClick={onBlockOpen}>Open preview</button></div> }));
vi.mock('./components/layout/Viewer.js', () => ({ ViewerColumn: () => <div data-testid="viewer" /> }));
vi.mock('./components/layout/Properties.js', () => ({ Properties: () => <div data-testid="properties" /> }));
vi.mock('./hooks/useApi.js', () => ({
  useConfig: (autoload?: boolean) => { mocks.useConfig(autoload); return { saveConfig: mocks.saveConfig }; },
  useBlocks: () => ({ reload: mocks.reload }),
  useCreateBlock: () => ({ createBlock: mocks.createBlock }),
}));
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data }) as Response;
const configured = () => useConfigStore.setState({ starmadeDir: '/StarMade', isValid: true });

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) },
      close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ packs: [{ name: 'Default' }, { name: 'Custom' }] })));
    useConfigStore.setState({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default', isValid: false });
    useBlockStore.setState({ blocks: [], draft: null, error: null, isDirty: false });
    useI18nStore.getState().setLocale('en');
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('renders the editor shell and only the root autoloads configuration', () => {
    render(<App />);
    for (const section of ['sidebar', 'viewer', 'properties']) expect(screen.getByTestId(section)).toBeTruthy();
    expect(screen.getByText('⚠ No StarMade directory configured')).toBeTruthy();
    expect(screen.getByText('Set the path to your StarMade installation directory to get started.')).toBeTruthy();
    expect(mocks.useConfig.mock.calls).toEqual([[undefined], [false]]);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), cancel); expect(cancel.defaultPrevented).toBe(true);
  });

  it('ignores blank configuration and submits a trimmed installation path', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    const input = screen.getByPlaceholderText('e.g. D:/Games/StarMade/StarMade');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    expect(mocks.saveConfig).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' D:/Games/StarMade ' } });
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    expect(mocks.saveConfig).toHaveBeenCalledWith({ starmadeDir: 'D:/Games/StarMade' });
  });

  it('shows installation and catalogue state, loads packs and delegates reload/create actions', async () => {
    configured();
    useBlockStore.setState({ blocks: [{ id: 1 }, { id: 2 }] as any });
    render(<App />);
    expect(screen.getByText('✓ StarMade')).toBeTruthy();
    expect(screen.getByText('2 blocks')).toBeTruthy();
    await screen.findByRole('option', { name: 'Custom' });
    expect(fetch).toHaveBeenCalledWith('/api/textures/packs?size=256');
    fireEvent.click(screen.getByTitle('Reload blocks from disk'));
    fireEvent.click(screen.getByTitle('Create a new custom block'));
    expect(mocks.reload).toHaveBeenCalledOnce();
    expect(mocks.createBlock).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } });
    expect(useI18nStore.getState().locale).toBe('fr');
  });

  it('delegates atlas and pack writes to the shared checked configuration hook', async () => {
    configured(); render(<App />);
    await screen.findByRole('option', { name: 'Custom' });
    fireEvent.change(screen.getByTitle('Texture resolution'), { target: { value: '128' } });
    expect(mocks.saveConfig).toHaveBeenLastCalledWith({ atlasSize: 128, texturePack: 'Default' });
    fireEvent.change(screen.getByTitle('Texture pack'), { target: { value: 'Custom' } });
    expect(mocks.saveConfig).toHaveBeenLastCalledWith({ texturePack: 'Custom' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('shows global save/config errors without a selected draft (valid=%s)', async valid => {
    if (valid) configured();
    useBlockStore.setState({ error: 'Configuration refused' });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain(en.errors.unknown);
    expect(screen.getByText('Configuration refused').closest('details')).toBeTruthy();
    if (!valid) expect(screen.getByRole('alert').closest('.config-dialog')).toBeTruthy();
    await act(async () => {});
  });

  it.each([
    [() => Promise.resolve(response({}, 503)), 'Texture packs: HTTP 503'],
    [() => Promise.reject(new Error('network down')), 'network down'],
    [() => Promise.reject('connection lost'), 'connection lost'],
  ])('reports pack discovery failures in the visible error banner', async (result, message) => {
    configured(); vi.mocked(fetch).mockImplementationOnce(result as () => Promise<Response>);
    render(<App />);
    expect((await screen.findByRole('alert')).textContent).toContain(localizeMessage(message, en));
  });

  it.each([false, true])('translates recognized configuration errors with no technical fallback (valid=%s)', async valid => {
    if (valid) configured();
    useI18nStore.getState().setLocale('fr');
    useBlockStore.setState({ error: 'Unable to read or save editor configuration' });
    render(<App />);
    expect(screen.getByRole('alert').textContent).toBe(localizeMessage('Unable to read or save editor configuration', fr));
    expect(screen.queryByText(fr.errors.technicalDetails)).toBeNull();
    await act(async () => {});
  });

  it('accepts an empty pack catalogue', async () => {
    configured(); vi.mocked(fetch).mockResolvedValueOnce(response({})); render(<App />);
    await act(async () => {});
    expect(screen.getByTitle('Texture pack').querySelectorAll('option')).toHaveLength(0);
  });

  it('reloads packs after installation changes and ignores a stale response', async () => {
    let resolveOld!: (value: Response) => void;
    configured(); vi.mocked(fetch).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    render(<App />);
    act(() => useConfigStore.setState({ starmadeDir: '/Other' }));
    await screen.findByRole('option', { name: 'Custom' });
    await act(async () => resolveOld(response({ packs: [{ name: 'Stale' }] })));
    expect(screen.queryByRole('option', { name: 'Stale' })).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('ignores a pack request failure after unmount', async () => {
    let rejectOld!: (error: Error) => void;
    configured(); vi.mocked(fetch).mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject; }));
    const mounted = render(<App />); mounted.unmount();
    await act(async () => rejectOld(new Error('outdated')));
    expect(useBlockStore.getState().error).toBeNull();
  });

  it('warns on page exit only while a draft has unsaved changes', () => {
    const mounted = render(<App />);
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    act(() => useBlockStore.setState({ isDirty: true }));
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    act(() => useBlockStore.setState({ isDirty: false }));
    const saved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
    mounted.unmount();
  });

  it('requires consent before creating a block or replacing the installation while a draft is dirty', () => {
    useBlockStore.setState({ isDirty: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByTitle('Create a new custom block'));
    expect(mocks.createBlock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('e.g. D:/Games/StarMade/StarMade'), { target: { value: '/Other' } });
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    expect(mocks.saveConfig).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTitle('Create a new custom block'));
    fireEvent.click(screen.getByText('Save & Load Blocks'));
    expect(mocks.createBlock).toHaveBeenCalledOnce();
    expect(mocks.saveConfig).toHaveBeenCalledWith({ starmadeDir: '/Other' });
    confirm.mockRestore();
  });

  it('shows all panels on desktop and focuses the preview only in compact navigation', async () => {
    configured(); render(<App />); await act(async () => {});
    expect(screen.queryByRole('tablist')).toBeNull();
    for (const section of ['sidebar', 'viewer', 'properties']) expect(screen.getByTestId(section).closest('[hidden]')).toBeNull();
    fireEvent.click(screen.getByText('Open preview'));
    expect(screen.getByTestId('sidebar').closest('[hidden]')).toBeNull();
  });

  it('keeps panels and a dirty draft mounted while navigating compact tabs', async () => {
    configured(); vi.mocked(window.matchMedia).mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    const draft = { id: 1, name: 'Unsaved' } as any; useBlockStore.setState({ draft, isDirty: true });
    render(<App />); await act(async () => {});
    const viewer = screen.getByTestId('viewer');
    expect(viewer.closest('[hidden]')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Blocks' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Properties' }));
    expect(screen.getByTestId('properties').closest('[hidden]')).toBeNull();
    expect(useBlockStore.getState().draft).toBe(draft); expect(useBlockStore.getState().isDirty).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Blocks' }));
    fireEvent.click(screen.getByText('Open preview'));
    expect(screen.getByRole('tabpanel', { name: 'Preview' })).toBe(document.activeElement);
    expect(screen.getByTestId('viewer')).toBe(viewer);
    expect(useBlockStore.getState().draft).toBe(draft);
  });
});
