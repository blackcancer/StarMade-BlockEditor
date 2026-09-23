/**
 * @fileoverview Global block store — Zustand state management.
 *
 * Single source of truth for all block-related UI state:
 *
 *  - **Block list** (`blocks`) — all loaded blocks from the API.
 *  - **Selection** (`selectedBlock`, `draft`) — the currently selected block
 *    and its editable copy (draft). The draft is separate from `selectedBlock`
 *    so changes can be previewed/reverted without affecting the original.
 *  - **Dirty tracking** (`isDirty`) — true when the draft differs from the
 *    last saved state. Used to enable/disable Save and Revert buttons.
 *  - **3D viewer state** — orientation index, active/inactive preview toggle,
 *    and the highlighted face index for texture face editing.
 *  - **Sidebar filter** — search text and visibility toggles for custom,
 *    vanilla, and deprecated blocks.
 *  - **Loading / error** — async state for API calls.
 *
 * ## Draft workflow
 * When a block is selected via `selectBlock(block)`:
 *  1. `selectedBlock` is set to the block reference.
 *  2. `draft` is set to a shallow copy `{ ...block }` (independent of the list).
 *  3. `isDirty` is reset to false.
 *  4. `previewActive` is reset to true.
 *
 * Edits update `draft` via `updateDraft(patch)` and set `isDirty = true`.
 * Saving calls `useSaveBlock()` which calls `selectBlock(saved)` to reset dirty.
 * Reverting calls `selectBlock(selectedBlock)` which re-clones the saved state.
 *
 * @module store/blockStore
 * @author InitSysRev
 * @version 1.0.0
 */

import { create } from 'zustand';

// =============================================================================
// BlockDef interface
// =============================================================================

/**
 * Complete block definition shape returned by the API.
 * This interface mirrors `BlockDef` in `server/src/api/blocks.ts`.
 *
 * Every field corresponds directly to a StarMade BlockConfig.xml attribute
 * or child element. See the server-side `BlockDef` interface for detailed
 * per-field documentation and source references.
 */
export interface BlockDef {
  /** Catalogue revision returned by the server; absent on unsaved local fixtures. */
  revision?: string;
  /** Numeric block ID (from BlockTypes.properties). */
  id:               number;
  /** Display name (from the `@_name` XML attribute). */
  name:             string;
  /** Build-menu icon ID (from the `@_icon` attribute). */
  icon:             number;
  /**
   * Texture tile IDs per face: [front, back, top, bottom, right, left].
   * Length depends on `individualSides` (1, 3, or 6 entries).
   */
  textureId:        number[];
  /** Raw XML type name (e.g. `"GREY_HULL"`). */
  xmlTypeName:      string;
  /** Block hit points — durability threshold. */
  hp:               number;
  /** Mass contribution per block — affects ship inertia. */
  mass:             number;
  /** Volume value for economy/balancing systems. */
  volume:           number;
  /** Base shop price. */
  price:            number;
  /** Description text shown in-game. */
  description:      string;
  /** General armour/resistance factor. */
  armor:            number;
  /** Whether the block can be placed by players. */
  isPlacable:       boolean;
  /** Whether the block appears in shops. */
  inShop:           boolean;
  /** Whether the block stores orientation when placed. */
  hasOrientation:   boolean;
  /**
   * Gameplay activation flag (can be toggled by players).
   * Does NOT imply texture switching — see `hasActivationTexture`.
   */
  canActivate:      boolean;
  /** Whether the block is marked as obsolete. */
  isDeprecated:     boolean;
  /**
   * Block mesh shape (0=Cube, 1=Wedge, 2=Corner, 3=Cross, 4=Tetra, 5=Penta, 6=Normal24).
   */
  blockStyle:       number;
  /** Slab thickness (0=full, 1=3/4, 2=1/2, 3=1/4). */
  slab:             number;
  /** IDs of slab variant blocks associated with this block. */
  slabIds:          number[];
  /** IDs of alternate style/shape variants. */
  styleIds:         number[];
  /** Per-damage-type armour modifiers (Heat, Kinetic, EM). */
  effectArmor:      Record<string, number>;
  /** Linked controller/computer block ID (0 = none). */
  computerReference: number;
  /** Whether this block emits light when active. */
  lightSource:      boolean;
  /**
   * RGBA light colour+intensity: [R, G, B, W].
   * RGB are 0–1 channels; W is the intensity multiplier (0–2+).
   */
  lightSourceColor: number[];
  /** Enables transparent/blended rendering. */
  transparency:     boolean;
  /** Door-type behaviour flag. */
  door:             boolean;
  /** Participates in the logic network. */
  logicBlock:       boolean;
  /**
   * UV face grouping mode:
   *  1=all same, 3=grouped front/back·top/bottom·sides, 6=all independent.
   */
  individualSides:  number;
  /** Texture lookup rotates with block orientation. */
  sideTexturesPointToOrientation: boolean;
  /**
   * Enables active/inactive texture switching.
   * Inactive state uses `textureId[face] + 1`.
   */
  hasActivationTexture: boolean;
  /** Uses a 4×4 extended texture footprint. */
  extendedTexture4x4: boolean;
  /** Only rendered in build/edit mode. */
  onlyDrawnInBuildMode: boolean;
  /** LOD mesh reference used at distance (0 = none). */
  lodShapeFromFar:  number;
  /** Animated texture — frame selection and timing follow the native StarMade shader. */
  animated:         boolean;
  /**
   * All remaining BlockConfig.xml fields not mapped to named properties.
   * Preserved for round-trip XML compatibility.
   */
  extraProperties:  Record<string, unknown>;
  /** True when loaded from `customBlockConfig/BlockConfigImport.xml`. */
  isCustom:         boolean;
}

// =============================================================================
// BlockFilter interface
// =============================================================================

/**
 * Filter state used by the block sidebar.
 *
 * The search string narrows blocks by readable name/type/ID while the boolean flags independently include or exclude vanilla, custom, and deprecated definitions. Keeping the filter shape explicit makes sidebar behaviour testable and serialisable.
 */

export interface BlockFilter {
  /** Text search query (matches name, xmlTypeName, and ID). */
  search:         string;
  /** Show custom blocks in the sidebar list. */
  showCustom:     boolean;
  /** Show vanilla blocks in the sidebar list. */
  showVanilla:    boolean;
  /** Show deprecated blocks in the sidebar list. */
  showDeprecated: boolean;
}

// =============================================================================
// BlockStore interface
// =============================================================================

/**
 * Full Zustand store shape for block editor state.
 *
 * Grouped into logical sections for clarity.
 */
interface BlockStore {
  /** Refresh all icon consumers after an image slot is imported or restored. */
  iconRevision: number;
  /** Distinguish continued typing from leaving and returning to the same block during a save. */
  selectionVersion: number;
  /** Native PNG export for the current draft, available after the renderer is ready. */
  captureIcon: (() => Promise<Blob>) | null;
  /** ETag of the currently loaded complete catalogue. */
  catalogRevision: string | null;
  /** A mutation is in flight; duplicate writes are ignored. */
  saving: boolean;

  // ── Block list ─────────────────────────────────────────────────────────────

  /** All loaded block definitions. Populated by `useBlocks()`. */
  blocks:     BlockDef[];
  /** Replace the entire block list. */
  setBlocks:  (blocks: BlockDef[]) => void;

  // ── Selection ──────────────────────────────────────────────────────────────

  /** The currently selected block (the persisted / last-saved state). */
  selectedBlock: BlockDef | null;
  /**
   * Select a block. Clones it into `draft`, resets `isDirty` and `previewActive`.
   * Pass `null` to deselect (clears draft as well).
   */
  selectBlock: (block: BlockDef | null) => void;

  // ── Draft (editable copy) ──────────────────────────────────────────────────

  /**
   * Editable draft of the selected block.
   * All property panel changes update the draft, not `selectedBlock`.
   */
  draft:       BlockDef | null;
  /** Directly replace the entire draft (use `updateDraft` for partial updates). */
  setDraft:    (draft: BlockDef | null) => void;
  /**
   * Merge `patch` into the current draft and set `isDirty = true`.
   * No-ops if no draft is currently active.
   */
  updateDraft: (patch: Partial<BlockDef>) => void;

  // ── Dirty tracking ─────────────────────────────────────────────────────────

  /** True when the draft has unsaved changes relative to `selectedBlock`. */
  isDirty:  boolean;
  /** Manually set the dirty flag. */
  setDirty: (v: boolean) => void;

  // ── 3D viewer state ────────────────────────────────────────────────────────

  /**
   * Orientation index for the 3D preview (0–11 or 0–23 depending on block style).
   * Maps to Euler angles via `ORIENTATIONS` in `BlockMesh.tsx`.
   */
  orientation:       number;
  /** Set the preview orientation index. */
  setOrientation:    (n: number) => void;

  /**
   * Whether the block is previewed in its "active" state.
   * Affects texture selection (`hasActivationTexture`) and light emission (`lightSource`).
   */
  previewActive:     boolean;
  /** Toggle the active/inactive preview state. */
  setPreviewActive:  (v: boolean) => void;

  /**
   * Highlighted face index for texture face editing (0=front…5=left, -1=none).
   * Set when the user opens the atlas picker for a specific face.
   */
  highlightFace:     number;
  /** Set the highlighted face index. */
  setHighlightFace:  (n: number) => void;

  // ── Sidebar filter ─────────────────────────────────────────────────────────

  /** Current sidebar filter state. */
  filter:    BlockFilter;
  /**
   * Merge a partial update into the filter.
   * Missing fields retain their current values.
   */
  setFilter: (f: Partial<BlockFilter>) => void;

  // ── Loading / error ────────────────────────────────────────────────────────

  /** True while blocks are being fetched from the API. */
  loading:    boolean;
  /** Set the loading flag. */
  setLoading: (v: boolean) => void;

  /** Last API error message, or null if no error. */
  error:    string | null;
  /** Set or clear the error message. */
  setError: (e: string | null) => void;
}

// =============================================================================
// Store implementation
// =============================================================================
/**
 * Global Zustand store for loaded blocks, selection, draft editing, and preview flags.
 *
 * Components should use this hook instead of sharing local editor state. The store separates the persisted block list from the mutable draft so users can edit fields freely, detect dirty state, and save or discard changes predictably.
 *
 * @returns Zustand hook exposing block editor state and mutation actions.
 */

export const useBlockStore = create<BlockStore>((set, get) => ({

  // ── Block list ─────────────────────────────────────────────────────────────
  catalogRevision: null,
  saving: false,
  iconRevision: 0,
  captureIcon: null,
  blocks:    [],
  setBlocks: (blocks) => set({ blocks }),

  // ── Selection ──────────────────────────────────────────────────────────────
  selectionVersion: 0,
  selectedBlock: null,
  selectBlock:   (block) => set({
    selectionVersion: get().selectionVersion + 1,
    selectedBlock: block,
    draft:         block ? structuredClone(block) : null, // Clone to avoid aliasing.
    isDirty:       false,
    previewActive: true, // Always reset to active state on selection.
  }),

  // ── Draft ──────────────────────────────────────────────────────────────────
  draft:       null,
  setDraft:    (draft) => set({ draft }),
  updateDraft: (patch) => {
    const current = get().draft;
    if (!current) return; // No-op when nothing is selected.
    set({ draft: { ...current, ...patch }, isDirty: true });
  },

  // ── Dirty tracking ─────────────────────────────────────────────────────────
  isDirty:  false,
  setDirty: (isDirty) => set({ isDirty }),

  // ── 3D viewer ──────────────────────────────────────────────────────────────
  orientation:      0,
  setOrientation:   (orientation) => set({ orientation }),
  previewActive:    true,
  setPreviewActive: (previewActive) => set({ previewActive }),
  highlightFace:    -1,
  setHighlightFace: (highlightFace) => set({ highlightFace }),

  // ── Filter ─────────────────────────────────────────────────────────────────
  filter: {
    search:         '',
    showCustom:     true,
    showVanilla:    true,
    showDeprecated: false,
  },
  setFilter: (f) => set(s => ({ filter: { ...s.filter, ...f } })),

  // ── Loading / error ────────────────────────────────────────────────────────
  loading:    false,
  setLoading: (loading) => set({ loading }),
  error:      null,
  setError:   (error) => set({ error }),
}));
