/**
 * @fileoverview Editor configuration store — Zustand.
 *
 * Holds the runtime copy of `SMToolConfig.json` in client memory.
 * Populated on app startup via `useConfig()` and updated whenever the user
 * changes the StarMade directory, texture resolution, or texture pack.
 *
 * ## Fields
 *  - `starmadeDir`  — Absolute path to the StarMade game root. Empty string = not configured.
 *  - `worldDir`     — Active world/database folder name (default `"world0"`).
 *  - `atlasSize`    — Tile resolution in pixels: 64 | 128 | 256 (default 256).
 *  - `texturePack`  — Selected texture pack name (default `"Default"`).
 *  - `isValid`      — Whether `starmadeDir` contains all required StarMade files.
 *                     Set by the server's `/api/config` validation response.
 *
 * `isValid` is the primary gate for enabling 3D preview, block loading, and
 * texture serving. All features that require StarMade assets check this flag
 * before making API requests.
 *
 * @module store/configStore
 * @author InitSysRev
 * @version 1.0.0
 */

import { create } from 'zustand';

// =============================================================================
// Store interface
// =============================================================================

/**
 * Zustand store shape for the editor configuration.
 */
interface ConfigStore {
  /** Absolute path to the StarMade installation directory. Empty = unconfigured. */
  starmadeDir: string;

  /** Active world/database folder name inside the StarMade directory. */
  worldDir:    string;

  /**
   * Texture atlas tile resolution in pixels.
   * Must be one of the three sizes StarMade provides: 64, 128, or 256.
   */
  atlasSize:   64 | 128 | 256;

  /**
   * Selected texture pack name.
   * Corresponds to a subdirectory under `data/textures/block/` in the StarMade
   * installation (e.g. `"Default"` → `data/textures/block/Default/256/t000.png`).
   */
  texturePack: string;

  /**
   * Whether the configured `starmadeDir` passes server-side validation.
   * True only when `data/config/BlockConfig.xml` and other required files exist.
   * Used as a gate for all StarMade-data-dependent features.
   */
  isValid:     boolean;

  /**
   * Merge a partial config update into the store.
   * Accepts any subset of the non-function store fields.
   *
   * @param {Partial<Omit<ConfigStore, 'setConfig'>>} cfg Fields to update.
   */
  setConfig:   (cfg: Partial<Omit<ConfigStore, 'setConfig'>>) => void;
}

// =============================================================================
// Store implementation
// =============================================================================

export const useConfigStore = create<ConfigStore>((set) => ({
  starmadeDir: '',
  worldDir:    'world0',
  atlasSize:   256,
  texturePack: 'Default',
  isValid:     false,

  /**
   * Shallow-merge a config patch. Used by `useConfig()` hook after every
   * `GET /api/config` and `POST /api/config` response.
   */
  setConfig: (cfg) => set(s => ({ ...s, ...cfg })),
}));
