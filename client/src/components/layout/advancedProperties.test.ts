import { describe, expect, it } from 'vitest';
import {
  defaultCollisionShape,
  normalizeCollisionShape,
  normalizeElementList,
  normalizeResourceList,
  serializeElementList,
  serializeResourceList,
} from './advancedProperties.js';

describe('advanced property normalization', () => {
  it('normalizes and serializes Consistence resource entries', () => {
    const normalized = normalizeResourceList({ Item: [{ '#text': 'METAL_MESH', '@_count': '3' }, { '#text': 'CRYSTAL', '@_count': 2 }] });
    expect(normalized).toEqual([{ name: 'METAL_MESH', count: 3 }, { name: 'CRYSTAL', count: 2 }]);
    expect(serializeResourceList(normalized)).toEqual({
      Item: [{ '#text': 'METAL_MESH', '@_count': '3' }, { '#text': 'CRYSTAL', '@_count': '2' }],
    });
  });

  it('handles missing, scalar and malformed resource lists safely', () => {
    expect(normalizeResourceList(undefined)).toEqual([]);
    expect(normalizeResourceList('bad')).toEqual([]);
    expect(serializeResourceList([{ name: '', count: 99 }])).toBe('');
  });

  it('normalizes and serializes Element lists', () => {
    expect(normalizeElementList({ Element: 'A' })).toEqual(['A']);
    expect(normalizeElementList({ Element: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(serializeElementList(['A'])).toEqual({ Element: 'A' });
    expect(serializeElementList(['A', 'B', ''])).toEqual({ Element: ['A', 'B'] });
    expect(serializeElementList([])).toBe('');
  });

  it('normalizes collision shapes and creates safe defaults', () => {
    expect(normalizeCollisionShape({ '@_type': 'BlockType', StyleId: '2', '@_slab': '3' })).toMatchObject({ type: 'BlockType', styleId: 2, slab: 3 });
    expect(normalizeCollisionShape({ '@_type': 'ConvexHull', Mesh: 'foo.obj' })).toMatchObject({ type: 'ConvexHull', mesh: 'foo.obj' });
    expect(defaultCollisionShape('BlockType')).toEqual({ '@_type': 'BlockType', StyleId: 0, '@_slab': '0' });
    expect(defaultCollisionShape('ConvexHull')).toEqual({ '@_type': 'ConvexHull', Mesh: '' });
    expect(defaultCollisionShape('anything')).toEqual({ '@_type': 'None' });
  });
});
