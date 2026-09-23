import { describe, expect, it } from 'vitest';
import en from './en.js';
import fr from './fr.js';
import de from './de.js';
import es from './es.js';
import ru from './ru.js';
import ja from './ja.js';
import { localizeMessage, localizeWarning, technicalDetail } from './messages.js';

const messages = [
  ['The catalogue changed. Reload before saving.', 'conflict'],
  ['Please reload the catalogue before saving.', 'reload'],
  ['Configure a StarMade installation first.', 'configuration'],
  ['Unable to read or save editor configuration.', 'configRead'],
  ['Invalid block catalogue.', 'catalogue'],
  ['Failed to fetch', 'network'],
  ['This preview uses a fixed StarMade installation.', 'permission'],
  ['Invalid XML property name', 'invalidData'],
  ['Expected a PNG image.', 'image'],
  ['Build icon sheet not found for icon 42.', 'imageMissing'],
  ['No original icon backup exists.', 'iconBackup'],
  ['Native shaders are missing from this StarMade installation.', 'nativeShaders'],
  ['No native texture layers exist for this pack and resolution.', 'nativeTextures'],
  ['Invalid LOD XML.', 'nativeLod'],
  ['Native shader compilation failed.', 'shader'],
  ['WebGL context lost. Reload the preview.', 'context'],
  ['Icon export needs a 2D canvas.', 'capture'],
  ['Block not found.', 'notFound'],
  ['Cannot delete a vanilla block.', 'vanillaDelete'],
  ['No free custom block ID remains.', 'noIds'],
  ['Asset path resolves outside the installation.', 'unsafePath'],
] as const;

describe('localized user-facing diagnostics', () => {
  it.each(messages)('translates %s into a specific actionable cause', (source, key) => {
    for (const dictionary of [en, fr, de, es, ru, ja]) {
      expect(localizeMessage(source, dictionary)).toBe(dictionary.errors[key]);
      expect(technicalDetail(source, dictionary)).toBeNull();
    }
  });
  it('preserves technical identifiers, field names, dimensions and HTTP status in localized text', () => {
    expect(localizeMessage('HTTP 409 Conflict', fr)).toBe(fr.errors.conflict);
    expect(localizeMessage('WebGL 2 is required for the native renderer.', fr)).toBe(fr.viewer.webgl2Required);
    expect(localizeMessage('Missing LOD model: Grate_01', fr)).toBe('Impossible de charger le modèle natif Grate_01.');
    expect(localizeMessage('Could not load LOD model: Grate_01', fr)).toContain('Grate_01');
    expect(localizeMessage('Missing texture layer 7 in the selected installation.', fr)).toBe('La couche de textures 7 manque dans l’installation sélectionnée.');
    expect(localizeMessage('Texture animation at tile 255 crosses its atlas page.', fr)).toContain('tuile 255');
    expect(localizeMessage('Texture tile 1024 is outside the native StarMade atlas.', fr)).toBe('La tuile de texture 1024 est hors de l’atlas natif StarMade.');
    expect(localizeMessage('Asset request failed: HTTP 503', fr)).toContain('HTTP 503');
    expect(localizeMessage('hp must be numeric', fr)).toBe('hp doit être un nombre fini.');
    expect(localizeMessage('effectArmor must contain finite numbers', fr)).toBe('effectArmor doit être un nombre fini.');
    expect(localizeMessage('name must be text', fr)).toBe('name doit contenir du texte.');
    expect(localizeMessage('animated must be boolean', fr)).toBe('animated doit être activé ou désactivé.');
    expect(localizeMessage('textureId must be a bounded array', fr)).toContain('textureId');
    expect(localizeMessage('Invalid hp value', fr)).toContain('hp');
    expect(localizeMessage('Invalid custom atlas size. Expected 1024×1024px.', fr)).toBe('Dimensions d’image attendues : 1024×1024px.');
  });
  it('unwraps transport diagnostics but retains unknown technical details separately', () => {
    expect(localizeMessage('Error: {"error":"Native shader compilation failed."}', fr)).toBe(fr.errors.shader);
    for (const source of ['disk device X failed', '{bad JSON', '{}', '{"error":17}']) {
      expect(localizeMessage(source, fr)).toBe(fr.errors.unknown);
      expect(technicalDetail(source, fr)).toBe(source);
    }
    expect(technicalDetail('  ', fr)).toBeNull();
    expect(localizeMessage('Error: Native shader compilation failed.', fr)).toBe(fr.errors.shader);
  });
  it('translates every native resource warning without losing its layer number', () => {
    const scenarios = [
      ['Texture layer 2 is missing.', 'missingLayer', '2'],
      ['Native normal material layer 3 is missing.', 'missingNormal', '3'],
      ['Native normal layer 7 has no alpha channel; material alpha is set to zero.', 'normalAlpha', '7'],
    ] as const;
    for (const dictionary of [en, fr, de, es, ru, ja]) {
      for (const [message, key, value] of scenarios) expect(localizeWarning(message, dictionary)).toBe(dictionary.warnings[key](value));
      expect(localizeWarning('Native overlay texture is missing.', dictionary)).toBe(dictionary.warnings.overlay);
      expect(localizeWarning('Native LOD model declarations are missing.', dictionary)).toBe(dictionary.warnings.lod);
      expect(localizeWarning('Future warning detail', dictionary)).toBe(dictionary.warnings.unknown);
    }
  });
});
