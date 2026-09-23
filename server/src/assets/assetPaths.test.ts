import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AssetError, assetStamp, confinedPath, installationRoot, listAssetFiles } from './assetPaths.js';

describe('installation asset boundaries', () => {
  let tmp: string;
  const cwd = process.cwd();
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-paths-')); process.chdir(tmp); });
  afterEach(() => { vi.restoreAllMocks(); process.chdir(cwd); fs.rmSync(tmp, { recursive: true, force: true }); });

  it('resolves only an explicitly configured existing installation', () => {
    expect(() => installationRoot()).toThrow('Configure');
    fs.writeFileSync('SMToolConfig.json', JSON.stringify({ starmadeDir: path.join(tmp, 'absent') }));
    expect(() => installationRoot()).toThrow('installation');
    fs.mkdirSync('game'); fs.mkdirSync('game/StarMade'); fs.mkdirSync('game/StarMade/data', { recursive: true });
    fs.mkdirSync('game/StarMade/data/config'); fs.writeFileSync('game/StarMade/data/config/BlockConfig.xml', '<Config/>');
    fs.writeFileSync('SMToolConfig.json', JSON.stringify({ starmadeDir: path.join(tmp, 'game') }));
    expect(installationRoot()).toBe(path.join(tmp, 'game/StarMade'));
    expect(new AssetError('bad').status).toBe(400);
    expect(new AssetError('missing', 404).status).toBe(404);
  });

  it('confines existing and prospective files including symlinks', () => {
    const root = path.join(tmp, 'game'); fs.mkdirSync(root); fs.mkdirSync(path.join(root, 'sub'));
    fs.writeFileSync(path.join(root, 'sub', 'a.png'), 'image');
    expect(confinedPath(root, 'sub/a.png')).toBe(path.join(root, 'sub/a.png'));
    expect(confinedPath(root, 'new/deep/a.png')).toBe(path.join(root, 'new/deep/a.png'));
    for (const name of ['../escape', '/absolute', 'a/../../escape', 'a\\escape', 'a\0b', '.']) {
      expect(() => confinedPath(root, name)).toThrow();
    }
    fs.symlinkSync(tmp, path.join(root, 'outside'));
    expect(() => confinedPath(root, 'outside/private')).toThrow('outside');
    fs.symlinkSync(path.join(root, 'sub'), path.join(root, 'inside'));
    expect(confinedPath(root, 'inside/a.png')).toBe(path.join(root, 'sub/a.png'));
  });

  it('enumerates deterministic regular assets and stamps changes and absence', () => {
    fs.mkdirSync('game'); fs.mkdirSync('game/sub');
    fs.writeFileSync('game/z', 'z'); fs.writeFileSync('game/sub/a', 'a');
    const root = path.join(tmp, 'game');
    expect(listAssetFiles(root)).toEqual(['sub/a', 'z']);
    expect(listAssetFiles(path.join(tmp, 'missing'))).toEqual([]);
    expect(assetStamp(path.join(root, 'absent'))).toContain('missing');
    const first = assetStamp(path.join(root, 'z'));
    fs.writeFileSync(path.join(root, 'z'), 'different');
    expect(assetStamp(path.join(root, 'z'))).not.toBe(first);
    fs.symlinkSync(tmp, path.join(root, 'bad'));
    expect(() => listAssetFiles(root)).toThrow('Symbolic');
  });
  it('ignores non-regular directory entries such as devices or FIFOs', () => {
    vi.spyOn(fs, 'readdirSync').mockReturnValue([{ name: 'pipe', isSymbolicLink: () => false, isDirectory: () => false, isFile: () => false }] as unknown as ReturnType<typeof fs.readdirSync>);
    expect(listAssetFiles(tmp)).toEqual([]);
  });

});
