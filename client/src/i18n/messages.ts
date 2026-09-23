/** @fileoverview Localized diagnostics with actionable causes and optional original technical details. */
import type { Translations } from './en.js';

type MessageRule = readonly [RegExp, (match: RegExpMatchArray, t: Translations) => string];
const rules: MessageRule[] = [
  [/(?:catalogue|file).*changed|HTTP 409/i, (_match, t) => t.errors.conflict],
  [/reload.*(?:catalogue|If-Match)|Catalogue revision missing/i, (_match, t) => t.errors.reload],
  [/Configure a StarMade|Choose a StarMade|configured StarMade installation does not exist/i, (_match, t) => t.errors.configuration],
  [/Unable to read or save editor configuration|SMToolConfig\.json/, (_match, t) => t.errors.configRead],
  [/Invalid block catalogue|Unable to read or save block definitions|Invalid BlockConfig XML|Custom block identity/, (_match, t) => t.errors.catalogue],
  [/Failed to fetch|NetworkError|Network request failed|fetch failed|Load failed|ECONNREFUSED/i, (_match, t) => t.errors.network],
  [/not permitted|fixed StarMade installation|private preview link|not authorized|forbidden/i, (_match, t) => t.errors.permission],
  [/Texture tile (\d+) is outside the native StarMade atlas/, (match, t) => t.errors.textureTile(match[1])],
  [/(?:path|file|directory).*outside|symbolic link|leaves the allowed|Invalid asset path/i, (_match, t) => t.errors.unsafePath],
  [/No original icon backup/, (_match, t) => t.errors.iconBackup],
  [/(?:dimensions: expected|size\. Expected)\s*(\d+×\d+px)/i, (match, t) => t.errors.imageDimensions(match[1])],
  [/Build icon sheet not found|requested native image is missing/, (_match, t) => t.errors.imageMissing],
  [/Native shaders are missing/, (_match, t) => t.errors.nativeShaders],
  [/No native texture layers|No .*texture pages found|No .*atlas pages found/, (_match, t) => t.errors.nativeTextures],
  [/^(?:Missing LOD model|Could not load LOD model): (.+)$/, (match, t) => t.errors.missingModel(match[1])],
  [/Missing texture layer (\d+)/, (match, t) => t.errors.missingLayer(match[1])],
  [/Texture animation at tile (\d+)/, (match, t) => t.errors.animationTile(match[1])],
  [/Invalid (?:LOD|mainConfig\.xml)|Unsupported LOD|LOD assets? (?:is|are) missing/, (_match, t) => t.errors.nativeLod],
  [/Native shader compilation failed/, (_match, t) => t.errors.shader],
  [/WebGL 2 is required for the native renderer\./, (_match, t) => t.viewer.webgl2Required],
  [/WebGL context lost/, (_match, t) => t.errors.context],
  [/^Icon export|^Native icon capture/, (_match, t) => t.errors.capture],
  [/Block not found/, (_match, t) => t.errors.notFound],
  [/Cannot delete a vanilla block/, (_match, t) => t.errors.vanillaDelete],
  [/No free custom block ID/, (_match, t) => t.errors.noIds],
  [/HTTP (\d{3})/, (match, t) => t.errors.http(match[1])],
  [/^(\w+) must be numeric|^(\w+) must contain finite numbers/, (match, t) => t.errors.numberValue(match[1] || match[2])],
  [/^(\w+) must be text/, (match, t) => t.errors.textValue(match[1])],
  [/^(\w+) must be boolean/, (match, t) => t.errors.booleanValue(match[1])],
  [/^(\w+) must be a bounded array/, (match, t) => t.errors.invalidValue(match[1])],
  [/^(?:Invalid|Unknown block field:|Unknown configuration field:) (\w+)(?: (?:length|value))?\.?$/, (match, t) => t.errors.invalidValue(match[1])],
  [/Invalid XML property name|Invalid XML text|Invalid XML property value|Reserved XML property name|Invalid face grouping/, (_match, t) => t.errors.invalidData],
  [/Expected a PNG|Invalid TGA|Native (?:image|archive)|Image replacement|Missing image payload|Input buffer/, (_match, t) => t.errors.image],
];

/** Unwrap an Error prefix and the JSON error body returned by image endpoints. */
function clean(message: string): string {
  const text = message.trim().replace(/^Error:\s*/, '');
  if (text.startsWith('{')) {
    try { const parsed = JSON.parse(text); if (typeof parsed.error === 'string') return parsed.error; }
    catch { /* Preserve malformed upstream diagnostics for the optional detail panel. */ }
  }
  return text;
}

function translated(message: string, t: Translations): string | null {
  for (const [pattern, render] of rules) {
    const match = message.match(pattern);
    if (match) return render(match, t);
  }
  return null;
}

/** Translate known API/render failures without exposing an English sentence as the primary message. */
export function localizeMessage(message: string, t: Translations): string {
  return translated(clean(message), t) ?? t.errors.unknown;
}

/** Keep unrecognized diagnostics available in an optional, explicitly labeled technical detail panel. */
export function technicalDetail(message: string, t: Translations): string | null {
  const text = clean(message);
  return text && translated(text, t) === null ? text : null;
}

/** Translate the complete native manifest warning vocabulary, retaining referenced layer numbers. */
export function localizeWarning(message: string, t: Translations): string {
  let match = message.match(/^Texture layer (\d+) is missing\.$/);
  if (match) return t.warnings.missingLayer(match[1]);
  match = message.match(/^Native normal material layer (\d+) is missing\.$/);
  if (match) return t.warnings.missingNormal(match[1]);
  match = message.match(/^Native normal layer (\d+) has no alpha channel; material alpha is set to zero\.$/);
  if (match) return t.warnings.normalAlpha(match[1]);
  if (message === 'Native overlay texture is missing.') return t.warnings.overlay;
  if (message === 'Native LOD model declarations are missing.') return t.warnings.lod;
  return t.warnings.unknown;
}
