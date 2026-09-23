/** @fileoverview Synchronous staged replacement with content checks and retained backups. */
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

/** Signals an external edit that must be reloaded before writing. */
export class FileConflictError extends Error {
  constructor() { super('The file changed. Reload before saving.'); }
}

/** Reads optional bytes while propagating permission and other filesystem failures. */
function readOptional(target: string): Buffer | null {
  try { return fs.readFileSync(target); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Hashes exact bytes, keeping a missing file distinct from an empty one. */
function revision(data: Buffer | null): string | null {
  return data === null ? null : createHash('sha256').update(data).digest('hex');
}

/** Returns a content hash or null for a missing file. */
export function fileRevision(target: string): string | null { return revision(readOptional(target)); }

/** Writes a new exclusive file and flushes its contents before closing it. */
function writeExclusive(target: string, data: string | Uint8Array, mode: number): void {
  const descriptor = fs.openSync(target, 'wx', mode);
  try { fs.writeFileSync(descriptor, data); fs.fsyncSync(descriptor); }
  finally { fs.closeSync(descriptor); }
}

/**
 * Replaces a file through a same-directory rename after retaining its previous bytes.
 * The parent directory must exist. Completed backups remain available after failures.
 * Content checks detect changes before staging and immediately before replacement.
 */
export function atomicWriteFile(
  target: string,
  data: string | Uint8Array,
  options: { expectedRevision?: string | null } = {},
): { revision: string; backupPath: string | null } {
  const previous = readOptional(target);
  const previousRevision = revision(previous);
  if (options.expectedRevision !== undefined && options.expectedRevision !== previousRevision) throw new FileConflictError();
  const mode = previous === null ? 0o600 : fs.statSync(target).mode & 0o777;
  const temporary = `${target}.tmp-${randomUUID()}`;
  const backupPath = previous === null ? null : `${target}.backup-${randomUUID()}`;
  try {
    writeExclusive(temporary, data, mode);
    if (backupPath !== null) writeExclusive(backupPath, previous!, mode);
    if (fileRevision(target) !== previousRevision) throw new FileConflictError();
    fs.renameSync(temporary, target);
    return { revision: createHash('sha256').update(data).digest('hex'), backupPath };
  } finally { fs.rmSync(temporary, { force: true }); }
}
