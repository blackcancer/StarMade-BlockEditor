import type { BlockDef } from '../../store/blockStore.js';

export function displayBlockName(block: Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>): string {
  const name = block.name?.trim() || '';
  const typePrefix = block.xmlTypeName?.trim();
  if (name.includes('--')) return name.split('--').pop()!.trim();
  if (typePrefix && name.toLowerCase().startsWith(typePrefix.toLowerCase())) {
    return name.slice(typePrefix.length).replace(/^\s*[-–—:]\s*/, '').trim() || prettifyTypeName(typePrefix);
  }
  return name || prettifyTypeName(typePrefix || String(block.id));
}

export function prettifyTypeName(typeName: string): string {
  return typeName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
