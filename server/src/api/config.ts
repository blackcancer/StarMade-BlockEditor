/** @fileoverview Validated editor configuration and fresh-install detection, with protected persistence. */
import { Router, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { resolveStarmadeRoot } from '../utils/path.js';
import { atomicWriteFile, fileRevision, FileConflictError } from '../services/atomicFile.js';

/** Permitted StarMade texture resolutions. */
export const VALID_SIZES = [64, 128, 256] as const;
type AtlasSize = typeof VALID_SIZES[number];

/** Settings consumed by the editor; unrelated persisted fields are preserved. */
interface EditorConfig {
  starmadeDir: string;
  worldDir: string;
  atlasSize: AtlasSize;
  texturePack: string;
}
const defaults: EditorConfig = { starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default' };

/** Returns the current editor configuration location. */
export function configFilePath(): string { return path.resolve(process.cwd(), 'SMToolConfig.json'); }

/** Rejects a corrupted persisted document instead of overwriting it with defaults. */
function readRaw(file: string): Record<string, unknown> {
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new SyntaxError('Configuration must be an object');
  return value as Record<string, unknown>;
}

/** Loads settings, creates missing defaults atomically, and normalizes invalid legacy values. */
export function loadConfig(): EditorConfig {
  const file = configFilePath();
  const initial = { ...defaults, starmadeDir: process.env.EDITOR_FIXED_STARMADE_DIR ?? defaults.starmadeDir };
  if (!fs.existsSync(file)) {
    atomicWriteFile(file, JSON.stringify(initial, null, 2), { expectedRevision: null });
    return initial;
  }
  const cfg = readRaw(file);
  return {
    starmadeDir: process.env.EDITOR_FIXED_STARMADE_DIR ?? (typeof cfg.starmadeDir === 'string' ? cfg.starmadeDir : defaults.starmadeDir),
    worldDir: typeof cfg.worldDir === 'string' ? cfg.worldDir : defaults.worldDir,
    atlasSize: VALID_SIZES.includes(cfg.atlasSize as AtlasSize) ? cfg.atlasSize as AtlasSize : defaults.atlasSize,
    texturePack: typeof cfg.texturePack === 'string' ? cfg.texturePack : defaults.texturePack,
  };
}

/** Preserves unknown settings and previous bytes before replacing configuration. */
export function saveConfig(cfg: EditorConfig): void {
  const file = configFilePath();
  const expectedRevision = fileRevision(file);
  const previous = expectedRevision === null ? {} : readRaw(file);
  atomicWriteFile(file, JSON.stringify({ ...previous, ...cfg }, null, 2), { expectedRevision });
}

/** Requires the vanilla catalogue and identity map, never pre-existing custom textures or worlds. */
export function validateDir(dir: string): { valid: boolean; missing: string[] } {
  const resolved = resolveStarmadeRoot(dir);
  const required = ['BlockConfig.xml', 'BlockTypes.properties'].map(name => path.join(resolved, 'data', 'config', name));
  const missing = required.filter(file => !resolved || !fs.existsSync(file) || !fs.statSync(file).isFile());
  return { valid: missing.length === 0, missing };
}

/** Checks an HTTP partial settings update without coercion or arbitrary additional fields. */
function validatePatch(value: unknown): Partial<EditorConfig> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Configuration update must be an object');
  for (const [key, entry] of Object.entries(value)) {
    if (!Object.hasOwn(defaults, key)) throw new TypeError(`Unknown configuration field: ${key}`);
    if (key === 'atlasSize') {
      if (!VALID_SIZES.includes(entry as AtlasSize)) throw new TypeError('Invalid atlas size');
    } else if (typeof entry !== 'string' || entry.includes('\0')) throw new TypeError(`${key} must be text`);
  }
  return value as Partial<EditorConfig>;
}

/** Sends safe JSON failures instead of Express's HTML error page and internal paths. */
function failure(response: Response, error: unknown): void {
  if (error instanceof TypeError) { response.status(400).json({ error: error.message }); return; }
  if (error instanceof FileConflictError) { response.status(409).json({ error: error.message }); return; }
  response.status(500).json({ error: 'Unable to read or save editor configuration.' });
}

/** Restricts hosted previews to their disposable installation. */
function directoryAllowed(directory: string): boolean {
  const fixed = process.env.EDITOR_FIXED_STARMADE_DIR;
  return fixed === undefined || path.resolve(resolveStarmadeRoot(directory)) === path.resolve(resolveStarmadeRoot(fixed));
}

/** Settings endpoints used by the setup dialog and resource services. */
export const configRouter = Router();
configRouter.get('/', (_request, response) => {
  try {
    const cfg = loadConfig();
    response.json({ ...cfg, isValid: validateDir(cfg.starmadeDir).valid });
  } catch (error) { failure(response, error); }
});
configRouter.post('/', (request, response) => {
  try {
    const patch = validatePatch(request.body);
    const cfg = { ...loadConfig(), ...patch };
    if (!directoryAllowed(cfg.starmadeDir)) { response.status(403).json({ error: 'This preview uses a fixed StarMade installation.' }); return; }
    const { valid, missing } = validateDir(cfg.starmadeDir);
    saveConfig(cfg);
    response.json({ ...cfg, isValid: valid, missing });
  } catch (error) { failure(response, error); }
});
configRouter.get('/check', (request, response) => {
  try {
    const dir = request.query.dir ?? loadConfig().starmadeDir;
    if (typeof dir !== 'string') throw new TypeError('Directory must be text');
    if (!directoryAllowed(dir)) { response.status(403).json({ error: 'This preview uses a fixed StarMade installation.' }); return; }
    response.json(validateDir(dir));
  } catch (error) { failure(response, error); }
});
