/** @fileoverview Serves an installation-owned native rendering manifest and confined StarMade assets. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { AssetError, assetStamp, confinedPath, installationRoot, listAssetFiles } from '../assets/assetPaths.js';
import { atlasSources, overlaySource } from '../assets/textureSources.js';
import { hasNativeAlpha, readNativePng, type NativeImage } from '../assets/nativeImage.js';
import { parseMapKind, parsePack, parseSize } from './textures.js';

const BASE = '/api/render-assets';
const ALLOWED_LOD = /\.(scene|material|mesh\.xml|png|jpe?g)$/i;

function shaderFiles(root: string): { directory: string; files: string[] } {
  const directory = confinedPath(root, 'data/shader');
  const files = listAssetFiles(directory);
  if (!files.length) throw new AssetError('Native shaders are missing from this StarMade installation.', 503);
  return { directory, files };
}

function lodDefinitions(root: string): Array<{ name: string; filename: string; relpath: string }> {
  const file = confinedPath(root, 'data/config/mainConfig.xml');
  if (!fs.existsSync(file)) return [];
  const xml = fs.readFileSync(file, 'utf8');
  if (XMLValidator.validate(xml) !== true) throw new AssetError('Invalid mainConfig.xml.');
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const lod = parsed.Model?.LOD ?? parsed.Config?.LOD;
  if (!lod || typeof lod !== 'object') return [];
  const definitions: Array<{ name: string; filename: string; relpath: string }> = [];
  for (const [name, entries] of Object.entries(lod)) {
    if (name.startsWith('@_')) continue;
    for (const entry of Array.isArray(entries) ? entries : [entries]) {
      if (typeof entry !== 'object' || entry === null) throw new AssetError('Invalid LOD declaration.');
      const filename = entry['@_filename'];
      const declaredPath = entry['@_relpath'];
      if (typeof filename !== 'string' || typeof declaredPath !== 'string') throw new AssetError('Invalid LOD declaration.');
      const relpath = declaredPath.replace(/^\/+|\/+$/g, '');
      confinedPath(root, `data/models/lod/${relpath}/${filename}.scene`);
      definitions.push({ name, filename, relpath });
    }
  }
  return definitions;
}

/** Prevent dependency URLs in native model documents from escaping the served LOD tree. */
function validateLodReferences(root: string, requested: string, bytes: Buffer): void {
  const references: string[] = [];
  if (requested.endsWith('.material')) {
    for (const match of bytes.toString('utf8').matchAll(/^\s*texture\s+(\S+)/gm)) references.push(match[1]);
  } else {
    const xml = bytes.toString('utf8');
    if (XMLValidator.validate(xml) !== true) throw new AssetError('Invalid LOD XML.');
    function visit(value: unknown, tag: string): void {
      if (value === null || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(entry => visit(entry, tag)); return; }
      for (const [key, entry] of Object.entries(value)) {
        if (key === '@_meshFile' || tag === 'skeletonlink' && key === '@_name') references.push(String(entry));
        else visit(entry, key);
      }
    }
    visit(new XMLParser({ ignoreAttributes: false }).parse(xml), '');
  }
  for (const reference of references) {
    let decoded: string;
    try { decoded = decodeURIComponent(reference); }
    catch { throw new AssetError('Invalid LOD asset reference.'); }
    const prefix = `${BASE}/lod/`;
    const base = new URL(`${prefix}${path.posix.dirname(requested)}/`, 'http://starmade.invalid');
    const target = new URL(decoded, base);
    if (target.origin !== base.origin || !target.pathname.startsWith(prefix) || target.search || target.hash) throw new AssetError('LOD asset reference leaves the allowed resource scope.');
    confinedPath(root, decodeURIComponent(target.pathname.slice(prefix.length)));
  }
}

function query(req: Request): { size: 64 | 128 | 256; pack: string } {
  return { size: parseSize(req.query.size), pack: parsePack(req.query.pack) };
}

async function manifest(req: Request) {
  const root = installationRoot();
  const { size, pack } = query(req);
  const shader = shaderFiles(root);
  const diffuse = atlasSources(root, size, pack, 'diffuse');
  const normals = atlasSources(root, size, pack, 'normal');
  if (!diffuse.some(Boolean)) throw new AssetError('No native texture layers exist for this pack and resolution.', 404);
  const overlay = overlaySource(root, size, pack);
  const lodModels = lodDefinitions(root);
  const lodRoot = confinedPath(root, 'data/models/lod');
  const stamps = [root, pack, String(size), assetStamp(confinedPath(root, 'data/config/mainConfig.xml'))];
  for (const file of shader.files) stamps.push(assetStamp(confinedPath(shader.directory, file)));
  for (const source of [...diffuse, ...normals, overlay]) if (source) stamps.push(assetStamp(source.path));
  for (const file of listAssetFiles(lodRoot)) stamps.push(assetStamp(confinedPath(lodRoot, file)));
  const revision = createHash('sha256').update(stamps.join('\n')).digest('hex');
  const params = new URLSearchParams({ size: String(size), pack, revision });
  const warnings: string[] = [];
  const layers: Array<{ layer: number; url: string; normalUrl?: string }> = [];
  for (const layer of [0, 1, 2, 3, 7]) {
    if (!diffuse[layer]) {
      if (layer !== 7) warnings.push(`Texture layer ${layer} is missing.`);
      continue;
    }
    const entry: { layer: number; url: string; normalUrl?: string } = { layer, url: `${BASE}/layers/${layer}.png?${params}&map=diffuse` };
    if (normals[layer]) {
      entry.normalUrl = `${BASE}/layers/${layer}.png?${params}&map=normal`;
      if (!await hasNativeAlpha(normals[layer])) warnings.push(`Native normal layer ${layer} has no alpha channel; material alpha is set to zero.`);
    }
    else warnings.push(`Native normal material layer ${layer} is missing.`);
    layers.push(entry);
  }
  if (!overlay) warnings.push('Native overlay texture is missing.');
  if (!lodModels.length) warnings.push('Native LOD model declarations are missing.');
  return {
    revision, shadersUrl: `${BASE}/shaders.json?revision=${revision}`, layers,
    ...(overlay ? { overlayUrl: `${BASE}/overlay.png?${params}` } : {}),
    lodModels, lodBaseUrl: `${BASE}/lod`, warnings,
  };
}

function route(handler: (req: Request, res: Response) => unknown) {
  return async (req: Request, res: Response): Promise<void> => {
    try { res.setHeader('Cache-Control', 'no-store'); await handler(req, res); }
    catch (error) { res.status(error instanceof AssetError ? error.status : 500).json({ error: (error as Error).message }); }
  };
}

async function imageResponse(source: NativeImage | null, res: Response): Promise<void> {
  if (!source) throw new AssetError('The requested native image is missing.', 404);
  res.type('png').send(await readNativePng(source));
}

/** Native rendering routes; the application mounts this router at /api/render-assets. */
export const assetsRouter = Router();
assetsRouter.get('/manifest', route(async (req, res) => res.json(await manifest(req))));
assetsRouter.get('/shaders.json', route((_req, res) => {
  const { directory, files } = shaderFiles(installationRoot());
  res.json(Object.fromEntries(files.map(file => [`data/shader/${file}`, fs.readFileSync(confinedPath(directory, file), 'utf8')])));
}));
assetsRouter.get('/layers/:layer.png', route(async (req, res) => {
  const layer = Number(req.params.layer);
  if (![0, 1, 2, 3, 7].includes(layer)) throw new AssetError('Invalid native texture layer.');
  const { size, pack } = query(req);
  await imageResponse(atlasSources(installationRoot(), size, pack, parseMapKind(req.query.map))[layer], res);
}));
assetsRouter.get('/overlay.png', route(async (req, res) => {
  const { size, pack } = query(req);
  await imageResponse(overlaySource(installationRoot(), size, pack), res);
}));
assetsRouter.get('/lod/*', route((req, res) => {
  const requested = req.params[0];
  if (!ALLOWED_LOD.test(requested)) throw new AssetError('Unsupported LOD asset type.');
  const lodRoot = confinedPath(installationRoot(), 'data/models/lod');
  if (!fs.existsSync(lodRoot)) throw new AssetError('LOD assets are missing.', 404);
  const file = confinedPath(lodRoot, requested);
  if (!fs.existsSync(file)) throw new AssetError('LOD asset is missing.', 404);
  const extension = path.extname(file).toLowerCase();
  const bytes = fs.readFileSync(file);
  if (['.scene', '.xml', '.material'].includes(extension)) validateLodReferences(lodRoot, requested, bytes);
  res.type(extension === '.scene' ? 'xml' : extension === '.material' ? 'text' : extension).send(bytes);
}));

// Only these installation-owned resources are exposed; arbitrary display paths are not accepted.
assetsRouter.get('/display/:kind', route((req, res) => {
  const kind = req.params.kind;
  if (kind !== 'font' && kind !== 'screen') throw new AssetError('Unknown Display resource.', 404);
  const file = confinedPath(installationRoot(), kind === 'font'
    ? 'data/font/Monda-Regular.ttf' : 'data/image-resource/screen-gui-blue.png');
  if (!fs.existsSync(file)) throw new AssetError('Native Display resource is missing.', 404);
  res.type(kind === 'font' ? 'font/ttf' : 'png').send(fs.readFileSync(file));
}));
