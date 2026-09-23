import { describe, expect, it } from 'vitest';
import en from './en.js';
import fr from './fr.js';
import de from './de.js';
import es from './es.js';
import ru from './ru.js';
import ja from './ja.js';

const dictionaries = { en, fr, de, es, ru, ja };
function leaves(value: object, prefix = ''): Record<string, string | ((...args: never[]) => string)> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return typeof entry === 'object' ? Object.entries(leaves(entry, name)) : [[name, entry]];
  }));
}
const formatters: Record<string, { args: unknown[]; contains: string[] }> = {
  'errors.invalidValue': { args: ['hp'], contains: ['hp'] },
  'errors.numberValue': { args: ['hp'], contains: ['hp'] },
  'errors.textValue': { args: ['name'], contains: ['name'] },
  'errors.booleanValue': { args: ['animated'], contains: ['animated'] },
  'errors.imageDimensions': { args: ['1024×1024px'], contains: ['1024×1024px'] },
  'errors.animationTile': { args: ['255'], contains: ['255'] },
  'errors.textureTile': { args: ['1024'], contains: ['1024'] },
  'errors.missingLayer': { args: ['7'], contains: ['7'] },
  'errors.missingModel': { args: ['Grate_01'], contains: ['Grate_01'] },
  'errors.http': { args: ['503'], contains: ['503'] },
  'warnings.missingLayer': { args: ['2'], contains: ['2'] },
  'warnings.missingNormal': { args: ['3'], contains: ['3'] },
  'warnings.normalAlpha': { args: ['7'], contains: ['7'] },
  'app.dirValid': { args: ['Nebula'], contains: ['✓', 'Nebula'] },
  'app.blockCount': { args: [37], contains: ['37'] },
  'sidebar.filterVanilla': { args: [23], contains: ['23'] },
  'sidebar.filterCustom': { args: [17], contains: ['17'] },
  'sidebar.footer': { args: [23, 17], contains: ['23', '17'] },
  'viewer.nativeError': { args: ['missing-map'], contains: ['missing-map'] },
  'viewer.nativeWarnings': { args: ['missing-alpha'], contains: ['missing-alpha'] },
  'viewer.styleBadge': { args: ['ShapeLabel', 6], contains: ['ShapeLabel', '6'] },
  'viewer.orientOption': { args: [23], contains: ['23'] },
  'viewer.toggleTooltip': { args: ['StateLabel', 'ON'], contains: ['StateLabel', 'ON'] },
  'atlasPicker.importAtlasDesc': { args: [1024, 16, 8], contains: ['1024×1024', '16×8'] },
  'atlasPicker.errorImportAtlas': { args: [new Error('atlas-offline')], contains: ['atlas-offline'] },
  'atlasPicker.errorImportTile': { args: ['tile-offline'], contains: ['tile-offline'] },
  'properties.deleteTooltip': { args: ['Nebula'], contains: ['BlockConfigImport.xml'] },
  'properties.deleteConfirm': { args: ['Nebula'], contains: ['Nebula'] },
  'properties.errorImportIcon': { args: ['icon-offline'], contains: ['icon-offline'] },
  'advanced.searchPlaceholder': { args: [37], contains: ['37'] },
  'advanced.noMatch': { args: ['Quantum'], contains: ['Quantum'] },
  'blockStyle.style': { args: [6], contains: ['6'] },
  'extraTooltip._fallback': { args: ['UnknownExtension'], contains: ['UnknownExtension', 'BlockConfig.xml'] },
};

describe('complete locale contracts', () => {
  it.each(Object.entries(dictionaries))('%s has the complete English key schema and preserves every formatter parameter', (_code, dictionary) => {
    const reference = leaves(en);
    const entries = leaves(dictionary);
    expect(Object.keys(entries).sort()).toEqual(Object.keys(reference).sort());
    const functions: string[] = [];
    for (const [key, value] of Object.entries(entries)) {
      expect(typeof value, key).toBe(typeof reference[key]);
      if (typeof value === 'string') expect(value.trim().length, key).toBeGreaterThan(0);
      else {
        functions.push(key);
        const scenario = formatters[key];
        expect(scenario, key).toBeDefined();
        const result = value(...scenario.args as never[]);
        for (const token of scenario.contains) expect(result, key).toContain(token);
      }
    }
    expect(functions.sort()).toEqual(Object.keys(formatters).sort());
    expect(dictionary.app.subtitle).toBe('v1.1.1');
    expect(dictionary.viewer.activePreviewTooltip).toContain('LOD');
    expect(dictionary.faceSelector.hintAnimated).toContain('StarMade');
    expect(dictionary.flag.animated.tooltip).toContain('StarMade');
    expect(dictionary.extraTooltip.ResourceInjection).toContain('17 =');
  });

  it('uses singular and plural block/property forms in each supported language', () => {
    expect(en.advanced.searchPlaceholder(1)).toBe('Search 1 property…');
    expect(en.app.blockCount(1)).toBe('1 block'); expect(en.app.blockCount(0)).toBe('0 blocks'); expect(en.app.blockCount(2)).toBe('2 blocks');
    expect(fr.app.blockCount(1)).toBe('1 bloc'); expect(fr.app.blockCount(2)).toBe('2 blocs');
    expect(de.app.blockCount(1)).toBe('1 Block'); expect(de.app.blockCount(2)).toBe('2 Blöcke');
    expect(es.app.blockCount(1)).toBe('1 bloque'); expect(es.app.blockCount(2)).toBe('2 bloques');
    expect(ja.app.blockCount(1)).toBe('1 個のブロック'); expect(ja.app.blockCount(2)).toBe('2 個のブロック');
    expect(fr.advanced.searchPlaceholder(1)).toContain('1 propriété…'); expect(fr.advanced.searchPlaceholder(2)).toContain('2 propriétés…');
    expect(de.advanced.searchPlaceholder(1)).toContain('1 Eigenschaft '); expect(de.advanced.searchPlaceholder(2)).toContain('2 Eigenschaften ');
    expect(es.advanced.searchPlaceholder(1)).toContain('1 propiedad…'); expect(es.advanced.searchPlaceholder(2)).toContain('2 propiedades…');
    for (const [count, blocks, properties] of [[0, 'блоков', 'свойств'], [1, 'блок', 'свойство'], [2, 'блока', 'свойства'], [4, 'блока', 'свойства'], [5, 'блоков', 'свойств'], [11, 'блоков', 'свойств'], [12, 'блоков', 'свойств'], [21, 'блок', 'свойство'], [22, 'блока', 'свойства'], [114, 'блоков', 'свойств']] as const) {
      expect(ru.app.blockCount(count)).toBe(`${count} ${blocks}`);
      expect(ru.advanced.searchPlaceholder(count)).toBe(`Поиск среди ${count} ${properties}…`);
    }
  });

  it('labels native style 6 as a cube with 24 orientations in every language', () => {
    expect([en, fr, de, es, ru, ja].map(t => t.blockStyle.hepta)).toEqual([
      'Cube (24 orientations)', 'Cube (24 orientations)', 'Würfel (24 Ausrichtungen)',
      'Cubo (24 orientaciones)', 'Куб (24 ориентации)', '立方体（24方向）',
    ]);
  });

  it('translates mobile navigation, accessible modal controls and active states in all six languages', () => {
    expect([en, fr, de, es, ru, ja].map(t => [t.mobile.blocks, t.mobile.preview, t.mobile.properties])).toEqual([
      ['Blocks', 'Preview', 'Properties'], ['Blocs', 'Aperçu', 'Propriétés'], ['Blöcke', 'Vorschau', 'Eigenschaften'],
      ['Bloques', 'Vista previa', 'Propiedades'], ['Блоки', 'Просмотр', 'Свойства'], ['ブロック', 'プレビュー', 'プロパティ'],
    ]);
    expect([en, fr, de, es, ru, ja].map(t => t.iconPicker.closeLabel)).toEqual(['Close', 'Fermer', 'Schließen', 'Cerrar', 'Закрыть', '閉じる']);
    expect(fr.viewer.previewOn).toBe('ACTIF'); expect(es.viewer.previewOff).toBe('INACTIVO'); expect(ja.viewer.previewOn).toBe('有効');
    expect(fr.options.indSides.grouped).toBe('Faces groupées : dessus · dessous · quatre côtés communs');
    expect(fr.extraLabel.Physical).toBe('Collision physique');
    expect(fr.errors.conflict).toContain('Recharger et Annuler');
  });
});
