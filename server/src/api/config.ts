/**
 * @fileoverview Config API router — editor configuration management.
 *
 * Manages the editor's `SMToolConfig.json` file, which persists the user's
 * StarMade installation directory, selected texture resolution, and active
 * texture pack. This file is created automatically on first use.
 *
 * ## Endpoints
 *  - `GET  /api/config`       — Return current config + directory validation status.
 *  - `POST /api/config`       — Partial update: modify any subset of config fields.
 *  - `GET  /api/config/check` — Validate a directory path without saving.
 *
 * ## Directory validation
 * A StarMade directory is considered valid when it contains all required files:
 *  - `data/config/BlockConfig.xml`         — block definitions
 *  - `customBlockTextures/256/custom.png`  — custom texture atlas (auto-created on import)
 *
 * The `isValid` flag is included in every config response so the client can
 * immediately know whether block data can be loaded.
 *
 * ## WSL / cross-platform paths
 * The `resolveStarmadeRoot` helper translates Windows-style paths
 * (`D:\Games\StarMade`) to WSL mount paths (`/mnt/d/Games/StarMade`) when the
 * server is running under WSL. It also auto-detects nested `StarMade/` subdirs.
 *
 * @module api/config
 * @author InitSysRev
 * @version 1.0.0
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { resolveStarmadeRoot } from '../utils/path.js';

// =============================================================================
// Config file path
// =============================================================================

/**
 * Absolute path to the editor configuration file.
 * Located in the process working directory (the repository root when running
 * via `npm start`).
 *
 * @returns {string} Absolute path to `SMToolConfig.json`.
 */
export function configFilePath(): string {
  return path.resolve(process.cwd(), 'SMToolConfig.json');
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Permitted atlas tile size values in pixels.
 * These correspond to the texture resolutions provided by StarMade:
 *  - 64  px — low resolution
 *  - 128 px — medium resolution
 *  - 256 px — full resolution (default)
 */
export const VALID_SIZES = [64, 128, 256] as const;
type AtlasSize = typeof VALID_SIZES[number];

// =============================================================================
// Config interface and I/O
// =============================================================================

/**
 * Editor configuration stored in `SMToolConfig.json`.
 *
 * All fields are optional in the file (defaulted on load) but required in the
 * in-memory representation.
 */
interface EditorConfig {
  /** Absolute path to the StarMade game installation directory. Empty = not configured. */
  starmadeDir: string;
  /** Active world/database directory name. Defaults to `"world0"`. */
  worldDir:    string;
  /** Texture atlas tile resolution (64 | 128 | 256). Defaults to 256. */
  atlasSize:   AtlasSize;
  /** Selected texture pack name. Defaults to `"Default"`. */
  texturePack: string;
}

/**
 * Load the editor configuration from disk.
 *
 * Creates a default `SMToolConfig.json` if the file does not exist.
 * Missing fields are filled with defaults so the return value is always complete.
 *
 * @returns {EditorConfig} Fully populated configuration object.
 */
export function loadConfig(): EditorConfig {
  const configFile = configFilePath();

  if (!fs.existsSync(configFile)) {
    const defaults: EditorConfig = {
      starmadeDir: '',
      worldDir:    'world0',
      atlasSize:   256,
      texturePack: 'Default',
    };
    fs.writeFileSync(configFile, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }

  const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Partial<EditorConfig>;
  return {
    starmadeDir: cfg.starmadeDir ?? '',
    worldDir:    cfg.worldDir    ?? 'world0',
    // Reject invalid `atlasSize` values (e.g. from manual edits) and fall back to 256.
    atlasSize:   VALID_SIZES.includes(cfg.atlasSize as AtlasSize) ? cfg.atlasSize as AtlasSize : 256,
    texturePack: cfg.texturePack ?? 'Default',
  };
}

/**
 * Persist the editor configuration to disk.
 *
 * Writes `SMToolConfig.json` as pretty-printed JSON (2-space indent) so users
 * can inspect and edit it manually if needed.
 *
 * @param {EditorConfig} cfg Configuration to write.
 */
export function saveConfig(cfg: EditorConfig): void {
  fs.writeFileSync(configFilePath(), JSON.stringify(cfg, null, 2), 'utf8');
}

// =============================================================================
// Directory validation
// =============================================================================

/**
 * Validate that a StarMade installation directory contains all required files.
 *
 * Required files:
 *  - `data/config/BlockConfig.xml`        — must exist for block loading
 *  - `customBlockTextures/256/custom.png` — created on first texture import;
 *    presence here indicates a valid game directory that has been used with the editor
 *
 * The path is first passed through `resolveStarmadeRoot` to handle WSL path
 * translation and nested-directory detection.
 *
 * @param {string} dir User-supplied path string.
 * @returns {{ valid: boolean; missing: string[] }}
 *   `valid: true` when all required files exist; `missing` lists absent paths.
 */
export function validateDir(dir: string): { valid: boolean; missing: string[] } {
  const resolved = resolveStarmadeRoot(dir);
  const required = [
    path.join(resolved, 'data', 'config', 'BlockConfig.xml'),
    path.join(resolved, 'customBlockTextures', '256', 'custom.png'),
  ];
  const missing = required.filter(p => !fs.existsSync(p));
  return { valid: missing.length === 0, missing };
}

// =============================================================================
// Router
// =============================================================================

export const configRouter = Router();

/**
 * GET /api/config
 * Return the current editor configuration plus a directory validity flag.
 *
 * Response shape:
 * ```json
 * {
 *   "starmadeDir": "/mnt/d/Games/StarMade",
 *   "worldDir": "world0",
 *   "atlasSize": 256,
 *   "texturePack": "Default",
 *   "isValid": true
 * }
 * ```
 */
configRouter.get('/', (_req, res) => {
  const cfg = loadConfig();
  const { valid } = validateDir(cfg.starmadeDir);
  res.json({ ...cfg, isValid: valid });
});

/**
 * POST /api/config
 * Partially update the editor configuration.
 *
 * Only fields present in the request body are updated; omitted fields retain
 * their current values. Invalid `atlasSize` values are silently ignored.
 *
 * Response includes the merged config plus `isValid` and `missing` from
 * directory validation so the client can update its state in one round-trip.
 */
configRouter.post('/', (req, res) => {
  const { starmadeDir, worldDir, atlasSize, texturePack } =
    req.body as Partial<EditorConfig>;

  const cfg = loadConfig();

  if (starmadeDir !== undefined) cfg.starmadeDir = starmadeDir;
  if (worldDir    !== undefined) cfg.worldDir    = worldDir;
  if (texturePack !== undefined) cfg.texturePack = texturePack;
  if (atlasSize   !== undefined && VALID_SIZES.includes(atlasSize as AtlasSize)) {
    cfg.atlasSize = atlasSize as AtlasSize;
  }

  saveConfig(cfg);

  const { valid, missing } = validateDir(cfg.starmadeDir);
  res.json({ ...cfg, isValid: valid, missing });
});

/**
 * GET /api/config/check?dir=<path>
 * Validate a StarMade directory path without modifying the config.
 *
 * If the `dir` query parameter is omitted, validates the currently configured
 * `starmadeDir`. Useful for validating user input before saving.
 *
 * Response shape:
 * ```json
 * { "valid": false, "missing": ["/mnt/d/.../BlockConfig.xml"] }
 * ```
 */
configRouter.get('/check', (req, res) => {
  const dir = (req.query.dir as string) || loadConfig().starmadeDir;
  const { valid, missing } = validateDir(dir);
  res.json({ valid, missing });
});
