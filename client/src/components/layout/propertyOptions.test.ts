import { describe, expect, it } from 'vitest';
import { BLOCK_STYLES, EXTRA_PROPERTY_GROUPS, formatPropertyLabel, tooltipForExtraProperty } from './propertyOptions.js';

describe('propertyOptions', () => {
  it('exposes expected editor option groups', () => {
    expect(BLOCK_STYLES).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(EXTRA_PROPERTY_GROUPS.some(group => group.title === 'Collision / Physical')).toBe(true);
    expect(EXTRA_PROPERTY_GROUPS.flatMap(group => group.keys)).toContain('Consistence');
  });

  it('formats XML-ish property labels for the UI', () => {
    expect(formatPropertyLabel('@_type')).toBe('type');
    expect(formatPropertyLabel('#text')).toBe('Value');
    expect(formatPropertyLabel('@_count')).toBe('Count');
    expect(formatPropertyLabel('LodShapeSwitchStyleActive')).toBe('Lod Shape Switch Style Active');
    expect(formatPropertyLabel('CUSTOM_VALUE')).toBe('CUSTOM VALUE');
  });

  it('returns curated tooltips and safe fallback text', () => {
    expect(tooltipForExtraProperty('Consistence')).toContain('Crafting');
    expect(tooltipForExtraProperty('MyCustomField')).toContain('My Custom Field from BlockConfig.xml');
  });
});
