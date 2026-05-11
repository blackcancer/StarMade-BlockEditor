/**
 * @fileoverview API hooks — React hooks for data fetching and mutation.
 *
 * All communication with the Express API server is centralised here.
 * Hooks follow the standard React pattern:
 *  - `useConfig`      — load / save the editor configuration (starmadeDir, atlasSize, pack)
 *  - `useBlocks`      — load all block definitions from `BlockConfig.xml`
 *  - `useSaveBlock`   — save the current draft to `customBlockConfig/BlockConfigImport.xml`
 *  - `useDeleteBlock` — delete a custom block from the custom XML file
 *  - `useCreateBlock` — create a new custom block with a generated ID
 *
 * ## Error handling
 * All async mutations catch errors and write them to the block store via
 * `setError(String(e))`. The `error` field is displayed in the Properties panel footer.
 *
 * ## State updates
 * Mutations update both the server (via fetch) and the client store atomically:
 * e.g. `useSaveBlock` writes to the API then calls `setBlocks` + `selectBlock`
 * so the UI reflects the saved state immediately without a full reload.
 *
 * @module hooks/useApi
 * @author InitSysRev
 * @version 1.0.0
 */

import { useCallback, useEffect } from 'react';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { invalidateAtlasCache } from '../3d/AtlasTexture.js';

/** Base URL prefix for all API requests. */
const API = '/api';

// =============================================================================
// useConfig
// =============================================================================

/**
 * Load and save the editor configuration (`SMToolConfig.json`).
 *
 * On mount (when `autoload = true`) performs a `GET /api/config` and writes
 * the result to the config store. The `isValid` flag from the server response
 * gates all StarMade-data-dependent features.
 *
 * @param {boolean} [autoload=true] Whether to fetch the config on mount.
 *        Pass `false` in the `Header` component to avoid double-loading.
 * @returns {{ saveConfig: (patch: {...}) => Promise<any> }}
 *          `saveConfig` posts a partial update and refreshes the store.
 */
export function useConfig(autoload = true) {
  const setConfig = useConfigStore(s => s.setConfig);

  // Load config from the API on mount when autoload is enabled.
  useEffect(() => {
    if (!autoload) return;
    fetch(`${API}/config`)
      .then(r => r.json())
      .then(data => setConfig({
        starmadeDir: data.starmadeDir ?? '',
        worldDir:    data.worldDir    ?? 'world0',
        atlasSize:   data.atlasSize   ?? 256,
        texturePack: data.texturePack ?? 'Default',
        isValid:     data.isValid     ?? false,
      }))
      .catch(console.error);
  }, [autoload, setConfig]);

  /**
   * Save a partial config update to `SMToolConfig.json` via the API.
   *
   * Also invalidates the atlas texture cache so a texture resolution or
   * pack change is immediately reflected in the 3D viewer.
   *
   * @param {{ starmadeDir?: string; atlasSize?: number; texturePack?: string }} patch
   * @returns {Promise<any>} The server response JSON.
   */
  const saveConfig = useCallback(async (patch: {
    starmadeDir?: string;
    atlasSize?:   number;
    texturePack?: string;
  }) => {
    const res = await fetch(`${API}/config`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    });
    const data = await res.json();
    invalidateAtlasCache(); // Flush the Three.js texture cache on any config change.
    setConfig({
      starmadeDir: data.starmadeDir,
      worldDir:    data.worldDir    ?? 'world0',
      atlasSize:   data.atlasSize   ?? 256,
      texturePack: data.texturePack ?? 'Default',
      isValid:     data.isValid,
    });
    return data;
  }, [setConfig]);

  return { saveConfig };
}

// =============================================================================
// useBlocks
// =============================================================================

/**
 * Load all block definitions from the API on mount.
 *
 * Blocks are fetched from `GET /api/blocks` which reads both the vanilla
 * `BlockConfig.xml` and the custom `BlockConfigImport.xml`. Custom blocks
 * override vanilla blocks with the same ID.
 *
 * Loading is skipped when `isValid` is false (StarMade directory not configured).
 *
 * @param {boolean} [autoload=true] Whether to fetch on mount.
 *        The `Header` component calls `useBlocks(false)` to get `reload`
 *        without triggering a duplicate load.
 * @returns {{ reload: () => Promise<void> }} Manual reload trigger.
 */
export function useBlocks(autoload = true) {
  const setBlocks  = useBlockStore(s => s.setBlocks);
  const setLoading = useBlockStore(s => s.setLoading);
  const setError   = useBlockStore(s => s.setError);
  const isValid    = useConfigStore(s => s.isValid);

  /**
   * Fetch the full block list from the API.
   * Sets `loading` while in-flight and `error` on failure.
   * No-ops when `isValid` is false.
   */
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

  // Auto-load on mount when enabled.
  useEffect(() => {
    if (!autoload) return;
    reload();
  }, [autoload, reload]);

  return { reload };
}

// =============================================================================
// useSaveBlock
// =============================================================================

/**
 * Save the current draft block to the API.
 *
 * Sends a `PUT /api/blocks/:id` request with the full draft as the body.
 * On success, replaces the saved entry in the block list and re-selects the
 * block (resetting `isDirty = false` and creating a fresh draft from the
 * saved data).
 *
 * Vanilla blocks are promoted to custom on first save (the server sets
 * `isCustom: true` in the response).
 *
 * @returns {{ save: () => Promise<void> }} Save function.
 */
export function useSaveBlock() {
  const draft       = useBlockStore(s => s.draft);
  const blocks      = useBlockStore(s => s.blocks);
  const setBlocks   = useBlockStore(s => s.setBlocks);
  const selectBlock = useBlockStore(s => s.selectBlock);
  const setDirty    = useBlockStore(s => s.setDirty);
  const setError    = useBlockStore(s => s.setError);

  const save = useCallback(async () => {
    if (!draft) return; // No-op when nothing is selected.
    try {
      const res = await fetch(`${API}/blocks/${draft.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
      const saved = await res.json() as BlockDef;
      // Replace the matching entry in the block list.
      setBlocks(blocks.map(b => b.id === saved.id ? saved : b));
      selectBlock(saved); // Resets isDirty and clones a fresh draft.
      setDirty(false);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [draft, blocks, setBlocks, selectBlock, setDirty, setError]);

  return { save };
}

// =============================================================================
// useDeleteBlock
// =============================================================================

/**
 * Delete a custom block from the API and remove it from the block list.
 *
 * Sends `DELETE /api/blocks/:id`. The server rejects the request with 403 if
 * the block is a vanilla block (use the Deprecated flag instead).
 *
 * On success, selects the next block in the list (or deselects if the list
 * becomes empty).
 *
 * @returns {{ deleteBlock: (block: BlockDef) => Promise<void> }}
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
      // Select the first remaining block, or deselect if none remain.
      selectBlock(nextBlocks[0] ?? null);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [blocks, setBlocks, selectBlock, setError]);

  return { deleteBlock };
}

// =============================================================================
// useCreateBlock
// =============================================================================

/**
 * Create a new custom block via the API.
 *
 * Sends `POST /api/blocks` with an empty body. The server assigns a new ID
 * (max existing ID + 1, minimum 1000) and returns the created block definition
 * with sensible defaults.
 *
 * On success, appends the new block to the list and selects it so the user
 * can immediately start editing its properties.
 *
 * @returns {{ createBlock: () => Promise<void> }}
 */
export function useCreateBlock() {
  const blocks      = useBlockStore(s => s.blocks);
  const setBlocks   = useBlockStore(s => s.setBlocks);
  const selectBlock = useBlockStore(s => s.selectBlock);
  const setError    = useBlockStore(s => s.setError);

  const createBlock = useCallback(async () => {
    try {
      const res = await fetch(`${API}/blocks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const created = await res.json() as BlockDef;
      setBlocks([...blocks, created]); // Append to list (server sorts on read).
      selectBlock(created);            // Immediately select for editing.
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [blocks, setBlocks, selectBlock, setError]);

  return { createBlock };
}
