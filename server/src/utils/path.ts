/**
 * @fileoverview Path normalisation helpers for cross-platform filesystem access.
 *
 * The StarMade Block Editor server may run under Linux (native or WSL) while
 * the StarMade game is installed on a Windows drive (e.g. `D:\Games\StarMade`).
 * User-provided paths are stored in `SMToolConfig.json` in their native format,
 * so they must be translated at runtime before any `fs.*` calls.
 *
 * ## WSL path translation
 * Under WSL, Windows drive paths are mounted at `/mnt/<drive>/`:
 *  - `D:\Games\StarMade\StarMade` → `/mnt/d/Games/StarMade/StarMade`
 *  - `C:/Games/StarMade`          → `/mnt/c/Games/StarMade`
 *
 * Paths that are already Linux-style (starting with `/`) are returned unchanged.
 * On native Windows (`process.platform === 'win32'`) no translation is performed.
 *
 * ## StarMade root detection
 * The StarMade installer sometimes places the actual game in a nested
 * `StarMade/` subdirectory inside the user's chosen install path. The
 * `resolveStarmadeRoot` function detects this automatically by checking for
 * `data/config/BlockConfig.xml` in both the provided path and its `StarMade/`
 * child.
 *
 * @module utils/path
 * @author InitSysRev
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// normalizeHostPath
// =============================================================================

/**
 * Translate a user-provided filesystem path to the path usable by the current
 * Node.js process.
 *
 * On Windows (`process.platform === 'win32'`), the path is returned as-is.
 *
 * On WSL/Linux, Windows-style drive paths are translated:
 *  - `D:\foo\bar`  → `/mnt/d/foo/bar`
 *  - `D:/foo/bar`  → `/mnt/d/foo/bar`
 *
 * Paths that do not match the Windows drive pattern are returned unchanged,
 * which handles Linux paths stored in `SMToolConfig.json` from a native Linux setup.
 *
 * @param {string} input Raw path string (may be Windows or Linux format).
 * @returns {string} Runtime-normalised absolute path.
 *
 * @example
 * // Under WSL:
 * normalizeHostPath('D:\\Games\\StarMade')
 * //→ '/mnt/d/Games/StarMade'
 *
 * normalizeHostPath('/home/user/starmade')
 * //→ '/home/user/starmade' (unchanged)
 */
export function normalizeHostPath(input: string): string {
  const value = String(input ?? '').trim();
  if (!value) return value;

  // On native Windows, no translation is needed.
  if (process.platform === 'win32') return value;

  // Match Windows drive prefix: C:\ or C:/
  const windowsDrive = /^([a-zA-Z]):[\\/](.*)$/;
  const match = value.match(windowsDrive);
  if (!match) return value; // Already a Linux path — return unchanged.

  const drive = match[1].toLowerCase();
  const rest  = match[2].replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

// =============================================================================
// existsHostPath
// =============================================================================

/**
 * Check whether a path exists after applying runtime host-path normalisation.
 *
 * Equivalent to `fs.existsSync(normalizeHostPath(input))`.
 *
 * @param {string} input Raw path string.
 * @returns {boolean} True if the normalised path exists on disk.
 */
export function existsHostPath(input: string): boolean {
  return fs.existsSync(normalizeHostPath(input));
}

// =============================================================================
// resolveStarmadeRoot
// =============================================================================

/**
 * Resolve a user-provided path to the actual StarMade game root.
 *
 * Users may point the setup dialog at several valid-looking locations: the real
 * game root, the Steam/launcher folder that contains a nested `StarMade/`
 * directory, a Windows drive path while the server runs under WSL, or an
 * already-normalised POSIX path. The resolver first applies
 * {@link normalizeHostPath}, then prefers the candidate that contains
 * `data/config/BlockConfig.xml`, because that file is required by the block API.
 *
 * Resolution order:
 * 1. `<path>/data/config/BlockConfig.xml` — direct install root.
 * 2. `<path>/StarMade/data/config/BlockConfig.xml` — nested install root.
 * 3. First candidate directory that exists, allowing setup to proceed before all
 *    custom texture folders have been created.
 * 4. The normalised base path as a final diagnostic fallback.
 *
 * @param input Candidate StarMade directory from config or setup UI.
 * @returns Existing directory that should be treated as the StarMade root, or a
 * normalised fallback path when no candidate exists yet.
 */
export function resolveStarmadeRoot(input: string): string {
  const base = normalizeHostPath(input);
  if (!base) return base;

  const candidates = [
    base,                            // Direct install root.
    path.join(base, 'StarMade'),     // Nested install root.
  ];

  // Prefer the first candidate that contains BlockConfig.xml.
  for (const candidate of candidates) {
    const blockConfig = path.join(candidate, 'data', 'config', 'BlockConfig.xml');
    if (fs.existsSync(blockConfig)) return candidate;
  }

  // Fall back to the first candidate directory that actually exists.
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Last resort: return the normalised base even if it doesn't exist yet.
  return base;
}
