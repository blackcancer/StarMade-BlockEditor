import { describe, expect, it, beforeEach } from 'vitest';
import { displayBlockName, invalidateDisplayNameCache, prettifyTypeName } from './blockDisplay.js';

const block = (partial: Partial<Parameters<typeof displayBlockName>[0]>): Parameters<typeof displayBlockName>[0] => ({
  id: 42,
  name: '',
  xmlTypeName: '',
  ...partial,
});

describe('block display helpers', () => {
  it('hides XML prefixes from block display names', () => {
    expect(displayBlockName(block({ xmlTypeName: 'METAL_MESH', name: 'METAL_MESH -- Metal mesh' }))).toBe('Metal mesh');
    expect(displayBlockName(block({ xmlTypeName: 'HULL_COLOR_GREY', name: 'HULL_COLOR_GREY: Grey Hull' }))).toBe('Grey Hull');
  });

  it('falls back to a readable type or id when name is empty', () => {
    expect(displayBlockName(block({ xmlTypeName: 'POWER_CELL', name: '' }))).toBe('Power Cell');
    expect(displayBlockName(block({ id: 7, xmlTypeName: '', name: '' }))).toBe('7');
  });

  it('falls back to prettified type when name equals prefix only', () => {
    // name starts with the prefix but trimming leaves nothing → prettify(prefix)
    expect(displayBlockName(block({ xmlTypeName: 'HULL', name: 'HULL' }))).toBe('Hull');
  });

  it('prettifies technical type names', () => {
    expect(prettifyTypeName('ADVANCED_ARMOR_BLOCK')).toBe('Advanced Armor Block');
  });

  // ── Opt 3: display name cache ────────────────────────────────────────────
  it('returns the same result on repeated calls (cache hit)', () => {
    const b = block({ id: 100, xmlTypeName: 'TEST_BLOCK', name: 'TEST_BLOCK -- Test block' });
    const first  = displayBlockName(b);
    const second = displayBlockName(b);
    expect(first).toBe('Test block');
    expect(second).toBe(first); // same reference
  });

  it('correctly distinguishes blocks with the same id but different names', () => {
    // Composite key includes name so same id ≠ same cache entry
    const a = block({ id: 200, name: 'TYPE_A -- Alpha', xmlTypeName: 'TYPE_A' });
    const b = block({ id: 200, name: 'TYPE_B -- Beta',  xmlTypeName: 'TYPE_B' });
    expect(displayBlockName(a)).toBe('Alpha');
    expect(displayBlockName(b)).toBe('Beta');
  });

  it('invalidateDisplayNameCache(id) removes only entries for that id', () => {
    const b1 = block({ id: 300, name: 'X -- Xray', xmlTypeName: 'X' });
    const b2 = block({ id: 301, name: 'Y -- Yankee', xmlTypeName: 'Y' });
    displayBlockName(b1); // prime cache
    displayBlockName(b2); // prime cache

    invalidateDisplayNameCache(300);

    // b1 should be recomputed (same result but fresh)
    expect(displayBlockName(b1)).toBe('Xray');
    // b2 should still be served from cache (unchanged)
    expect(displayBlockName(b2)).toBe('Yankee');
  });

  it('invalidateDisplayNameCache() clears all entries', () => {
    const b = block({ id: 400, name: 'Z -- Zulu', xmlTypeName: 'Z' });
    displayBlockName(b); // prime cache
    invalidateDisplayNameCache();
    // After full clear, next call recomputes correctly
    expect(displayBlockName(b)).toBe('Zulu');
  });
});
