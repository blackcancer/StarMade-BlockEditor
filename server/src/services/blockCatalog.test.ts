import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getCatalogue, mutateCatalogue } from './blockCatalog.js';

describe('Decoder catalogue persistence', () => {
  let root: string;
  let vanilla: string;
  let mapping: string;
  let custom: string;
  const vanillaXml = '<Config><Element><General><Block type="HULL" name="Hull" icon="2" textureId="1"><Hitpoints unit="keep">100</Hitpoints><Unknown><Value> 001 </Value></Unknown></Block></General></Element></Config>';
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'blockeditor-catalog-'));
    fs.mkdirSync(path.join(root, 'data/config'), { recursive: true });
    vanilla = path.join(root, 'data/config/BlockConfig.xml');
    mapping = path.join(root, 'data/config/BlockTypes.properties');
    custom = path.join(root, 'customBlockConfig/BlockConfigImport.xml');
    fs.writeFileSync(vanilla, vanillaXml);
    fs.writeFileSync(mapping, 'HULL=1\n');
  });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

  it('loads a vanilla-only installation without creating custom folders and caches immutable models', () => {
    const first = getCatalogue(root);
    expect(first.blocks.size).toBe(1);
    expect(first.custom.size).toBe(0);
    expect(first.blocks.get(1)!.name).toBe('Hull');
    expect(getCatalogue(root)).toBe(first);
    expect(fs.existsSync(path.dirname(custom))).toBe(false);
  });

  it('promotes a block, preserves exact vanilla/mapping bytes and keeps source extensions across restart', () => {
    const snapshot = getCatalogue(root);
    const updated = mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1, patch: { hp: 101 } });
    expect(updated.custom.getById(1)!.hp).toBe(101);
    expect(updated.revision).not.toBe(snapshot.revision);
    expect(fs.readFileSync(custom, 'utf8')).toContain('<Hitpoints unit="keep">101</Hitpoints>');
    expect(fs.readFileSync(custom, 'utf8')).toContain(' 001 ');
    expect(fs.readFileSync(vanilla, 'utf8')).toBe(vanillaXml);
    expect(fs.readFileSync(mapping, 'utf8')).toBe('HULL=1\n');
    expect(snapshot.blocks.get(1)!.hp).toBe(100);
    const reset = mutateCatalogue(root, updated.revision, { kind: 'update', id: 1, patch: { hp: 100 } });
    expect(reset.custom.getById(1)!.hp).toBe(100);
    expect(fs.readdirSync(path.dirname(custom)).some(name => name.includes('.backup-'))).toBe(true);
    const removed = mutateCatalogue(root, reset.revision, { kind: 'delete', id: 1 });
    expect(removed.custom.size).toBe(0);
    expect(removed.blocks.get(1)!.hp).toBe(100);
  });

  it('creates custom identities that reload without modifying the vanilla type map', () => {
    let snapshot = mutateCatalogue(root, getCatalogue(root).revision, { kind: 'create', patch: { name: 'New', extraProperties: { FullName: 'Full' } } });
    expect(snapshot.blocks.get(1000)!.name).toBe('New');
    expect(snapshot.blocks.get(1000)!.metadata.fullName).toBe('Full');
    expect(snapshot.blocks.get(1000)!.xmlTypeName).toBe('1000');
    snapshot = mutateCatalogue(root, snapshot.revision, { kind: 'create', patch: {} });
    expect(snapshot.blocks.has(1001)).toBe(true);
    snapshot = mutateCatalogue(root, snapshot.revision, { kind: 'delete', id: 1000 });
    expect(snapshot.blocks.has(1000)).toBe(false);
  });

  it('rejects stale revisions, forbidden vanilla deletion, missing records and unmapped type names', () => {
    const snapshot = getCatalogue(root);
    expect(() => mutateCatalogue(root, 'stale', { kind: 'create', patch: {} })).toThrow(/changed/i);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'delete', id: 1 })).toThrow(/vanilla/i);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'delete', id: 999 })).toThrow(/not found/i);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 999, patch: {} })).toThrow(/not found/i);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1, patch: { xmlTypeName: 'UNKNOWN' } })).toThrow(/mapping/i);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1, patch: { xmlTypeName: '2' } })).toThrow(/identity/i);
    expect(fs.existsSync(custom)).toBe(false);
  });

  it('invalidates after all three files change, even if mtimes are restored', () => {
    const first = getCatalogue(root);
    const stat = fs.statSync(mapping);
    fs.writeFileSync(mapping, 'HULL=2\n'); fs.utimesSync(mapping, stat.atime, stat.mtime);
    const second = getCatalogue(root);
    expect(second.revision).not.toBe(first.revision);
    expect(second.blocks.has(2)).toBe(true);
    fs.writeFileSync(vanilla, vanillaXml.replace('100</Hitpoints>', '200</Hitpoints>'));
    const third = getCatalogue(root);
    expect(third.blocks.get(2)!.hp).toBe(200);
    fs.mkdirSync(path.dirname(custom));
    fs.writeFileSync(custom, '<Config><Block type="2" name="Override"><Hitpoints>300</Hitpoints></Block></Config>');
    expect(getCatalogue(root).blocks.get(2)!.hp).toBe(300);
    expect(() => mutateCatalogue(root, first.revision, { kind: 'create', patch: {} })).toThrow(/changed/i);
  });

  it.each([
    '<Config>',
    '<Config><Block type="UNKNOWN" name="Lost"/></Config>',
    '<Config><Block type="UNKNOWN"/></Config>',
    '<Config><Block name="Lost"/></Config>',
    '<Config><Block/></Config>',
    '<Config><Block type="1" name="First"/><Block type="1" name="Duplicate"/></Config>',
  ])('refuses destructive edits when custom XML cannot be represented completely', text => {
    fs.mkdirSync(path.dirname(custom)); fs.writeFileSync(custom, text);
    expect(() => getCatalogue(root)).toThrow();
    expect(fs.readFileSync(custom, 'utf8')).toBe(text);
  });

  it('rejects a custom destination redirected outside the selected installation', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'blockeditor-outside-'));
    try {
      fs.symlinkSync(outside, path.dirname(custom));
      const snapshot = getCatalogue(root);
      expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'create', patch: {} })).toThrow(/outside/i);
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
  });

  it('keeps a successful custom file unchanged if the next atomic commit fails', () => {
    const snapshot = mutateCatalogue(root, getCatalogue(root).revision, { kind: 'update', id: 1, patch: { hp: 101 } });
    const before = fs.readFileSync(custom);
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('disk unavailable'); });
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1, patch: { hp: 102 } })).toThrow('disk unavailable');
    expect(fs.readFileSync(custom)).toEqual(before);
    expect(getCatalogue(root).blocks.get(1)!.hp).toBe(101);
  });

  it('updates existing numeric custom IDs and rejects symlink files without touching their target', () => {
    fs.mkdirSync(path.dirname(custom));
    const other = path.join(root, 'saved.xml');
    fs.writeFileSync(other, '<Config><Block type="1000" name="Existing"/></Config>');
    fs.copyFileSync(other, custom);
    let snapshot = getCatalogue(root);
    snapshot = mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1000, patch: { hp: 150 } });
    expect(snapshot.blocks.get(1000)!.hp).toBe(150);
    fs.unlinkSync(custom); fs.symlinkSync(other, custom);
    snapshot = getCatalogue(root);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1000, patch: {} })).toThrow(/symbolic link/);
    expect(fs.readFileSync(other, 'utf8')).toContain('Existing');
  });

  it('reports exhaustion instead of allocating an invalid native catalogue ID', () => {
    const definitions = Array.from({ length: 3095 }, (_, index) => `<Block type="${1000 + index}" name="Block ${index}"/>`).join('');
    fs.writeFileSync(vanilla, `<Config>${definitions}</Config>`);
    const snapshot = getCatalogue(root);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'create', patch: {} })).toThrow(/No free/);
    expect(fs.existsSync(custom)).toBe(false);
  });

  it('rejects a dangling custom file symlink without replacing it', () => {
    fs.mkdirSync(path.dirname(custom));
    const absent = path.join(root, 'absent.xml');
    fs.symlinkSync(absent, custom);
    const snapshot = getCatalogue(root);
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'create', patch: {} })).toThrow(/symbolic link/);
    expect(fs.readlinkSync(custom)).toBe(absent);
    expect(fs.existsSync(absent)).toBe(false);
  });

  it('propagates custom file IO errors and checks source files again before committing', () => {
    const read = fs.readFileSync;
    vi.spyOn(fs, 'readFileSync').mockImplementation((file, ...options) => {
      if (String(file) === custom) throw Object.assign(new Error('custom unreadable'), { code: 'EACCES' });
      return read(file, ...options);
    });
    expect(() => getCatalogue(root)).toThrow('custom unreadable');
    vi.restoreAllMocks();
    const snapshot = getCatalogue(root);
    let vanillaReads = 0;
    vi.spyOn(fs, 'readFileSync').mockImplementation((file, ...options) => {
      if (String(file) === vanilla && ++vanillaReads === 2) fs.writeFileSync(mapping, 'HULL=2\n');
      return read(file, ...options);
    });
    expect(() => mutateCatalogue(root, snapshot.revision, { kind: 'update', id: 1, patch: { hp: 101 } })).toThrow(/changed/);
    expect(fs.existsSync(custom)).toBe(false);
  });
});
