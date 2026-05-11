import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { existsHostPath, normalizeHostPath, resolveStarmadeRoot } from './path.js';

describe('path utilities', () => {
  it('normalizes Windows drive paths under Linux/WSL', () => {
    expect(normalizeHostPath('C:\\Games\\StarMade')).toBe('/mnt/c/Games/StarMade');
    expect(normalizeHostPath('D:/Jeux/StarMade')).toBe('/mnt/d/Jeux/StarMade');
    expect(normalizeHostPath('/mnt/d/Jeux/StarMade')).toBe('/mnt/d/Jeux/StarMade');
    expect(normalizeHostPath('')).toBe('');
  });

  it('resolves nested StarMade roots and falls back safely', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-root-'));
    const nested = path.join(tmp, 'StarMade');
    fs.mkdirSync(path.join(nested, 'data', 'config'), { recursive: true });
    fs.writeFileSync(path.join(nested, 'data', 'config', 'BlockConfig.xml'), '<Config/>');

    expect(resolveStarmadeRoot(tmp)).toBe(nested);
    expect(resolveStarmadeRoot(nested)).toBe(nested);
    expect(resolveStarmadeRoot(path.join(tmp, 'missing'))).toBe(path.join(tmp, 'missing'));
    expect(existsHostPath(nested)).toBe(true);
    expect(existsHostPath(path.join(tmp, 'missing'))).toBe(false);
  });
});
