/** @fileoverview Decoder-backed catalogue snapshots and revision-checked custom-only persistence. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { BlockConfig, BlockDefinition } from 'starmade-decoder';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { atomicWriteFile, FileConflictError } from './atomicFile.js';
import { updateDefinition } from './blockDto.js';

/** Expected API failure with a status safe to expose to the local editor. */
export class CatalogueError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

/** One coherent catalogue read, retaining Decoder instances and custom provenance. */
export interface Catalogue {
  readonly root: string;
  readonly revision: string;
  readonly vanilla: BlockConfig;
  readonly custom: BlockConfig;
  readonly blocks: ReadonlyMap<number, BlockDefinition>;
  readonly typeIds: ReadonlyMap<string, number>;
  readonly customRevision: string | null;
}

/** A mutation applies against the whole source catalogue revision. */
export type CatalogueMutation = { kind: 'create'; patch: unknown }
  | { kind: 'update'; id: number; patch: unknown } | { kind: 'delete'; id: number };

let cached: Catalogue | undefined;
const parser = new XMLParser({ ignoreAttributes: false, isArray: name => name === 'Block' });

/** Reads optional custom XML without suppressing permission or IO errors. */
function optionalXml(file: string): string | null {
  try { return fs.readFileSync(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

/** Rejects malformed sources before any destructive normalization can occur. */
function parseCatalogue(xml: string, typeIds: Map<string, number>, strictCustom: boolean): BlockConfig {
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid BlockConfig XML; no file was changed.');
  if (strictCustom) {
    const ids = new Set<number>();
    const inspect = (node: unknown, isBlock: boolean): void => {
      if (Array.isArray(node)) { node.forEach(child => inspect(child, isBlock)); return; }
      if (isBlock && (typeof node !== 'object' || node === null)) throw new Error('Custom block identity is missing; no file was changed.');
      if (node === null || typeof node !== 'object') return;
      const value = node as Record<string, unknown>;
      if (isBlock) {
        if (value['@_type'] === undefined || value['@_name'] === undefined) throw new Error('Custom block identity is missing; no file was changed.');
        const type = String(value['@_type']);
        const id = /^\d+$/.test(type) ? Number(type) : typeIds.get(type);
        if (id === undefined || id < 1 || id > 4094 || ids.has(id)) throw new Error('Custom block identity is unresolved, duplicated or out of range; no file was changed.');
        ids.add(id); return;
      }
      Object.entries(value).forEach(([key, child]) => inspect(child, key === 'Block'));
    };
    inspect(parser.parse(xml), false);
  }
  return BlockConfig.fromXml(xml, typeIds);
}

/** Reads all inputs and hashes their exact contents, including mappings and installation identity. */
export function getCatalogue(selectedRoot: string): Catalogue {
  const root = fs.realpathSync(selectedRoot);
  const vanillaXml = fs.readFileSync(path.join(root, 'data/config/BlockConfig.xml'), 'utf8');
  const properties = fs.readFileSync(path.join(root, 'data/config/BlockTypes.properties'), 'utf8');
  const customPath = path.join(root, 'customBlockConfig/BlockConfigImport.xml');
  const customXml = optionalXml(customPath);
  const revision = createHash('sha256').update(JSON.stringify([root, vanillaXml, properties, customXml])).digest('hex');
  if (cached?.revision === revision) return cached;
  const typeIds = BlockConfig._parseBlockTypes(properties);
  const vanilla = parseCatalogue(vanillaXml, typeIds, false);
  const custom = customXml === null ? BlockConfig.fromBlocks([]) : parseCatalogue(customXml, typeIds, true);
  const blocks = new Map([...vanilla, ...custom].map(block => [block.id, block]));
  cached = { root, revision, vanilla, custom, blocks, typeIds,
    customRevision: customXml === null ? null : createHash('sha256').update(customXml).digest('hex') };
  return cached;
}

/** Verifies that a custom write remains within the selected, resolved installation. */
function writableCustomPath(root: string): string {
  const directory = path.join(root, 'customBlockConfig');
  fs.mkdirSync(directory, { recursive: true });
  if (fs.realpathSync(directory) !== directory) throw new CatalogueError(400, 'Custom block directory points outside its expected installation location.');
  const target = path.join(directory, 'BlockConfigImport.xml');
  if (fs.lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) throw new CatalogueError(400, 'Custom block file is a symbolic link.');
  return target;
}

/** Resolves a custom identity without writing or modifying the vanilla type map. */
function persistedIdentity(block: BlockDefinition, mapping: ReadonlyMap<string, number>): BlockDefinition {
  if (/^\d+$/.test(block.xmlTypeName)) {
    if (Number(block.xmlTypeName) !== block.id) throw new TypeError('Numeric XML identity must match the block ID');
    return block;
  }
  if (mapping.get(block.xmlTypeName) === block.id) return block;
  if (block.xmlTypeName === `CUSTOM_BLOCK_${block.id}`) return block.with({ xmlTypeName: String(block.id) });
  throw new TypeError('A symbolic block type needs an existing matching BlockTypes.properties mapping');
}

/** Applies a mutation to custom definitions and commits only after precondition checks. */
export function mutateCatalogue(root: string, expectedRevision: string, mutation: CatalogueMutation): Catalogue {
  const current = getCatalogue(root);
  if (current.revision !== expectedRevision) throw new FileConflictError();
  const custom = new Map([...current.custom].map(block => [block.id, block]));
  if (mutation.kind === 'delete') {
    if (!current.blocks.has(mutation.id)) throw new CatalogueError(404, 'Block not found.');
    if (!custom.has(mutation.id)) throw new CatalogueError(403, 'Cannot delete a vanilla block.');
    custom.delete(mutation.id);
  } else {
    let original: BlockDefinition;
    if (mutation.kind === 'create') {
      let id = 1000;
      while (id <= 4094 && current.blocks.has(id)) id++;
      if (id > 4094) throw new CatalogueError(409, 'No free custom block ID remains.');
      original = BlockDefinition.create({ id, name: 'New Custom Block', inShop: false, armor: 0.1 });
    } else {
      const existing = current.blocks.get(mutation.id);
      if (!existing) throw new CatalogueError(404, 'Block not found.');
      original = existing;
    }
    const updated = persistedIdentity(updateDefinition(original, mutation.patch), current.typeIds);
    custom.set(updated.id, updated);
  }
  const xml = BlockConfig.fromBlocks([...custom.values()].sort((left, right) => left.id - right.id)).toXml();
  if (getCatalogue(root).revision !== expectedRevision) throw new FileConflictError();
  const target = writableCustomPath(current.root);
  atomicWriteFile(target, xml, { expectedRevision: current.customRevision });
  return getCatalogue(root);
}
