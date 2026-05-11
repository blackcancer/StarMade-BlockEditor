/**
 * @fileoverview Config API router.
 *
 * GET  /api/config        — returns current starmadeDir + atlasSize
 * POST /api/config        — sets starmadeDir (writes SMToolConfig.json)
 * GET  /api/config/check  — validates the starmadeDir (checks required paths)
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { resolveStarmadeRoot } from '../utils/path.js';

export function configFilePath(): string {
  return path.resolve(process.cwd(), 'SMToolConfig.json');
}

/** Default atlas tile size options supported by StarMade. */
export const VALID_SIZES = [64, 128, 256] as const;
type AtlasSize = typeof VALID_SIZES[number];

/**
 * Loaded config shape.
 * Mirrors SMToolConfigData from StarMade-Decoder.
 */
interface EditorConfig {
  starmadeDir: string;
  worldDir:    string;
  atlasSize:   AtlasSize;
  texturePack: string;
}

/**
 * Load the editor config file, creating defaults if missing.
 *
 * @returns {EditorConfig} Parsed config object.
 */
export function loadConfig(): EditorConfig {
  const configFile = configFilePath();
  if (!fs.existsSync(configFile)) {
    const defaults: EditorConfig = { starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default' };
    fs.writeFileSync(configFile, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }
  const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Partial<EditorConfig>;
  return {
    starmadeDir: cfg.starmadeDir ?? '',
    worldDir: cfg.worldDir ?? 'world0',
    atlasSize: VALID_SIZES.includes(cfg.atlasSize as AtlasSize) ? cfg.atlasSize as AtlasSize : 256,
    texturePack: cfg.texturePack ?? 'Default',
  };
}

/**
 * Save the editor config to disk.
 *
 * @param {EditorConfig} cfg Config to persist.
 */
export function saveConfig(cfg: EditorConfig): void {
  fs.writeFileSync(configFilePath(), JSON.stringify(cfg, null, 2), 'utf8');
}

/**
 * Validate that a starmadeDir contains the required StarMade files.
 *
 * @param {string} dir Absolute path to validate.
 * @returns {{ valid: boolean; missing: string[] }} Validation result.
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

export const configRouter = Router();

/** GET /api/config — return current config */
configRouter.get('/', (_req, res) => {
  const cfg = loadConfig();
  const { valid } = validateDir(cfg.starmadeDir);
  res.json({ ...cfg, isValid: valid });
});

/** POST /api/config — update config */
configRouter.post('/', (req, res) => {
  const { starmadeDir, worldDir, atlasSize, texturePack } = req.body as Partial<EditorConfig>;
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

/** GET /api/config/check — validate starmadeDir without saving */
configRouter.get('/check', (req, res) => {
  const dir = (req.query.dir as string) || loadConfig().starmadeDir;
  const { valid, missing } = validateDir(dir);
  res.json({ valid, missing });
});
