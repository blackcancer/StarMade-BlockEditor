/**
 * @fileoverview Block display name helpers — with result cache.
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
 * ## Opt 3 — display name cache
 * `displayBlockName` is called for every block in every dropdown that renders
 * (`BlockIdSelect`, `BlockTypeSelect`, `VariantSelector`, sidebar `BlockCard`).
 * With 1 500+ vanilla blocks, the sidebar list and all the dropdowns inside the
 * advanced property editors trigger hundreds of calls per render.
 *
 * The function involves string operations (`.includes`, `.slice`, `.replace`,
 * regex, `.toLowerCase`). These are cheap individually but add up when called
 * hundreds of times per render cycle.
 *
 * A module-level map keyed by ID, name and XML type caches computed display
 * names. Draft renames and catalogue reloads naturally produce distinct keys.
 *
 * Cache invalidation: exposed via `invalidateDisplayNameCache()` — called
 * automatically when a block is saved so the updated name is re-computed.
 *
 * Memory: 1 500 entries × ~30 bytes avg string = ~45 kB — negligible.
 *
 * @module blockDisplay
 * @author InitSysRev
 * @version 1.0.0
 */

import type { BlockDef } from '../../store/blockStore.js';

// ── Display name cache ────────────────────────────────────────────────────────

/**
 * Module-level cache: composite key `"id\x00name\x00xmlTypeName"` → display name.
 *
 * Using a composite key instead of just `block.id` makes the cache safe for:
 *  - Tests that create blocks with the same ID but different names
 *  - Draft blocks whose name is being edited (the draft has the same id but
 *    a different name from the saved block)
 *  - Blocks whose name changed between two server reloads
 *
 * The full string key is a bit longer than a numeric key but still very fast
 * (Map<string, string> lookup is O(1) with a good hash) and avoids any
 * correctness issue from stale cache entries.
 *
 * Memory: 1 500 entries × ~70 bytes key + ~30 bytes value ≈ 150 kB — acceptable.
 */
const _nameCache = new Map<string, string>();

function cacheKey(block: Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>): string {
  return `${block.id}\x00${block.name ?? ''}\x00${block.xmlTypeName ?? ''}`;
}

/**
 * Invalidate one or all entries in the display name cache.
 *
 * Because the cache key includes the block name, explicit invalidation is
 * rarely necessary (a name change automatically produces a new key).
 * However, calling this on full list reload clears stale entries for
 * blocks that have been deleted.
 *
 * @param {number} [id] Block ID whose entries to remove. Omit to clear everything.
 */
export function invalidateDisplayNameCache(id?: number): void {
  if (id === undefined) {
    _nameCache.clear();
  } else {
    // Remove all entries whose key starts with this id
    for (const key of _nameCache.keys()) {
      if (key.startsWith(`${id}\x00`)) _nameCache.delete(key);
    }
  }
}

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Compute the raw (uncached) display name for a block.
 *
 * Resolution order:
 *  1. If the raw name contains `--`, return everything after the last `--`
 *     (e.g. `"METAL_MESH -- Metal mesh"` → `"Metal mesh"`).
 *  2. If the XML type prefix is a case-insensitive prefix of the name,
 *     strip it and remove any leading ` - `, ` – `, ` — `, or ` : ` separator.
 *     If stripping leaves an empty string, fall through to prettifyTypeName.
 *  3. Return the trimmed name if non-empty, otherwise prettify the type name
 *     (underscores → spaces, title-case), or finally fall back to the block ID.
 */
function computeDisplayName(block: Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>): string {
  const name       = block.name?.trim() || '';
  const typePrefix = block.xmlTypeName?.trim();

  if (name.includes('--')) return name.split('--').pop()!.trim()
    || prettifyTypeName(typePrefix || String(block.id));

  if (typePrefix && name.toLowerCase().startsWith(typePrefix.toLowerCase())) {
    return name.slice(typePrefix.length).replace(/^\s*[-–—:]\s*/, '').trim()
      || prettifyTypeName(typePrefix);
  }

  return name || prettifyTypeName(typePrefix || String(block.id));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Derive a human-readable display name from a block definition.
 *
 * Results are cached by ID, name and XML type. Repeated calls with unchanged
 * display fields return the cached string immediately.
 *
 * @param {Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>} block Block to name.
 * @returns {string} Non-empty human-readable display name.
 */
export function displayBlockName(block: Pick<BlockDef, 'id' | 'name' | 'xmlTypeName'>): string {
  const key    = cacheKey(block);
  const cached = _nameCache.get(key);
  if (cached !== undefined) return cached;

  const name = computeDisplayName(block);
  _nameCache.set(key, name);
  return name;
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
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
