/**
 * @fileoverview Global block store — Zustand.
 *
 * Holds the block list, selected block, editor UI state (orientation, highlight),
 * and dirty tracking for unsaved changes.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { create } from 'zustand';

/**
 * Block definition shape returned by the API.
 * Mirrors server/src/api/blocks.ts BlockDef.
 */
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
  slab:             number;
  slabIds:          number[];
  styleIds:         number[];
  effectArmor:      Record<string, number>;
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

/** Block filter state for the sidebar list. */
export interface BlockFilter {
  search:      string;
  showCustom:  boolean;
  showVanilla: boolean;
  showDeprecated: boolean;
}

/** Full block editor store shape. */
interface BlockStore {
  // ── Block list ─────────────────────────────────────────────────────────────
  blocks:        BlockDef[];
  setBlocks:     (blocks: BlockDef[]) => void;

  // ── Selection ──────────────────────────────────────────────────────────────
  selectedBlock: BlockDef | null;
  selectBlock:   (block: BlockDef | null) => void;

  // ── Edited draft (before save) ─────────────────────────────────────────────
  draft:         BlockDef | null;
  setDraft:      (draft: BlockDef | null) => void;
  updateDraft:   (patch: Partial<BlockDef>) => void;
  isDirty:       boolean;
  setDirty:      (v: boolean) => void;

  // ── 3D viewer state ────────────────────────────────────────────────────────
  orientation:   number;
  setOrientation:(n: number) => void;
  previewActive: boolean;
  setPreviewActive:(v: boolean) => void;
  highlightFace: number;            // -1 = none, 0=front … 5=left
  setHighlightFace:(n: number) => void;

  // ── Sidebar filter ─────────────────────────────────────────────────────────
  filter:        BlockFilter;
  setFilter:     (f: Partial<BlockFilter>) => void;

  // ── Loading / error ────────────────────────────────────────────────────────
  loading:       boolean;
  setLoading:    (v: boolean) => void;
  error:         string | null;
  setError:      (e: string | null) => void;
}

export const useBlockStore = create<BlockStore>((set, get) => ({
  blocks:        [],
  setBlocks:     (blocks) => set({ blocks }),

  selectedBlock: null,
  selectBlock:   (block) => set({ selectedBlock: block, draft: block ? { ...block } : null, isDirty: false, previewActive: true }),

  draft:         null,
  setDraft:      (draft) => set({ draft }),
  updateDraft:   (patch) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, ...patch }, isDirty: true });
  },
  isDirty:       false,
  setDirty:      (isDirty) => set({ isDirty }),

  orientation:   0,
  setOrientation:(orientation) => set({ orientation }),
  previewActive: true,
  setPreviewActive:(previewActive) => set({ previewActive }),
  highlightFace: -1,
  setHighlightFace:(highlightFace) => set({ highlightFace }),

  filter: {
    search:         '',
    showCustom:     true,
    showVanilla:    true,
    showDeprecated: false,
  },
  setFilter: (f) => set(s => ({ filter: { ...s.filter, ...f } })),

  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
}));
