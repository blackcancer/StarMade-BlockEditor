/**
 * @fileoverview Same-origin API with conditional writes and detached drafts.
 * Failed or obsolete requests never replace a user's unsaved work.
 */
import { useCallback, useEffect } from 'react';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { invalidateDisplayNameCache } from '../components/layout/blockDisplay.js';

type ConfigData = Partial<Pick<ReturnType<typeof useConfigStore.getState>, 'starmadeDir' | 'worldDir' | 'atlasSize' | 'texturePack' | 'isValid'>>;
let configRequest = 0;
let catalogueRequest = 0;
let activeMutation: { generation: number; directory: string } | undefined;

/** A result belongs to the latest catalogue operation in the selected installation. */
function isCurrentCatalogue(generation: number, directory: string): boolean {
  return generation === catalogueRequest && directory === useConfigStore.getState().starmadeDir;
}

/** Read JSON only after checking HTTP success. */
async function request<T>(url: string, init?: RequestInit): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `HTTP ${response.status} ${response.statusText}`;
    try {
      const error = await response.json();
      if (typeof error.error === 'string') message = error.error;
    } catch { /* An unavailable server may return HTML instead of JSON. */ }
    throw new Error(message);
  }
  return { data: await response.json() as T, response };
}

/** Fill configuration defaults at the HTTP boundary. */
function applyConfig(data: ConfigData): void {
  if ((data.starmadeDir ?? '') !== useConfigStore.getState().starmadeDir) {
    catalogueRequest++;
    useBlockStore.getState().selectBlock(null);
    useBlockStore.setState({ blocks: [], catalogRevision: null, loading: false });
  }
  useConfigStore.getState().setConfig({
    starmadeDir: data.starmadeDir ?? '', worldDir: data.worldDir ?? 'world0',
    atlasSize: data.atlasSize ?? 256, texturePack: data.texturePack ?? 'Default', isValid: data.isValid ?? false,
  });
}

/** Require the ETag used by subsequent mutations, including an empty catalogue. */
async function readCatalogue() {
  const { data, response } = await request<BlockDef[]>('/api/blocks');
  if (!Array.isArray(data)) throw new Error('Invalid block catalogue.');
  const revision = response.headers.get('ETag');
  if (!revision) throw new Error('Catalogue revision missing; reload before editing.');
  return { blocks: data, revision };
}

/** Install a catalogue without changing the independent draft. */
function applyCatalogue(catalogue: Awaited<ReturnType<typeof readCatalogue>>): void {
  invalidateDisplayNameCache();
  useBlockStore.setState({ blocks: catalogue.blocks, catalogRevision: catalogue.revision, error: null });
}

/** Load configuration on mount and save validated configuration changes. */
export function useConfig(autoload = true) {
  useEffect(() => {
    if (!autoload) return;
    const generation = ++configRequest;
    let mounted = true;
    void request<ConfigData>('/api/config').then(({ data }) => {
      if (mounted && generation === configRequest) applyConfig(data);
    }).catch(error => { if (mounted && generation === configRequest) useBlockStore.getState().setError(String(error)); });
    return () => { mounted = false; };
  }, [autoload]);
  const saveConfig = useCallback(async (patch: { starmadeDir?: string; atlasSize?: number; texturePack?: string }) => {
    const generation = ++configRequest;
    try {
      const { data } = await request<ConfigData>('/api/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      if (generation === configRequest) { applyConfig(data); useBlockStore.getState().setError(null); }
      return data;
    } catch (error) { if (generation === configRequest) useBlockStore.getState().setError(String(error)); return null; }
  }, []);
  return { saveConfig };
}

/** Load whenever a valid installation is selected; the latest request wins. */
export function useBlocks(autoload = true) {
  const isValid = useConfigStore(s => s.isValid);
  const starmadeDir = useConfigStore(s => s.starmadeDir);
  const reload = useCallback(async () => {
    if (!isValid) return;
    // The active write will read its committed revision. A parallel read of
    // this same installation could otherwise return the pre-write catalogue.
    if (activeMutation?.directory === starmadeDir && activeMutation.generation === catalogueRequest) return;
    const generation = ++catalogueRequest;
    useBlockStore.getState().setLoading(true);
    try {
      const catalogue = await readCatalogue();
      if (isCurrentCatalogue(generation, starmadeDir)) {
        applyCatalogue(catalogue);
        const state = useBlockStore.getState();
        const persisted = catalogue.blocks.find(block => block.id === state.selectedBlock?.id) ?? null;
        if (state.isDirty) useBlockStore.setState({ selectedBlock: persisted });
        else state.selectBlock(persisted);
      }
    } catch (error) {
      if (isCurrentCatalogue(generation, starmadeDir)) useBlockStore.getState().setError(String(error));
    } finally { if (generation === catalogueRequest) useBlockStore.getState().setLoading(false); }
  }, [isValid, starmadeDir]);
  useEffect(() => { if (autoload) void reload(); }, [autoload, reload]);
  return { reload };
}

/** Serialize writes and refresh revisions while preserving edits made in flight. */
async function mutate(method: 'POST' | 'PUT' | 'DELETE', block?: BlockDef) {
  const before = useBlockStore.getState();
  if (before.saving) return;
  const revision = method === 'POST' ? before.catalogRevision : block?.revision;
  if (!revision) { before.setError('Please reload the catalogue before saving.'); return; }
  const etag = revision.startsWith('"') ? revision : `"${revision}"`;
  const directory = useConfigStore.getState().starmadeDir;
  const generation = ++catalogueRequest;
  activeMutation = { generation, directory };
  const draft = before.draft;
  useBlockStore.setState({ saving: true, loading: false });
  try {
    const headers: Record<string, string> = { 'If-Match': etag };
    const init: RequestInit = { method, headers };
    if (method !== 'DELETE') { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(block ?? {}); }
    const { data } = await request<BlockDef>(method === 'POST' ? '/api/blocks' : `/api/blocks/${block!.id}`, init);
    if (!isCurrentCatalogue(generation, directory)) return;
    const catalogue = await readCatalogue();
    if (!isCurrentCatalogue(generation, directory)) return;
    applyCatalogue(catalogue);
    const current = useBlockStore.getState();
    const id = method === 'POST' ? data.id : block!.id;
    const persisted = catalogue.blocks.find(item => item.id === id);
    if (current.draft === draft) {
      current.selectBlock(persisted ?? catalogue.blocks[0] ?? null);
    } else if (method === 'PUT' && current.draft?.id === id && persisted) {
      if (!current.isDirty) current.selectBlock(persisted);
      else {
        // A later catalogue read may already include another writer. Only our own
        // write response can advance a continued draft's optimistic revision.
        const revision = current.selectionVersion === before.selectionVersion ? data.revision : current.draft.revision;
        useBlockStore.setState({ selectedBlock: persisted, draft: { ...current.draft, revision } });
      }
    }
  } catch (error) { if (isCurrentCatalogue(generation, directory)) useBlockStore.getState().setError(String(error)); }
  finally { activeMutation = undefined; useBlockStore.setState({ saving: false }); }
}

/** Save the current draft, leaving it intact on rejection or conflict. */
export function useSaveBlock() {
  const save = useCallback(async () => { const draft = useBlockStore.getState().draft; if (draft) await mutate('PUT', draft); }, []);
  return { save };
}

/** Delete an override and reload its underlying vanilla definition immediately. */
export function useDeleteBlock() {
  const deleteBlock = useCallback((block: BlockDef) => mutate('DELETE', block), []);
  return { deleteBlock };
}

/** Create a custom definition against the last loaded catalogue revision. */
export function useCreateBlock() {
  const createBlock = useCallback(() => mutate('POST'), []);
  return { createBlock };
}
