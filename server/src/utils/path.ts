/**
 * @fileoverview Path normalization helpers for cross-OS local filesystem access.
 *
 * Allows a Windows-style path saved in SMToolConfig.json (e.g. D:\Games\StarMade)
 * to be used when the API runs under WSL/Linux (/mnt/d/Games/StarMade).
 */

import fs from 'fs';
import path from 'path';

/**
 * Normalize a user-provided local path for the current runtime.
 *
 * - On Windows: returns the original path.
 * - On WSL/Linux: converts `C:\foo\bar` or `C:/foo/bar` to `/mnt/c/foo/bar`.
 */
export function normalizeHostPath(input: string): string {
  const value = String(input ?? '').trim();
  if (!value) return value;

  if (process.platform === 'win32') return value;

  const windowsDrive = /^([a-zA-Z]):[\\/](.*)$/;
  const match = value.match(windowsDrive);
  if (!match) return value;

  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

/**
 * Check whether a path exists after runtime normalization.
 */
export function existsHostPath(input: string): boolean {
  return fs.existsSync(normalizeHostPath(input));
}

/**
 * Resolve the actual StarMade game root.
 *
 * Accepts either the real game directory itself or its parent launcher folder,
 * and auto-detects the nested `StarMade/` directory used by some installs.
 */
export function resolveStarmadeRoot(input: string): string {
  const base = normalizeHostPath(input);
  if (!base) return base;

  const candidates = [
    base,
    path.join(base, 'StarMade'),
  ];

  for (const candidate of candidates) {
    const blockConfig = path.join(candidate, 'data', 'config', 'BlockConfig.xml');
    if (fs.existsSync(blockConfig)) return candidate;
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return base;
}
