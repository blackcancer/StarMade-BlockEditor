/**
 * @fileoverview Block definitions API router.
 *
 * Reads StarMade block definitions from:
 *  - data/config/BlockConfig.xml
 *  - data/config/BlockTypes.properties
 *  - customBlockConfig/BlockConfigImport.xml
 *
 * The vanilla XML uses symbolic block type names in `@_type` (for example `GREY_HULL`).
 * Numeric block IDs are resolved through `BlockTypes.properties`.
 *
 * Writes are limited to `customBlockConfig/BlockConfigImport.xml`.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { resolveStarmadeRoot } from '../utils/path.js';

export interface BlockDef {
  id:               number;
  name:             string;
  icon:             number;
  textureId:        number[];
  xmlTypeName:      string;
  hp:               number;
  mass:             number;
  volume:           number;
  price:            number;
  description:      string;
  armor:            number;
  isPlacable:       boolean;
  inShop:           boolean;
  hasOrientation:   boolean;
  canActivate:      boolean;
  isDeprecated:     boolean;
  blockStyle:       number;
  slabIds:          number[];
  styleIds:         number[];
  computerReference:number;
  lightSource:      boolean;
  lightSourceColor: number[];
  transparency:     boolean;
  door:             boolean;
  logicBlock:       boolean;
  individualSides:  number;
  sideTexturesPointToOrientation: boolean;
  hasActivationTexture: boolean;
  extendedTexture4x4: boolean;
  onlyDrawnInBuildMode: boolean;
  lodShapeFromFar: number;
  animated:         boolean;
  isCustom:         boolean;
}

const PARSER = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  parseTagValue:       true,
  trimValues:          true,
  isArray:             (name) => ['Block'].includes(name),
});

const BUILDER = new XMLBuilder({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  format:              true,
  indentBy:            '  ',
});

const blockCache: {
  dir: string;
  typeIdsMtime: number;
  typeIds: Map<string, number> | null;
  vanillaMtime: number;
  customMtime: number;
  blocks: BlockDef[] | null;
} = {
  dir: '',
  typeIdsMtime: -1,
  typeIds: null,
  vanillaMtime: -1,
  customMtime: -1,
  blocks: null,
};

function fileMtimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return -1;
  }
}

function invalidateBlockCache(): void {
  blockCache.blocks = null;
  blockCache.vanillaMtime = -1;
  blockCache.customMtime = -1;
}

function getStarmadeDir(): string {
  const cfgPath = path.resolve(process.cwd(), 'SMToolConfig.json');
  if (!fs.existsSync(cfgPath)) throw new Error('SMToolConfig.json not found. Configure starmadeDir first.');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { starmadeDir?: string };
  if (!cfg.starmadeDir) throw new Error('starmadeDir is not set in SMToolConfig.json.');
  return resolveStarmadeRoot(cfg.starmadeDir);
}

function parseBool(v: unknown, def = false): boolean {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  return String(v).trim().toLowerCase() === 'true';
}

function parseIntList(v: unknown): number[] {
  if (!v || String(v).trim() === '') return [];
  return String(v).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

function parseLightColor(v: unknown): number[] {
  if (!v || String(v).trim() === '') return [1, 1, 1, 1];
  const values = String(v).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  while (values.length < 4) values.push(values.length === 3 ? 1 : 0);
  return values.slice(0, 4);
}

function loadTypeIds(dir: string): Map<string, number> {
  const filePath = path.join(dir, 'data', 'config', 'BlockTypes.properties');
  const mtime = fileMtimeMs(filePath);
  if (blockCache.dir === dir && blockCache.typeIds && blockCache.typeIdsMtime === mtime) {
    return blockCache.typeIds;
  }

  const map = new Map<string, number>();
  if (mtime < 0) return map;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const name = t.slice(0, eq).trim();
    const id   = parseInt(t.slice(eq + 1).trim(), 10);
    if (name && !isNaN(id)) map.set(name, id);
  }

  blockCache.dir = dir;
  blockCache.typeIdsMtime = mtime;
  blockCache.typeIds = map;
  return map;
}

function resolveBlockId(rawType: unknown, typeIds: Map<string, number>): number {
  const value = String(rawType ?? '').trim();
  const parsed = parseInt(value, 10);
  if (!isNaN(parsed) && parsed > 0 && String(parsed) === value) return parsed;
  return typeIds.get(value) ?? 0;
}

function collectBlockNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) collectBlockNodes(item, out);
    return;
  }

  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.Block)) {
    for (const block of obj.Block) {
      if (block && typeof block === 'object') out.push(block as Record<string, unknown>);
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('@_') || key === 'Block') continue;
    collectBlockNodes(value, out);
  }
}

function parseBlock(node: Record<string, unknown>, typeIds: Map<string, number>, isCustom: boolean): BlockDef | null {
  const rawType = node['@_type'];
  const id = resolveBlockId(rawType, typeIds);
  if (id <= 0) return null;

  return {
    id,
    name:              String(node['@_name'] ?? ''),
    icon:              parseInt(String(node['@_icon'] ?? '0'), 10) || 0,
    textureId:         parseIntList(node['@_textureId']),
    xmlTypeName:       String(rawType ?? id),
    hp:                parseInt(String(node.Hitpoints ?? '0'), 10) || 0,
    mass:              parseFloat(String(node.Mass ?? '0')) || 0,
    volume:            parseFloat(String(node.Volume ?? '0')) || 0,
    price:             parseInt(String(node.Price ?? '0'), 10) || 0,
    description:       String(node.Description ?? ''),
    armor:             parseFloat(String(node.ArmorValue ?? '0')) || 0,
    isPlacable:        parseBool(node.Placable, true),
    inShop:            parseBool(node.InShop, true),
    hasOrientation:    parseBool(node.Orientation, false),
    canActivate:       parseBool(node.CanActivate, false),
    isDeprecated:      parseBool(node.Deprecated, false),
    blockStyle:        parseInt(String(node.BlockStyle ?? '0'), 10) || 0,
    slabIds:           parseIntList(node.SlabIds),
    styleIds:          parseIntList(node.StyleIds),
    computerReference: parseInt(String(node.BlockComputerReference ?? '0'), 10) || 0,
    lightSource:       parseBool(node.LightSource, false),
    lightSourceColor:  parseLightColor(node.LightSourceColor),
    transparency:      parseBool(node.Transparency, false),
    door:              parseBool(node.Door, false),
    logicBlock:        parseBool(node.LogicBlock, false),
    individualSides:   parseInt(String(node.IndividualSides ?? '1'), 10) || 1,
    sideTexturesPointToOrientation: parseBool(node.SideTexturesPointToOrientation, false),
    hasActivationTexture: parseBool(node.HasActivationTexture, false),
    extendedTexture4x4: parseBool(node.ExtendedTexture4x4, false),
    onlyDrawnInBuildMode: parseBool(node.OnlyDrawnInBuildMode, false),
    lodShapeFromFar:   parseInt(String(node.LodShapeFromFar ?? '0'), 10) || 0,
    animated:          parseBool(node.Animated, false),
    isCustom,
  };
}

function parseBlockFile(filePath: string, typeIds: Map<string, number>, isCustom: boolean): BlockDef[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = PARSER.parse(fs.readFileSync(filePath, 'utf8'));
  const nodes: Record<string, unknown>[] = [];
  collectBlockNodes(raw, nodes);
  return nodes
    .map(node => parseBlock(node, typeIds, isCustom))
    .filter((b): b is BlockDef => b !== null);
}

function loadAllBlocks(): BlockDef[] {
  const dir = getStarmadeDir();
  const vanillaPath = path.join(dir, 'data', 'config', 'BlockConfig.xml');
  const customPath  = path.join(dir, 'customBlockConfig', 'BlockConfigImport.xml');
  const vanillaMtime = fileMtimeMs(vanillaPath);
  const customMtime = fileMtimeMs(customPath);

  if (
    blockCache.dir === dir &&
    blockCache.blocks &&
    blockCache.vanillaMtime === vanillaMtime &&
    blockCache.customMtime === customMtime
  ) {
    return blockCache.blocks;
  }

  const typeIds = loadTypeIds(dir);
  const blocks = new Map<number, BlockDef>();

  for (const block of parseBlockFile(vanillaPath, typeIds, false)) {
    blocks.set(block.id, block);
  }
  for (const block of parseBlockFile(customPath, typeIds, true)) {
    blocks.set(block.id, block);
  }

  const sorted = [...blocks.values()].sort((a, b) => a.id - b.id);
  blockCache.dir = dir;
  blockCache.vanillaMtime = vanillaMtime;
  blockCache.customMtime = customMtime;
  blockCache.blocks = sorted;
  return sorted;
}

function serializeType(def: BlockDef): string | number {
  if (/^\d+$/.test(def.xmlTypeName)) return def.id;
  if (/^CUSTOM_BLOCK_/i.test(def.xmlTypeName)) return def.id;
  return def.xmlTypeName || def.id;
}

function serializeBlock(def: BlockDef): Record<string, unknown> {
  return {
    '@_icon':                String(def.icon),
    '@_name':                def.name,
    '@_textureId':           def.textureId.join(', '),
    '@_type':                serializeType(def),
    Hitpoints:               def.hp,
    Mass:                    def.mass,
    Volume:                  def.volume,
    Price:                   def.price,
    Description:             def.description,
    ArmorValue:              def.armor,
    Placable:                def.isPlacable,
    InShop:                  def.inShop,
    Orientation:             def.hasOrientation,
    CanActivate:             def.canActivate,
    Deprecated:              def.isDeprecated,
    BlockStyle:              def.blockStyle,
    SlabIds:                 def.slabIds.join(', '),
    StyleIds:                def.styleIds.join(', '),
    BlockComputerReference:  def.computerReference,
    LightSource:             def.lightSource,
    LightSourceColor:        def.lightSourceColor.join(','),
    Transparency:            def.transparency,
    Door:                    def.door,
    LogicBlock:              def.logicBlock,
    IndividualSides:         def.individualSides,
    SideTexturesPointToOrientation: def.sideTexturesPointToOrientation,
    HasActivationTexture:    def.hasActivationTexture,
    ExtendedTexture4x4:      def.extendedTexture4x4,
    OnlyDrawnInBuildMode:    def.onlyDrawnInBuildMode,
    LodShapeFromFar:         def.lodShapeFromFar,
    Animated:                def.animated,
  };
}

function getCustomBlockState(): { customPath: string; blocks: Map<number, BlockDef> } {
  const dir = getStarmadeDir();
  const customDir = path.join(dir, 'customBlockConfig');
  const customPath = path.join(customDir, 'BlockConfigImport.xml');
  const typeIds = loadTypeIds(dir);

  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });

  const blocks = new Map<number, BlockDef>();
  for (const block of parseBlockFile(customPath, typeIds, true)) {
    blocks.set(block.id, block);
  }

  return { customPath, blocks };
}

function writeCustomBlocks(customPath: string, blocks: Map<number, BlockDef>): void {
  const xml = BUILDER.build({
    Config: {
      Element: {
        General: {
          Custom: {
            Block: [...blocks.values()].sort((a, b) => a.id - b.id).map(serializeBlock),
          },
        },
      },
    },
  });

  fs.writeFileSync(customPath, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml, 'utf8');
  invalidateBlockCache();
}

function saveCustomBlock(def: BlockDef): void {
  const { customPath, blocks } = getCustomBlockState();
  blocks.set(def.id, { ...def, isCustom: true });
  writeCustomBlocks(customPath, blocks);
}

function deleteCustomBlock(id: number): void {
  const { customPath, blocks } = getCustomBlockState();
  blocks.delete(id);
  writeCustomBlocks(customPath, blocks);
}

export const blocksRouter = Router();

blocksRouter.get('/', (_req: Request, res: Response) => {
  try {
    res.json(loadAllBlocks());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

blocksRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const block = loadAllBlocks().find(b => b.id === id);
    if (!block) return void res.status(404).json({ error: `Block ${id} not found.` });
    res.json(block);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

blocksRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = loadAllBlocks().find(b => b.id === id);
    if (!existing) return void res.status(404).json({ error: `Block ${id} not found.` });

    const updated: BlockDef = {
      ...existing,
      ...req.body,
      id,
      isCustom: true,
      textureId: Array.isArray(req.body?.textureId) ? req.body.textureId : existing.textureId,
      slabIds: Array.isArray(req.body?.slabIds) ? req.body.slabIds : existing.slabIds,
      styleIds: Array.isArray(req.body?.styleIds) ? req.body.styleIds : existing.styleIds,
      lightSourceColor: Array.isArray(req.body?.lightSourceColor) ? req.body.lightSourceColor : existing.lightSourceColor,
    };

    saveCustomBlock(updated);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

blocksRouter.post('/', (req: Request, res: Response) => {
  try {
    const blocks = loadAllBlocks();
    const maxId  = Math.max(...blocks.map(b => b.id), 999);
    const id     = maxId + 1;

    const created: BlockDef = {
      name:              'New Custom Block',
      icon:              0,
      textureId:         [0, 0, 0, 0, 0, 0],
      hp:                100,
      mass:              0.1,
      volume:            0.1,
      price:             100,
      description:       '',
      armor:             0.1,
      isPlacable:        true,
      inShop:            false,
      hasOrientation:    false,
      canActivate:       false,
      isDeprecated:      false,
      blockStyle:        0,
      slabIds:           [],
      styleIds:          [],
      computerReference: 0,
      lightSource:       false,
      lightSourceColor:  [1, 1, 1, 1],
      transparency:      false,
      door:              false,
      logicBlock:        false,
      individualSides:   1,
      sideTexturesPointToOrientation: false,
      hasActivationTexture: false,
      extendedTexture4x4: false,
      onlyDrawnInBuildMode: false,
      lodShapeFromFar:   0,
      animated:          false,
      isCustom:          true,
      ...req.body,
      id,
      xmlTypeName: req.body?.xmlTypeName || `CUSTOM_BLOCK_${id}`,
    };

    saveCustomBlock(created);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

blocksRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const block = loadAllBlocks().find(b => b.id === id);
    if (!block) return void res.status(404).json({ error: `Block ${id} not found.` });
    if (!block.isCustom) return void res.status(403).json({ error: 'Cannot delete vanilla blocks. Mark as deprecated instead.' });
    deleteCustomBlock(id);
    res.json({ ok: true, deletedId: id });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
