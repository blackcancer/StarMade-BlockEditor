import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useI18nStore } from '../../i18n/index.js';
import { IconField } from './IconField.js';
import { useBlockStore } from '../../store/blockStore.js';
import { useConfigStore } from '../../store/configStore.js';
vi.mock('./IconPicker.js', () => ({ IconPicker: ({ onSelect, onClose }: { onSelect: (id: number) => void; onClose: () => void }) => <div role="dialog"><button onClick={() => onSelect(77)}>choose77</button><button onClick={onClose}>close-picker</button></div> }));
const reply = (body: unknown = { canRestore: true }, ok = true) => ({ ok, json: async () => body, text: async () => 'image rejected' }) as Response;
beforeEach(() => { useI18nStore.getState().setLocale('en'); useBlockStore.setState({ captureIcon: null }); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply())); useConfigStore.setState({ starmadeDir: '/fixture' }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const input = () => document.querySelector('input[type=file]')!;
it('shows the write notice, checks backup availability and forwards icon selection without importing', async () => {
  const onChange = vi.fn(); render(<IconField icon={10} onChange={onChange} />);
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/icon/10/status'));
  expect(screen.getByText(/backup/i)).toBeTruthy();
  fireEvent.click(screen.getByTitle('Pick build icon')); fireEvent.click(screen.getByText('choose77')); expect(onChange).toHaveBeenCalledWith(77);
  fireEvent.click(screen.getByText('close-picker')); expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByText('Pick…')); expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '11' } }); expect(onChange).toHaveBeenCalledWith(11);
});
it('imports and restores a backed up slot, refreshes its image, and leaves the block draft unchanged', async () => {
  const onChange = vi.fn(); render(<IconField icon={10} onChange={onChange} />);
  await waitFor(() => expect(screen.getByText('Restore original icon').closest('button')?.disabled).toBe(false));
  const initial = document.querySelector('img')!.src;
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByText('Import…')); expect(click).toHaveBeenCalledOnce();
  fireEvent.change(input(), { target: { files: [] } }); expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.change(input(), { target: { files: null } }); expect(fetch).toHaveBeenCalledTimes(1);
  const file = new File(['png'], 'test.png', { type: 'image/png' });
  fireEvent.change(input(), { target: { files: [file] } });
  await waitFor(() => expect(document.querySelector('img')!.src).not.toBe(initial));
  expect(fetch).toHaveBeenCalledWith('/api/textures/icon/10', expect.objectContaining({ method: 'PUT', body: file, headers: { 'Content-Type': 'image/png' } }));
  const imported = document.querySelector('img')!.src;
  fireEvent.click(screen.getByText('Restore original icon'));
  await waitFor(() => expect(document.querySelector('img')!.src).not.toBe(imported));
  expect(fetch).toHaveBeenCalledWith('/api/textures/icon/10/restore', { method: 'POST' }); expect(onChange).not.toHaveBeenCalled();
});
it('disables restore without a backup and reports status errors', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(reply({ canRestore: false })).mockResolvedValueOnce(reply({}, false)).mockRejectedValueOnce(new Error('offline'));
  const view = render(<IconField icon={10} onChange={vi.fn()} />);
  await act(async () => {}); expect(screen.getByText('Restore original icon').closest('button')?.disabled).toBe(true);
  view.rerender(<IconField icon={11} onChange={vi.fn()} />); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('image rejected'));
  view.rerender(<IconField icon={12} onChange={vi.fn()} />); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('offline'));
});
it('shows a pending upload and its failure without refreshing the image or enabling restore', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(reply({ canRestore: false }));
  render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  let resolve!: (r: Response) => void; vi.mocked(fetch).mockReturnValueOnce(new Promise(r => { resolve = r; }));
  const original = document.querySelector('img')!.src;
  fireEvent.change(input(), { target: { files: [new File(['bad'], 'test.bin')] } });
  expect(screen.getByText('Importing…').closest('button')?.disabled).toBe(true);
  expect(fetch).toHaveBeenLastCalledWith('/api/textures/icon/10', expect.objectContaining({ headers: { 'Content-Type': 'application/octet-stream' } }));
  await act(async () => resolve(reply({}, false)));
  expect(screen.getByRole('alert').textContent).toContain('image rejected'); expect(document.querySelector('img')!.src).toBe(original);
  expect(screen.getByText('Restore original icon').closest('button')?.disabled).toBe(true);
});
it('ignores backup status replies and failures after selecting another icon or unmounting', async () => {
  let resolve!: (r: Response) => void; let reject!: (error: Error) => void;
  vi.mocked(fetch).mockReturnValueOnce(new Promise(r => { resolve = r; })).mockReturnValueOnce(new Promise((_r, f) => { reject = f; }));
  const view = render(<IconField icon={10} onChange={vi.fn()} />); view.rerender(<IconField icon={11} onChange={vi.fn()} />);
  await act(async () => resolve(reply())); expect(screen.getByText('Restore original icon').closest('button')?.disabled).toBe(true);
  view.unmount(); await act(async () => reject(new Error('late'))); expect(screen.queryByRole('alert')).toBeNull();
});
it('does not apply an upload result to a different icon', async () => {
  const view = render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  let resolve!: (r: Response) => void; vi.mocked(fetch).mockReturnValueOnce(new Promise(r => { resolve = r; })).mockResolvedValueOnce(reply({ canRestore: false }));
  fireEvent.change(input(), { target: { files: [new File(['png'], 'test.png')] } });
  view.rerender(<IconField icon={11} onChange={vi.fn()} />); await act(async () => resolve(reply()));
  expect(screen.getByText('Restore original icon').closest('button')?.disabled).toBe(true); expect(document.querySelector('img')!.src).toContain('/11?');
});

it('ignores a failed upload after switching to another installation', async () => {
  render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  let reject!: (error: Error) => void; vi.mocked(fetch).mockReturnValueOnce(new Promise((_r, fail) => { reject = fail; }));
  fireEvent.change(input(), { target: { files: [new File(['png'], 'test.png')] } });
  act(() => useConfigStore.setState({ starmadeDir: '/other' }));
  await act(async () => reject(new Error('late upload failure'))); expect(screen.queryByRole('alert')).toBeNull();
});
it('previews a native PNG without writing, applies it only on demand, and releases object URLs', async () => {
  const create = vi.fn().mockReturnValue('blob:generated'); const revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  const png = new Blob(['png'], { type: 'image/png' });
  useBlockStore.setState({ captureIcon: vi.fn().mockResolvedValue(png) });
  const view = render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  fireEvent.click(screen.getByText('Generate from block'));
  await waitFor(() => expect(screen.getByAltText('Generated icon preview').getAttribute('src')).toBe('blob:generated'));
  expect(fetch).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledWith(png);
  fireEvent.click(screen.getByText('Apply icon'));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/icon/10', expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: expect.any(File) })));
  expect((vi.mocked(fetch).mock.calls[1][1]?.body as File).size).toBe(png.size);
  fireEvent.click(screen.getByText('Cancel')); expect(screen.queryByAltText('Generated icon preview')).toBeNull(); expect(revoke).toHaveBeenCalledWith('blob:generated');
  fireEvent.click(screen.getByText('Generate from block')); await waitFor(() => expect(screen.getByAltText('Generated icon preview')).toBeTruthy());
  view.unmount(); expect(revoke).toHaveBeenCalledTimes(2);
});
it('disables generation before renderer readiness and reports export failure without importing', async () => {
  render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  expect(screen.getByText('Generate from block').closest('button')?.disabled).toBe(true);
  let reject!: (error: Error) => void;
  act(() => useBlockStore.setState({ captureIcon: () => new Promise((_r, fail) => { reject = fail; }) }));
  fireEvent.click(screen.getByText('Generate from block')); expect(screen.getByText('Generating…').closest('button')?.disabled).toBe(true);
  await act(async () => reject(new Error('WebGL context lost')));
  expect(screen.getByRole('alert').textContent).toContain('The graphics context was lost. Reload the preview.'); expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([false, true])('ignores export completion after the target icon changes (failure=%s)', async failure => {
  const create = vi.fn(); vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn(); });
  let resolve!: (blob: Blob) => void, reject!: (error: Error) => void;
  useBlockStore.setState({ captureIcon: () => new Promise((r, f) => { resolve = r; reject = f; }) });
  const view = render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  fireEvent.click(screen.getByText('Generate from block')); view.rerender(<IconField icon={11} onChange={vi.fn()} />);
  await act(async () => failure ? reject(new Error('late')) : resolve(new Blob(['png'])));
  expect(create).not.toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.queryByAltText('Generated icon preview')).toBeNull();
});

it('clears generated previews and rejects late captures when selecting another block with the same icon', async () => {
  const create = vi.fn().mockReturnValue('blob:same-slot'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  const capture = vi.fn().mockResolvedValue(new Blob(['png'])); useBlockStore.setState({ captureIcon: capture });
  render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  fireEvent.click(screen.getByText('Generate from block')); await waitFor(() => expect(screen.getByAltText('Generated icon preview')).toBeTruthy());
  act(() => useBlockStore.setState(state => ({ selectionVersion: state.selectionVersion + 1 })));
  expect(screen.queryByAltText('Generated icon preview')).toBeNull(); expect(revoke).toHaveBeenCalledWith('blob:same-slot');
  let resolve!: (blob: Blob) => void; capture.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  fireEvent.click(screen.getByText('Generate from block'));
  act(() => useBlockStore.setState(state => ({ selectionVersion: state.selectionVersion + 1 })));
  await act(async () => resolve(new Blob(['late']))); expect(create).toHaveBeenCalledOnce();
});

it('translates export failures in the current language without exposing a known English diagnostic', async () => {
  useI18nStore.getState().setLocale('fr'); useBlockStore.setState({ captureIcon: vi.fn().mockRejectedValue(new Error('Native shader compilation failed.')) });
  render(<IconField icon={10} onChange={vi.fn()} />); await act(async () => {});
  fireEvent.click(screen.getByText('Créer depuis le bloc'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Le shader natif'));
  expect(document.querySelector('.properties-error details')).toBeNull();
  act(() => useI18nStore.getState().setLocale('en')); expect(screen.getByRole('alert').textContent).toContain('native shader');
});
