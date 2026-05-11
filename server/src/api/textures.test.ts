import { describe, expect, it } from 'vitest';
import { parseMapKind, parsePack, parseSize } from './textures.js';

describe('texture API parsing helpers', () => {
  it('accepts only valid StarMade texture sizes', () => {
    expect(parseSize('64')).toBe(64);
    expect(parseSize('128')).toBe(128);
    expect(parseSize('256')).toBe(256);
    expect(parseSize('512')).toBe(256);
    expect(parseSize('bad')).toBe(256);
  });

  it('sanitizes texture pack names to avoid path traversal', () => {
    expect(parsePack('Default')).toBe('Default');
    expect(parsePack('..\\evil/pack')).toBe('..evilpack');
    expect(parsePack('')).toBe('Default');
  });

  it('normalizes map kind values', () => {
    expect(parseMapKind('normal')).toBe('normal');
    expect(parseMapKind('NORMAL')).toBe('normal');
    expect(parseMapKind('diffuse')).toBe('diffuse');
    expect(parseMapKind('anything')).toBe('diffuse');
  });
});
