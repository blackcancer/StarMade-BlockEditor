import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { useBlocks, useConfig, useCreateBlock, useDeleteBlock, useSaveBlock } from './useApi.js';


const makeBlock = (patch: Partial<BlockDef> = {}): BlockDef => ({
  revision: 'r1',
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

const response = (data: unknown, status = 200, revision: string | null = '"r1"') => ({
  ok: status < 400, status, statusText: status < 400 ? 'OK' : 'Rejected',
  headers: new Headers(revision ? { ETag: revision } : {}), json: async () => data,
}) as Response;
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
function Harness({ autoload = false }: { autoload?: boolean }) {
  const { saveConfig } = useConfig(autoload);
  const { reload } = useBlocks(autoload);
  const { save } = useSaveBlock(); const { deleteBlock } = useDeleteBlock(); const { createBlock } = useCreateBlock();
  const first = useBlockStore(s => s.blocks[0]);
  return <><button onClick={() => saveConfig({ starmadeDir: '/game' })}>config</button><button onClick={reload}>reload</button>
    <button onClick={save}>save</button><button onClick={() => deleteBlock(first)}>delete</button><button onClick={createBlock}>create</button></>;
}
function valid() { useConfigStore.setState({ isValid: true, starmadeDir: '/game' }); }
function selected() { const block = makeBlock(); useBlockStore.setState({ blocks: [block], draft: block, selectedBlock: block, isDirty: true, catalogRevision: '"r1"' }); return block; }
async function click(name: string) { await act(async () => { fireEvent.click(screen.getByText(name)); }); }

describe('API workflows with revisions and error preservation', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); vi.stubGlobal('fetch', vi.fn());
    useConfigStore.setState({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default', isValid: false });
    useBlockStore.setState({ blocks: [], selectedBlock: null, draft: null, isDirty: false, loading: false, error: null, catalogRevision: null, saving: false });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it('loads initial configuration defaults without fetching an invalid catalogue', async () => {
    vi.mocked(fetch).mockResolvedValue(response({})); render(<Harness autoload />);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(useConfigStore.getState()).toMatchObject({ isValid: false, atlasSize: 256, worldDir: 'world0', texturePack: 'Default' });
  });
  it('loads configured catalogue with the ETag needed even when it is empty', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ starmadeDir: '/game', isValid: true, atlasSize: 64, texturePack: 'HD', worldDir: 'world1' })).mockResolvedValueOnce(response([]));
    render(<Harness autoload />);
    await waitFor(() => expect(useBlockStore.getState().catalogRevision).toBe('"r1"'));
    expect(useConfigStore.getState()).toMatchObject({ atlasSize: 64, texturePack: 'HD', worldDir: 'world1' });
  });
  it('ignores an initial config response after unmount', async () => {
    const pending = deferred<Response>(); vi.mocked(fetch).mockReturnValue(pending.promise);
    const view = render(<Harness autoload />); view.unmount();
    await act(async () => pending.resolve(response({ starmadeDir: '/late' })));
    expect(useConfigStore.getState().starmadeDir).toBe('');
  });
  it('reports config loading errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline')); render(<Harness autoload />);
    await waitFor(() => expect(useBlockStore.getState().error).toContain('offline'));
  });
  it('saves config and reports failures without changing the previous configuration', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ starmadeDir: '/game', isValid: false })).mockResolvedValueOnce(response({ error: 'bad directory' }, 400));
    render(<Harness />); await click('config');
    expect(useConfigStore.getState().starmadeDir).toBe('/game');
    await click('config'); expect(useBlockStore.getState().error).toContain('bad directory');
    expect(useConfigStore.getState().starmadeDir).toBe('/game');
  });
  it('does not let an older config read undo a save', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response({ starmadeDir: '/new', isValid: false }));
    render(<Harness autoload />); await click('config');
    await act(async () => pending.resolve(response({ starmadeDir: '/old' })));
    expect(useConfigStore.getState().starmadeDir).toBe('/new');
  });
  it('skips catalogue reads before configuration', async () => {
    render(<Harness />); await click('reload'); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects HTTP errors, malformed catalogues and missing ETags without corrupting state', async () => {
    valid(); const block = selected();
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'no access' }, 403)).mockResolvedValueOnce(response({ unexpected: true })).mockResolvedValueOnce(response([], 200, null));
    render(<Harness />);
    for (const text of ['no access', 'Invalid block catalogue', 'revision']) { await click('reload'); expect(useBlockStore.getState().error).toContain(text); }
    expect(useBlockStore.getState().blocks).toEqual([block]); expect(useBlockStore.getState().loading).toBe(false);
  });
  it('falls back to the HTTP status when an error response has no usable JSON message', async () => {
    valid(); vi.mocked(fetch).mockResolvedValueOnce(response({}, 500)).mockResolvedValueOnce({ ...response({}, 502), json: async () => { throw new Error('HTML'); } } as Response);
    render(<Harness />); await click('reload'); expect(useBlockStore.getState().error).toContain('500');
    await click('reload'); expect(useBlockStore.getState().error).toContain('502');
  });
  it('ignores an older catalogue request and data for an installation that has changed', async () => {
    valid(); const first = deferred<Response>(), second = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<Harness />); await click('reload'); await click('reload');
    await act(async () => second.resolve(response([makeBlock({ name: 'Latest' })], 200, '"r2"')));
    await act(async () => first.resolve(response([makeBlock({ name: 'Old' })])));
    expect(useBlockStore.getState().blocks[0].name).toBe('Latest');
    const oldInstall = deferred<Response>(); vi.mocked(fetch).mockReturnValueOnce(oldInstall.promise);
    await click('reload'); act(() => useConfigStore.setState({ starmadeDir: '/other' }));
    await act(async () => oldInstall.resolve(response([])));
    expect(useBlockStore.getState().blocks[0].name).toBe('Latest');
  });
  it('saves with the draft revision then reloads all catalogue revisions', async () => {
    valid(); selected(); const saved = makeBlock({ name: 'Saved', isCustom: true, revision: 'r2' });
    vi.mocked(fetch).mockResolvedValueOnce(response(saved, 200, '"r2"')).mockResolvedValueOnce(response([saved, makeBlock({ id: 2, revision: 'r2' })], 200, '"r2"'));
    render(<Harness />); await click('save');
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/blocks/1', expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ 'If-Match': '"r1"' }) }));
    expect(useBlockStore.getState()).toMatchObject({ catalogRevision: '"r2"', isDirty: false, saving: false });
    expect(useBlockStore.getState().selectedBlock?.name).toBe('Saved'); expect(useBlockStore.getState().blocks).toHaveLength(2);
  });
  it('retains unsaved edits on a conflict', async () => {
    valid(); const original = selected(); vi.mocked(fetch).mockResolvedValue(response({ error: 'Catalogue changed; reload before saving.' }, 409));
    render(<Harness />); await click('save');
    expect(useBlockStore.getState().draft).toBe(original); expect(useBlockStore.getState().isDirty).toBe(true);
    expect(useBlockStore.getState().error).toContain('Catalogue changed');
  });
  it('does not erase further draft edits made during a save', async () => {
    valid(); selected(); const pending = deferred<Response>(); const saved = makeBlock({ revision: 'r2' });
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response([saved], 200, '"r2"'));
    render(<Harness />); await click('save'); act(() => useBlockStore.getState().updateDraft({ name: 'Still editing' }));
    await act(async () => pending.resolve(response(saved, 200, '"r2"')));
    expect(useBlockStore.getState().draft?.name).toBe('Still editing'); expect(useBlockStore.getState().isDirty).toBe(true);
    expect(useBlockStore.getState().draft?.revision).toBe('r2');
  });
  it('restores the vanilla definition immediately after deleting its override', async () => {
    valid(); const custom = makeBlock({ isCustom: true }); useBlockStore.setState({ blocks: [custom], draft: custom });
    const vanilla = makeBlock({ revision: 'r2' });
    vi.mocked(fetch).mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response([vanilla], 200, '"r2"'));
    render(<Harness />); await click('delete');
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/blocks/1', expect.objectContaining({ method: 'DELETE', headers: { 'If-Match': '"r1"' } }));
    expect(useBlockStore.getState().selectedBlock).toEqual(vanilla);
  });
  it('creates using the catalogue ETag, and deleting the last block clears selection', async () => {
    valid(); useBlockStore.setState({ catalogRevision: '"r1"' }); const created = makeBlock({ id: 1000, isCustom: true, revision: 'r2' });
    vi.mocked(fetch).mockResolvedValueOnce(response(created)).mockResolvedValueOnce(response([created], 200, '"r2"')).mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response([], 200, '"r3"'));
    render(<Harness />); await click('create'); expect(useBlockStore.getState().selectedBlock?.id).toBe(1000);
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/blocks', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'If-Match': '"r1"' }) }));
    await click('delete'); expect(useBlockStore.getState().selectedBlock).toBeNull();
  });
  it('does not issue duplicate writes and leaves another selected block alone', async () => {
    valid(); selected(); const pending = deferred<Response>(); const other = makeBlock({ id: 2 });
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response([makeBlock(), other]));
    render(<Harness />); await click('save'); await click('save'); expect(fetch).toHaveBeenCalledOnce();
    act(() => useBlockStore.getState().selectBlock(other)); await act(async () => pending.resolve(response(makeBlock())));
    expect(useBlockStore.getState().selectedBlock?.id).toBe(2);
  });
  it('does not apply a mutation response to a new installation', async () => {
    valid(); selected(); const pending = deferred<Response>(); vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    render(<Harness />); await click('save'); act(() => useConfigStore.setState({ starmadeDir: '/new' }));
    await act(async () => pending.resolve(response(makeBlock())));
    expect(fetch).toHaveBeenCalledOnce(); expect(useBlockStore.getState().isDirty).toBe(true);
  });
  it('skips empty save and reports missing mutation revisions before writing', async () => {
    valid(); render(<Harness />); await click('save'); expect(fetch).not.toHaveBeenCalled();
    await click('create'); expect(fetch).not.toHaveBeenCalled(); expect(useBlockStore.getState().error).toContain('reload');
    const local = makeBlock({ revision: undefined }); act(() => useBlockStore.setState({ draft: local, blocks: [local] }));
    await click('save'); expect(fetch).not.toHaveBeenCalled();
    await click('delete'); expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores a config failure after its view was unmounted', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    const view = render(<Harness autoload />); view.unmount();
    await act(async () => reject(new Error('late failure')));
    expect(useBlockStore.getState().error).toBeNull();
  });
  it('keeps the latest config when an earlier save finishes later', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response({ starmadeDir: '/latest' }));
    render(<Harness />); await click('config'); await click('config');
    await act(async () => pending.resolve(response({ starmadeDir: '/stale' })));
    expect(useConfigStore.getState().starmadeDir).toBe('/latest');
  });
  it('does not replace a newer catalogue result with an older request error', async () => {
    valid(); let reject!: (error: Error) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; })).mockResolvedValueOnce(response([makeBlock({ name: 'Latest' })]));
    render(<Harness />); await click('reload'); await click('reload');
    await act(async () => reject(new Error('late failure')));
    expect(useBlockStore.getState().blocks[0].name).toBe('Latest'); expect(useBlockStore.getState().error).toBeNull();
  });
  it('ignores refreshed catalogue when the installation changed after the write', async () => {
    valid(); selected(); const pending = deferred<Response>();
    vi.mocked(fetch).mockResolvedValueOnce(response(makeBlock())).mockReturnValueOnce(pending.promise);
    render(<Harness />); await click('save'); expect(fetch).toHaveBeenCalledTimes(2);
    act(() => useConfigStore.setState({ starmadeDir: '/other' }));
    await act(async () => pending.resolve(response([makeBlock({ name: 'Old installation' })])));
    expect(useBlockStore.getState().draft?.name).toBe('Hull'); expect(useBlockStore.getState().isDirty).toBe(true);
  });

  it('reloads persisted state without dropping a conflicted draft, so explicit Revert recovers the latest version', async () => {
    valid(); selected(); const latest = makeBlock({ name: 'Other editor saved this', revision: 'r2' });
    vi.mocked(fetch).mockResolvedValue(response([latest], 200, '"r2"')); render(<Harness />); await click('reload');
    expect(useBlockStore.getState().draft?.name).toBe('Hull'); expect(useBlockStore.getState().draft?.revision).toBe('r1');
    expect(useBlockStore.getState().selectedBlock).toEqual(latest);
    act(() => useBlockStore.getState().selectBlock(useBlockStore.getState().selectedBlock));
    expect(useBlockStore.getState().draft?.revision).toBe('r2'); expect(useBlockStore.getState().isDirty).toBe(false);
    await click('reload'); expect(useBlockStore.getState().draft).toEqual(latest);
    vi.mocked(fetch).mockResolvedValue(response([])); await click('reload'); expect(useBlockStore.getState().draft).toBeNull();
  });

  it('never adopts another writer’s revision for a draft typed while our save was pending', async () => {
    valid(); selected(); const pending = deferred<Response>();
    const ours = makeBlock({ revision: 'r2' }), theirs = makeBlock({ revision: 'r3', hp: 999 });
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response([theirs], 200, '"r3"')).mockResolvedValueOnce(response({ error: 'conflict' }, 409));
    render(<Harness />); await click('save'); act(() => useBlockStore.getState().updateDraft({ name: 'Typing' }));
    await act(async () => pending.resolve(response(ours, 200, '"r2"')));
    expect(useBlockStore.getState().draft?.revision).toBe('r2'); expect(useBlockStore.getState().selectedBlock?.hp).toBe(999);
    await click('save'); expect(fetch).toHaveBeenLastCalledWith('/api/blocks/1', expect.objectContaining({ headers: expect.objectContaining({ 'If-Match': '"r2"' }) }));
    expect(useBlockStore.getState().error).toContain('conflict');
  });
  it.each([false, true])('handles navigation away and back during saving (further edits=%s)', async furtherEdits => {
    valid(); const original = selected(), pending = deferred<Response>();
    const persisted = makeBlock({ name: 'Saved', revision: 'r2' });
    vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response([persisted], 200, '"r2"'));
    render(<Harness />); await click('save');
    act(() => { useBlockStore.getState().selectBlock(makeBlock({ id: 2 })); useBlockStore.getState().selectBlock(original); if (furtherEdits) useBlockStore.getState().updateDraft({ name: 'New visit' }); });
    await act(async () => pending.resolve(response(persisted, 200, '"r2"')));
    expect(useBlockStore.getState().draft).toMatchObject(furtherEdits ? { name: 'New visit', revision: 'r1' } : { name: 'Saved', revision: 'r2' });
    expect(useBlockStore.getState().selectedBlock).toEqual(persisted);
  });

  it('clears the old installation only after accepting a changed directory, preserving same-directory drafts', async () => {
    valid(); const draft = selected();
    vi.mocked(fetch).mockResolvedValueOnce(response({ starmadeDir: '/game', atlasSize: 128, isValid: true }))
      .mockResolvedValueOnce(response({ error: 'denied' }, 403)).mockResolvedValueOnce(response({ starmadeDir: '/different', isValid: true }));
    render(<Harness />); await click('config'); expect(useBlockStore.getState().draft).toBe(draft);
    await click('config'); expect(useBlockStore.getState().draft).toBe(draft);
    await click('config'); expect(useBlockStore.getState()).toMatchObject({ draft: null, selectedBlock: null, catalogRevision: null, blocks: [], isDirty: false });
  });

  it.each([false, true])('does not let an old reload undo a successful save (failed read=%s)', async failed => {
    valid(); selected(); const old = deferred<Response>();
    const saved = makeBlock({ name: 'Saved', revision: 'r2' });
    vi.mocked(fetch).mockReturnValueOnce(old.promise).mockResolvedValueOnce(response(saved, 200, '"r2"'))
      .mockResolvedValueOnce(response([saved], 200, '"r2"'));
    render(<Harness />); await click('reload'); await click('save');
    await act(async () => old.resolve(failed ? response({ error: 'obsolete read' }, 500) : response([makeBlock({ name: 'Old' })])));
    expect(useBlockStore.getState()).toMatchObject({ draft: saved, selectedBlock: saved, catalogRevision: '"r2"', isDirty: false, error: null, loading: false, saving: false });
  });

  it('leaves same-installation reloads to the pending save and its revision refresh', async () => {
    valid(); selected(); const write = deferred<Response>(), refresh = deferred<Response>();
    const saved = makeBlock({ name: 'Saved', revision: 'r2' });
    vi.mocked(fetch).mockReturnValueOnce(write.promise).mockReturnValueOnce(refresh.promise);
    render(<Harness />); await click('save'); await click('reload');
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => write.resolve(response(saved, 200, '"r2"')));
    await click('reload'); expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => refresh.resolve(response([saved], 200, '"r2"')));
    expect(useBlockStore.getState()).toMatchObject({ draft: saved, isDirty: false, loading: false, saving: false });
  });

  it.each([false, true])('can load a new installation during an old write, ignoring its completion (failure=%s)', async failure => {
    valid(); selected(); const write = deferred<Response>(), reload = deferred<Response>();
    const latest = makeBlock({ name: 'Other installation', revision: 'other' });
    vi.mocked(fetch).mockReturnValueOnce(write.promise)
      .mockResolvedValueOnce(response({ starmadeDir: '/other', isValid: true })).mockReturnValueOnce(reload.promise);
    render(<Harness />); await click('save'); await click('config'); await click('reload');
    expect(fetch).toHaveBeenCalledTimes(3);
    await act(async () => write.resolve(failure ? response({ error: 'old write failed' }, 409) : response(makeBlock({ revision: 'r2' }))));
    expect(useBlockStore.getState()).toMatchObject({ blocks: [], draft: null, error: null, loading: true, saving: false });
    await act(async () => reload.resolve(response([latest], 200, '"other"')));
    expect(useBlockStore.getState()).toMatchObject({ blocks: [latest], catalogRevision: '"other"', loading: false });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('ignores an obsolete mutation refresh failure after the installation changes', async () => {
    valid(); selected(); const refresh = deferred<Response>();
    vi.mocked(fetch).mockResolvedValueOnce(response(makeBlock({ revision: 'r2' }))).mockReturnValueOnce(refresh.promise)
      .mockResolvedValueOnce(response({ starmadeDir: '/other', isValid: true })).mockResolvedValueOnce(response([], 200, '"other"'));
    render(<Harness />); await click('save'); await click('config'); await click('reload');
    await act(async () => refresh.resolve(response({ error: 'old refresh failed' }, 500)));
    expect(useBlockStore.getState()).toMatchObject({ blocks: [], catalogRevision: '"other"', error: null, saving: false });
  });

  it('does not revive a mutation after leaving and returning to the same installation', async () => {
    valid(); selected(); const write = deferred<Response>();
    const latest = makeBlock({ name: 'Latest visit', revision: 'r3' });
    vi.mocked(fetch).mockReturnValueOnce(write.promise)
      .mockResolvedValueOnce(response({ starmadeDir: '/other', isValid: true }))
      .mockResolvedValueOnce(response({ starmadeDir: '/game', isValid: true }))
      .mockResolvedValueOnce(response([latest], 200, '"r3"'));
    render(<Harness />); await click('save'); await click('config'); await click('config'); await click('reload');
    await act(async () => write.resolve(response(makeBlock({ name: 'Prior visit', revision: 'r2' }))));
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(useBlockStore.getState()).toMatchObject({ blocks: [latest], draft: null, error: null, catalogRevision: '"r3"' });
  });

  it.each([false, true])('ignores a superseded configuration failure (initial read=%s)', async autoload => {
    const old = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(old.promise).mockResolvedValueOnce(response({ starmadeDir: '/latest', isValid: false }));
    render(<Harness autoload={autoload} />);
    if (!autoload) await click('config');
    await click('config');
    await act(async () => old.resolve(response({ error: 'obsolete configuration failure' }, 500)));
    expect(useConfigStore.getState().starmadeDir).toBe('/latest');
    expect(useBlockStore.getState().error).toBeNull();
  });

});
