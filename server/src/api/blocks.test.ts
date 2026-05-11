import { describe, expect, it } from 'vitest';
import { collectExtraProperties, parseEffectArmor, serializeEffectArmor } from './blocks.js';

describe('block API XML helpers', () => {
  it('parses effect armor records defensively', () => {
    expect(parseEffectArmor({ EM: '1.5', HEAT: 2, BAD: 'nan', INF: 'Infinity' })).toEqual({ EM: 1.5, HEAT: 2 });
    expect(parseEffectArmor(null)).toEqual({});
    expect(parseEffectArmor('bad')).toEqual({});
  });

  it('serializes effect armor only when values are finite and present', () => {
    expect(serializeEffectArmor({ EM: 1, HEAT: Number.NaN, KIN: Infinity })).toEqual({ EM: 1 });
    expect(serializeEffectArmor({})).toBeUndefined();
    expect(serializeEffectArmor({ BAD: Number.NaN })).toBeUndefined();
  });

  it('collects only non-core XML properties into the extra bag', () => {
    const extra = collectExtraProperties({
      '@_type': 'HULL',
      '@_icon': '1',
      IndividualSides: '6',
      Description: 'Core field',
      CustomFoo: 'bar',
      Nested: { A: 1 },
    });
    expect(extra).toEqual({ CustomFoo: 'bar', Nested: { A: 1 } });
  });
});
