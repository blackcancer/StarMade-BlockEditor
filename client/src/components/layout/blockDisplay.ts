/**
 * @fileoverview Block display name helpers.
 *
 * StarMade block names in BlockConfig.xml follow several conventions:
 *   - `METAL_MESH -- Metal mesh`  : XML type prefix + human label separated by `--`
 *   - `HULL_COLOR_GREY: Grey Hull`: type prefix + label separated by `:`
 *   - `HULL_COLOR_GREY - Grey Hull`: type prefix + label separated by ` - `
 *   - `POWER_CELL`                : no human label; only the XML type name exists
 *   - (empty / id-only)           : block has no name and no type
 *
 * This module strips the technical prefix and exposes the shortest readable name
 * for display in the sidebar, property panel header, and dropdowns.
 *
 * @module blockDisplay
 * @author InitSysRev
 * @version 1.0.0
 */

import type { BlockDef } from '../../store/blockStore.js';

/**
 * Derive a human-readable display name from a block definition.
 *
 * Resolution order:
 *  1. If the raw name contains `--`, return everything after the last `--`
 *     (e.g. `"METAL_MESH -- Metal mesh"` → `"Metal mesh"`).
 *  2. If the XML type prefix is a case-insensitive prefix of the name,
 *     strip it and remove any leading ` - `, ` – `, ` — `, or ` : ` separator.
 *     If stripping leaves an empty string, fall through to prettifyTypeName.
 *  3. Return the trimmed name if non-empty, otherwise prettify the type name
 *     (underscores → spaces, title-case), or finally fall back to the block ID.
 *
 * @param {Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>} block Block to name.
 * @returns {string} Non-empty human-readable display name.
 */
export function displayBlockName(block: Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>): string {
  const name = block.name?.trim() || '';
  const typePrefix = block.xmlTypeName?.trim();

  // Convention 1: "TYPE -- Label" → "Label"
  if (name.includes('--')) return name.split('--').pop()!.trim();

  // Convention 2: name starts with the XML type prefix (case-insensitive)
  if (typePrefix && name.toLowerCase().startsWith(typePrefix.toLowerCase())) {
    // Remove the prefix and any leading separator (–, —, :, -)
    return name.slice(typePrefix.length).replace(/^\s*[-–—:]\s*/, '').trim()
      || prettifyTypeName(typePrefix);
  }

  // Convention 3: use raw name, or prettify type/id as a last resort
  return name || prettifyTypeName(typePrefix || String(block.id));
}

/**
 * Convert a StarMade XML technical type name into title-case words.
 *
 * Examples:
 *   `"POWER_CELL"`           → `"Power Cell"`
 *   `"HULL_COLOR_GREY"`      → `"Hull Color Grey"`
 *   `"ADVANCED_ARMOR_BLOCK"` → `"Advanced Armor Block"`
 *
 * @param {string} typeName Raw XML type name (uppercase_underscore format).
 * @returns {string} Readable title-case string.
 */
export function prettifyTypeName(typeName: string): string {
  return typeName
    .replace(/_/g, ' ')           // underscores → spaces
    .toLowerCase()                // fully lower-case
    .replace(/\b\w/g, c => c.toUpperCase()); // title-case each word
}
