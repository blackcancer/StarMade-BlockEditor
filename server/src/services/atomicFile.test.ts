import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteFile, fileRevision, FileConflictError } from './atomicFile.js';

describe('atomic file persistence', () => {
  let directory: string;
  let target: string;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blockeditor-atomic-'));
    target = path.join(directory, 'custom.xml');
  });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(directory, { recursive: true, force: true }); });

  it('creates a complete file and returns a content revision without a fictitious backup', () => {
    expect(fileRevision(target)).toBeNull();
    const result = atomicWriteFile(target, '<Config/>', { expectedRevision: null });
    expect(fs.readFileSync(target, 'utf8')).toBe('<Config/>');
    expect(result).toEqual({ revision: fileRevision(target), backupPath: null });
    expect(fs.readdirSync(directory)).toEqual(['custom.xml']);
  });

  it('preserves old bytes and mode while replacing binary content', () => {
    fs.writeFileSync(target, Buffer.from([0, 255, 2]), { mode: 0o640 });
    const previous = fileRevision(target);
    const result = atomicWriteFile(target, Buffer.from([9, 8]), { expectedRevision: previous });
    expect(fs.readFileSync(target)).toEqual(Buffer.from([9, 8]));
    expect(fs.readFileSync(result.backupPath!)).toEqual(Buffer.from([0, 255, 2]));
    expect(fs.statSync(target).mode & 0o777).toBe(0o640);
    expect(result.revision).not.toBe(previous);
    const second = atomicWriteFile(target, 'next');
    expect(second.backupPath).not.toBe(result.backupPath);
    expect(fs.readFileSync(result.backupPath!)).toEqual(Buffer.from([0, 255, 2]));
  });

  it('rejects stale expectations and missing files without changing anything', () => {
    fs.writeFileSync(target, 'external edit');
    expect(() => atomicWriteFile(target, 'lost update', { expectedRevision: null })).toThrow(FileConflictError);
    expect(fs.readFileSync(target, 'utf8')).toBe('external edit');
    expect(fs.readdirSync(directory)).toEqual(['custom.xml']);
    fs.unlinkSync(target);
    expect(() => atomicWriteFile(target, 'lost update', { expectedRevision: 'old' })).toThrow(FileConflictError);
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it('detects external replacement during staging', () => {
    fs.writeFileSync(target, 'original');
    const write = fs.writeFileSync;
    let injected = false;
    vi.spyOn(fs, 'writeFileSync').mockImplementation((...args: Parameters<typeof fs.writeFileSync>) => {
      write(...args);
      if (!injected) { injected = true; write(target, 'external'); }
    });
    expect(() => atomicWriteFile(target, 'ours')).toThrow(FileConflictError);
    expect(fs.readFileSync(target, 'utf8')).toBe('external');
    expect(fs.readdirSync(directory).some(name => name.includes('.tmp-'))).toBe(false);
  });

  it.each(['writeFileSync', 'fsyncSync', 'renameSync'] as const)('retains the original after %s fails', operation => {
    fs.writeFileSync(target, 'original');
    vi.spyOn(fs, operation).mockImplementation(() => { throw new Error('disk failure'); });
    expect(() => atomicWriteFile(target, 'replacement')).toThrow('disk failure');
    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(fs.readdirSync(directory).some(name => name.includes('.tmp-'))).toBe(false);
  });

  it('retains the original if its backup cannot be written', () => {
    fs.writeFileSync(target, 'original');
    const open = fs.openSync;
    vi.spyOn(fs, 'openSync').mockImplementation((file, ...rest) => {
      if (String(file).includes('.backup-')) throw new Error('backup unavailable');
      return open(file, ...rest);
    });
    expect(() => atomicWriteFile(target, 'replacement')).toThrow('backup unavailable');
    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(fs.readdirSync(directory)).toEqual(['custom.xml']);
  });

  it('propagates access errors rather than treating them as missing files', () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); });
    expect(() => fileRevision(target)).toThrow('denied');
  });
});
