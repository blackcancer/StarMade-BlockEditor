/**
 * @fileoverview API hooks — data fetching for blocks and config.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { useCallback, useEffect } from 'react';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { invalidateAtlasCache } from '../3d/AtlasTexture.js';

const API = '/api';

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * Load starmadeDir from the API on mount and expose a save function.
 */
export function useConfig(autoload = true) {
  const setConfig = useConfigStore(s => s.setConfig);

  useEffect(() => {
    if (!autoload) return;
    fetch(`${API}/config`)
      .then(r => r.json())
      .then(data => setConfig({
        starmadeDir: data.starmadeDir ?? '',
        worldDir:    data.worldDir   ?? 'world0',
        atlasSize:   data.atlasSize  ?? 256,
        texturePack: data.texturePack ?? 'Default',
        isValid:     data.isValid    ?? false,
      }))
      .catch(console.error);
  }, [autoload, setConfig]);

  const saveConfig = useCallback(async (patch: { starmadeDir?: string; atlasSize?: number; texturePack?: string }) => {
    const res  = await fetch(`${API}/config`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    });
    const data = await res.json();
    invalidateAtlasCache();
    setConfig({
      starmadeDir: data.starmadeDir,
      worldDir: data.worldDir ?? 'world0',
      atlasSize: data.atlasSize ?? 256,
      texturePack: data.texturePack ?? 'Default',
      isValid: data.isValid,
    });
    return data;
  }, [setConfig]);

  return { saveConfig };
}

// ── Blocks ────────────────────────────────────────────────────────────────────

/**
 * Load all block definitions from the API on mount.
 */
export function useBlocks(autoload = true) {
  const setBlocks  = useBlockStore(s => s.setBlocks);
  const setLoading = useBlockStore(s => s.setLoading);
  const setError   = useBlockStore(s => s.setError);
  const isValid    = useConfigStore(s => s.isValid);

  const reload = useCallback(async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const res    = await fetch(`${API}/blocks`);
      const blocks = await res.json() as BlockDef[];
      setBlocks(blocks);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [isValid, setBlocks, setError, setLoading]);

  useEffect(() => {
    if (!autoload) return;
    reload();
  }, [autoload, reload]);

  return { reload };
}

/**
 * Save the current draft block to the API.
 *
 * @returns {{ save: () => Promise<void> }} Save function.
 */
export function useSaveBlock() {
  const draft      = useBlockStore(s => s.draft);
  const blocks     = useBlockStore(s => s.blocks);
  const setBlocks  = useBlockStore(s => s.setBlocks);
  const selectBlock = useBlockStore(s => s.selectBlock);
  const setDirty   = useBlockStore(s => s.setDirty);
  const setError   = useBlockStore(s => s.setError);

  const save = useCallback(async () => {
    if (!draft) return;
    try {
      const res = await fetch(`${API}/blocks/${draft.id}`, {
        method:  draft.isCustom ? 'PUT' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
      const saved = await res.json() as BlockDef;
      setBlocks(blocks.map(b => b.id === saved.id ? saved : b));
      selectBlock(saved);
      setDirty(false);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [draft, blocks, setBlocks, selectBlock, setDirty, setError]);

  return { save };
}

/**
 * Create a new custom block via the API.
 *
 * @returns {{ createBlock: () => Promise<void> }} Create function.
 */
export function useDeleteBlock() {
  const blocks      = useBlockStore(s => s.blocks);
  const setBlocks   = useBlockStore(s => s.setBlocks);
  const selectBlock = useBlockStore(s => s.selectBlock);
  const setError    = useBlockStore(s => s.setError);

  const deleteBlock = useCallback(async (block: BlockDef) => {
    try {
      const res = await fetch(`${API}/blocks/${block.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);
      const nextBlocks = blocks.filter(b => b.id !== block.id);
      setBlocks(nextBlocks);
      selectBlock(nextBlocks[0] ?? null);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [blocks, setBlocks, selectBlock, setError]);

  return { deleteBlock };
}

export function useCreateBlock() {
  const blocks     = useBlockStore(s => s.blocks);
  const setBlocks  = useBlockStore(s => s.setBlocks);
  const selectBlock = useBlockStore(s => s.selectBlock);
  const setError   = useBlockStore(s => s.setError);

  const createBlock = useCallback(async () => {
    try {
      const res = await fetch(`${API}/blocks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const created = await res.json() as BlockDef;
      setBlocks([...blocks, created]);
      selectBlock(created);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [blocks, setBlocks, selectBlock, setError]);

  return { createBlock };
}
