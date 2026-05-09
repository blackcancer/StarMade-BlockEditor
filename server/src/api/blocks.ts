/**
 * @fileoverview Block definitions API router.
 *
 * Uses StarMade-Decoder's BlockConfig to read all block definitions and
 * write new / modified blocks to customBlockConfig/BlockConfigImport.xml.
 *
 * Endpoints:
 *  GET  /api/blocks           — all block definitions (vanilla + custom)
 *  GET  /api/blocks/:id       — single block by numeric ID
 *  PUT  /api/blocks/:id       — update a custom block (write to custom XML)
 *  POST /api/blocks           — create a new custom block
 *  DELETE /api/blocks/:id     — mark a custom block as deprecated (soft delete)
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

/**
 * Minimal BlockDefinition shape returned by the API.
 * Mirrors the fields exposed by StarMade-Decoder's BlockDefinition.
 */
export interface BlockDef {
  id:               number;
  name:             string;
  icon:             number;
  textureId:        number[];   // 6 face texture tile IDs [front, back, top, bottom, right, left]
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
  blockStyle:       number;     // 0=Cube 1=Wedge 2=Corner 3=Cross 4=Tetra 5=Penta
  slabIds:          number[];
  styleIds:         number[];
  computerReference:number;
  lightSource:      boolean;
  lightSourceColor: number[];   // [r, g, b, a]
  transparency:     boolean;
  door:             boolean;
  logicBlock:       boolean;
  individualSides:  number;     // 1=all same, 3=top/bottom separate, 6=all different
  animated:         boolean;
  isCustom:         boolean;    // true = lives in customBlockConfig/
}

// ── XML parser / builder ────────────────────────────────────────────────────

const PARSER = new XMLParser({
  ignoreAttributes:     false,
  attributeNamePrefix:  '@_',
  parseTagValue:        true,
  trimValues:           true,
  isArray:              (name) => ['Block'].includes(name),
});

const BUILDER = new XMLBuilder({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  format:              true,
  indentBy:            '  ',
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load the starmadeDir from SMToolConfig.json.
 *
 * @returns {string} Absolute path to StarMade root.
 */
function getStarmadeDir(): string {
  const cfgPath = path.resolve(process.cwd(), 'SMToolConfig.json');
  if (!fs.existsSync(cfgPath)) throw new Error('SMToolConfig.json not found. Configure starmadeDir first.');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg.starmadeDir) throw new Error('starmadeDir is not set in SMToolConfig.json.');
  return cfg.starmadeDir as string;
}

/**
 * Parse a boolean-like XML value.
 *
 * @param {unknown} v Raw value from XML parser.
 * @returns {boolean} Parsed boolean.
 */
function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  return String(v).trim().toLowerCase() === 'true';
}

/**
 * Parse a comma-separated integer list from XML.
 *
 * @param {unknown} v Raw value from XML parser.
 * @returns {number[]} Array of integers.
 */
function parseIntList(v: unknown): number[] {
  if (!v) return [];
  return String(v).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

/**
 * Parse a light source color string "r,g,b,a" into a [r,g,b,a] float array.
 *
 * @param {unknown} v Raw value from XML parser.
 * @returns {number[]} RGBA float array.
 */
function parseLightColor(v: unknown): number[] {
  if (!v) return [1, 1, 1, 1];
  return String(v).split(',').map(s => parseFloat(s.trim()));
}

/**
 * Map an XML Block node to a BlockDef object.
 *
 * @param {Record<string, unknown>} b Raw parsed XML block node.
 * @param {boolean} isCustom Whether this block is from the custom config.
 * @returns {BlockDef} Structured block definition.
 */
function parseBlock(b: Record<string, unknown>, isCustom: boolean): BlockDef {
  const attrs = b as { '@_icon'?: string; '@_name'?: string; '@_textureId'?: string; '@_type'?: string };
  const textureIdRaw = attrs['@_textureId'] || '0';
  return {
    id:                parseInt(String(attrs['@_type'] || '0'), 10),
    name:              String(attrs['@_name'] || ''),
    icon:              parseInt(String(attrs['@_icon'] || '0'), 10),
    textureId:         parseIntList(textureIdRaw),
    xmlTypeName:       String(attrs['@_type'] || ''),
    hp:                parseInt(String((b as Record<string,unknown>).Hitpoints ?? '0'), 10),
    mass:              parseFloat(String((b as Record<string,unknown>).Mass ?? '0')),
    volume:            parseFloat(String((b as Record<string,unknown>).Volume ?? '0')),
    price:             parseInt(String((b as Record<string,unknown>).Price ?? '0'), 10),
    description:       String((b as Record<string,unknown>).Description ?? ''),
    armor:             parseFloat(String((b as Record<string,unknown>).ArmorValue ?? '0')),
    isPlacable:        parseBool((b as Record<string,unknown>).Placable),
    inShop:            parseBool((b as Record<string,unknown>).InShop),
    hasOrientation:    parseBool((b as Record<string,unknown>).Orientation),
    canActivate:       parseBool((b as Record<string,unknown>).CanActivate),
    isDeprecated:      parseBool((b as Record<string,unknown>).Deprecated),
    blockStyle:        parseInt(String((b as Record<string,unknown>).BlockStyle ?? '0'), 10),
    slabIds:           parseIntList((b as Record<string,unknown>).SlabIds),
    styleIds:          parseIntList((b as Record<string,unknown>).StyleIds),
    computerReference: parseInt(String((b as Record<string,unknown>).BlockComputerReference ?? '0'), 10),
    lightSource:       parseBool((b as Record<string,unknown>).LightSource),
    lightSourceColor:  parseLightColor((b as Record<string,unknown>).LightSourceColor),
    transparency:      parseBool((b as Record<string,unknown>).Transparency),
    door:              parseBool((b as Record<string,unknown>).Door),
    logicBlock:        parseBool((b as Record<string,unknown>).LogicBlock),
    individualSides:   parseInt(String((b as Record<string,unknown>).IndividualSides ?? '1'), 10),
    animated:          parseBool((b as Record<string,unknown>).Animated),
    isCustom,
  };
}

/**
 * Load all blocks from vanilla BlockConfig.xml and the custom override XML.
 *
 * @returns {BlockDef[]} Merged list of block definitions.
 */
function loadAllBlocks(): BlockDef[] {
  const dir      = getStarmadeDir();
  const vanilla  = path.join(dir, 'data', 'config', 'BlockConfig.xml');
  const customDir= path.join(dir, 'customBlockConfig');
  const custom   = path.join(customDir, 'BlockConfigImport.xml');

  const blocks = new Map<number, BlockDef>();

  // Parse vanilla
  if (fs.existsSync(vanilla)) {
    const raw  = PARSER.parse(fs.readFileSync(vanilla, 'utf8'));
    const list = (raw?.Config?.Element?.General?.Category?.SubCategory?.Block ?? []) as Record<string,unknown>[];
    for (const b of list) {
      const def = parseBlock(b, false);
      blocks.set(def.id, def);
    }
  }

  // Parse custom (overrides + additions)
  if (fs.existsSync(custom)) {
    const raw  = PARSER.parse(fs.readFileSync(custom, 'utf8'));
    const list = (raw?.Config?.Element?.General?.Category?.SubCategory?.Block ?? []) as Record<string,unknown>[];
    for (const b of list) {
      const def = parseBlock(b, true);
      blocks.set(def.id, def);
    }
  }

  return Array.from(blocks.values()).sort((a, b) => a.id - b.id);
}

/**
 * Serialize a BlockDef back to an XML Block node object.
 *
 * @param {BlockDef} def Block definition to serialize.
 * @returns {Record<string, unknown>} XML node object for BUILDER.
 */
function serializeBlock(def: BlockDef): Record<string, unknown> {
  return {
    '@_icon':      String(def.icon),
    '@_name':      def.name,
    '@_textureId': def.textureId.join(', '),
    '@_type':      def.xmlTypeName,
    Hitpoints:          def.hp,
    Mass:               def.mass,
    Volume:             def.volume,
    Price:              def.price,
    Description:        def.description,
    ArmorValue:         def.armor,
    Placable:           def.isPlacable,
    InShop:             def.inShop,
    Orientation:        def.hasOrientation,
    CanActivate:        def.canActivate,
    Deprecated:         def.isDeprecated,
    BlockStyle:         def.blockStyle,
    SlabIds:            def.slabIds.join(', '),
    StyleIds:           def.styleIds.join(', '),
    BlockComputerReference: def.computerReference,
    LightSource:        def.lightSource,
    LightSourceColor:   def.lightSourceColor.join(','),
    Transparency:       def.transparency,
    Door:               def.door,
    LogicBlock:         def.logicBlock,
    IndividualSides:    def.individualSides,
    Animated:           def.animated,
  };
}

/**
 * Write a list of custom BlockDef objects to customBlockConfig/BlockConfigImport.xml.
 * Reads existing custom blocks first to avoid overwriting others.
 *
 * @param {BlockDef} def Block to save or update.
 */
function saveCustomBlock(def: BlockDef): void {
  const dir      = getStarmadeDir();
  const customDir= path.join(dir, 'customBlockConfig');
  const custom   = path.join(customDir, 'BlockConfigImport.xml');

  if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });

  // Load existing custom blocks
  const existing = new Map<number, Record<string, unknown>>();
  if (fs.existsSync(custom)) {
    const raw  = PARSER.parse(fs.readFileSync(custom, 'utf8'));
    const list = (raw?.Config?.Element?.General?.Category?.SubCategory?.Block ?? []) as Record<string, unknown>[];
    for (const b of list) {
      const id = parseInt(String((b as { '@_type'?: string })['@_type'] ?? '0'), 10);
      existing.set(id, b);
    }
  }

  // Update or insert
  existing.set(def.id, serializeBlock(def));

  const xml = BUILDER.build({
    Config: {
      Element: {
        General: {
          Category: {
            SubCategory: {
              Block: Array.from(existing.values()),
            },
          },
        },
      },
    },
  });

  fs.writeFileSync(custom, '<?xml version="1.0" encoding="utf-8"?>\n' + xml, 'utf8');
}

// ── Router ───────────────────────────────────────────────────────────────────

export const blocksRouter = Router();

/** GET /api/blocks — all blocks */
blocksRouter.get('/', (_req: Request, res: Response) => {
  try {
    res.json(loadAllBlocks());
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** GET /api/blocks/:id — single block by ID */
blocksRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id     = parseInt(req.params.id, 10);
    const blocks = loadAllBlocks();
    const block  = blocks.find(b => b.id === id);
    if (!block) return void res.status(404).json({ error: `Block ${id} not found.` });
    res.json(block);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** PUT /api/blocks/:id — update existing custom block */
blocksRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id     = parseInt(req.params.id, 10);
    const blocks = loadAllBlocks();
    const existing = blocks.find(b => b.id === id);
    if (!existing) return void res.status(404).json({ error: `Block ${id} not found.` });
    const updated: BlockDef = { ...existing, ...req.body, id, isCustom: true };
    saveCustomBlock(updated);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** POST /api/blocks — create new custom block */
blocksRouter.post('/', (req: Request, res: Response) => {
  try {
    const blocks   = loadAllBlocks();
    const maxId    = Math.max(...blocks.map(b => b.id), 999);
    const newBlock: BlockDef = {
      id:               maxId + 1,
      name:             'New Custom Block',
      icon:             0,
      textureId:        [0, 0, 0, 0, 0, 0],
      xmlTypeName:      `CUSTOM_BLOCK_${maxId + 1}`,
      hp:               100,
      mass:             0.1,
      volume:           0.1,
      price:            100,
      description:      '',
      armor:            0.1,
      isPlacable:       true,
      inShop:           false,
      hasOrientation:   false,
      canActivate:      false,
      isDeprecated:     false,
      blockStyle:       0,
      slabIds:          [],
      styleIds:         [],
      computerReference:0,
      lightSource:      false,
      lightSourceColor: [1, 1, 1, 1],
      transparency:     false,
      door:             false,
      logicBlock:       false,
      individualSides:  1,
      animated:         false,
      isCustom:         true,
      ...req.body,
    };
    saveCustomBlock(newBlock);
    res.status(201).json(newBlock);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** DELETE /api/blocks/:id — soft delete (marks as deprecated) */
blocksRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id     = parseInt(req.params.id, 10);
    const blocks = loadAllBlocks();
    const block  = blocks.find(b => b.id === id);
    if (!block)     return void res.status(404).json({ error: `Block ${id} not found.` });
    if (!block.isCustom) return void res.status(403).json({ error: 'Cannot delete vanilla blocks. Mark as deprecated instead.' });
    saveCustomBlock({ ...block, isDeprecated: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
