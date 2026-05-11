import { describe, expect, it } from 'vitest';
import { displayBlockName, prettifyTypeName } from './blockDisplay.js';

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
});
