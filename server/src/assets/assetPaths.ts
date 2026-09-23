/** @fileoverview Resolves host-owned assets without leaving the configured installation. */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../api/config.js';
import { resolveStarmadeRoot } from '../utils/path.js';

/** An expected asset failure with an HTTP status suitable for a local editor. */
export class AssetError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

/** Return the canonical configured installation; an empty path never means cwd. */
export function installationRoot(): string {
  const configured = loadConfig().starmadeDir;
  if (!configured) throw new AssetError('Configure a StarMade installation before loading assets.', 503);
  const root = resolveStarmadeRoot(configured);
  if (!fs.existsSync(root)) throw new AssetError('The configured StarMade installation does not exist.', 503);
  return fs.realpathSync(root);
}

/** Resolve a relative existing or prospective file, checking real ancestors and symlinks. */
export function confinedPath(root: string, relative: string): string {
  if (!relative || /(^|\/)\.\.?($|\/)|[\\\0]|^\/|^[a-z]:/i.test(relative)) {
    throw new AssetError('Invalid asset path.');
  }
  const canonicalRoot = fs.realpathSync(root);
  const destination = path.resolve(canonicalRoot, relative);
  let ancestor = destination;
  while (!fs.lstatSync(ancestor, { throwIfNoEntry: false })) ancestor = path.dirname(ancestor);
  const canonicalAncestor = fs.realpathSync(ancestor);
  const child = path.relative(canonicalRoot, canonicalAncestor);
  if (child === '..' || child.startsWith(`..${path.sep}`)) {
    throw new AssetError('Asset path resolves outside the installation.');
  }
  return path.join(canonicalAncestor, path.relative(ancestor, destination));
}

/** Cache identity includes the path, inode, size and both filesystem change timestamps. */
export function assetStamp(file: string): string {
  if (!fs.existsSync(file)) return `${file}:missing`;
  const stat = fs.statSync(file, { bigint: true });
  return `${file}:${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
}

/** List regular files deterministically; corpus directory symlinks are not traversed. */
export function listAssetFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  function visit(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new AssetError('Symbolic links are not allowed in an asset corpus.');
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(path.relative(root, file).split(path.sep).join('/'));
    }
  }
  visit(root);
  return files.sort();
}
