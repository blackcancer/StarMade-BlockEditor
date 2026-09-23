import { describe, expect, it } from 'vitest';
import { BLOCK_STYLES, EXTRA_PROPERTY_GROUPS, formatPropertyLabel, tooltipForExtraProperty } from './propertyOptions.js';
import { RESOURCE_INJECTION_OPTIONS, getResourceInjectionOptions, getIndSidesOptions, getBlockStyleName, localiseGroupTitle, tooltipForExtraPropertyL10n, labelForExtraPropertyL10n } from './propertyOptions.js';
import en from '../../i18n/en.js';
import fr from '../../i18n/fr.js';

describe('propertyOptions', () => {
  it('exposes expected editor option groups', () => {
    expect(BLOCK_STYLES).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(EXTRA_PROPERTY_GROUPS.some(group => group.title === 'Collision / Physical')).toBe(true);
    expect(EXTRA_PROPERTY_GROUPS.flatMap(group => group.keys)).toContain('Consistence');
  });

  it('uses the native FLORA resource injection value 17', () => {
    expect(RESOURCE_INJECTION_OPTIONS.find(option => option.label === 'Flora resource')?.value).toBe(17);
    expect(getResourceInjectionOptions(en).find(option => option.label === en.options.resourceInjection.flora)?.value).toBe(17);
    expect(tooltipForExtraProperty('ResourceInjection')).toContain('17 = flora');
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

  it('keeps numeric geometry choices stable while translating their labels', () => {
    expect(getIndSidesOptions(fr)).toEqual([
      { value: 1, label: fr.options.indSides.allSame },
      { value: 3, label: fr.options.indSides.grouped },
      { value: 6, label: fr.options.indSides.independent },
    ]);
    expect(BLOCK_STYLES.map(style => getBlockStyleName(style, en))).toEqual(['Cube', 'Wedge', 'Corner', 'Cross', 'Tetra', 'Penta', 'Cube (24 orientations)']);
    expect(getBlockStyleName(99, en)).toBe(en.blockStyle.style(99));
    expect(localiseGroupTitle('Chambers', fr)).toBe(fr.groupTitle.chambers);
    expect(localiseGroupTitle('Custom category', fr)).toBe('Custom category');
    expect(tooltipForExtraPropertyL10n('Consistence', fr)).toBe(fr.extraTooltip.Consistence);
    expect(tooltipForExtraPropertyL10n('CustomField', fr)).toBe(fr.extraTooltip._fallback('CustomField'));
  });

  it('localizes known field labels while retaining extension XML keys verbatim', () => {
    expect(labelForExtraPropertyL10n('Physical', fr)).toBe(fr.extraLabel.Physical);
    expect(labelForExtraPropertyL10n('#text', fr)).toBe(fr.advanced.value);
    expect(labelForExtraPropertyL10n('@_count', fr)).toBe(fr.advanced.count);
    expect(labelForExtraPropertyL10n('CustomExtension', fr)).toBe('CustomExtension');
    expect(labelForExtraPropertyL10n('constructor', fr)).toBe('constructor');
  });
});
