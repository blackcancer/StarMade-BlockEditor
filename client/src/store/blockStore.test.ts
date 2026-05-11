import { beforeEach, describe, expect, it } from 'vitest';
import { useBlockStore, type BlockDef } from './blockStore.js';

const makeBlock = (patch: Partial<BlockDef> = {}): BlockDef => ({
  id: 1,
  name: 'Hull',
  icon: 1,
  textureId: [1, 2, 3, 4, 5, 6],
  xmlTypeName: 'HULL',
  hp: 10,
  mass: 1,
  volume: 1,
  price: 100,
  description: '',
  armor: 0,
  isPlacable: true,
  inShop: true,
  hasOrientation: false,
  canActivate: false,
  isDeprecated: false,
  blockStyle: 0,
  slab: 0,
  slabIds: [],
  styleIds: [],
  effectArmor: {},
  computerReference: 0,
  lightSource: false,
  lightSourceColor: [1, 1, 1, 1],
  transparency: false,
  door: false,
  logicBlock: false,
  individualSides: 6,
  sideTexturesPointToOrientation: false,
  hasActivationTexture: false,
  extendedTexture4x4: false,
  onlyDrawnInBuildMode: false,
  lodShapeFromFar: 0,
  animated: false,
  extraProperties: {},
  isCustom: false,
  ...patch,
});

describe('blockStore', () => {
  beforeEach(() => {
    useBlockStore.setState({
      blocks: [],
      selectedBlock: null,
      draft: null,
      isDirty: false,
      orientation: 0,
      previewActive: true,
      highlightFace: -1,
      filter: { search: '', showCustom: true, showVanilla: true, showDeprecated: false },
      loading: false,
      error: null,
    });
  });

  it('loads blocks and creates a clean draft on selection', () => {
    const block = makeBlock();
    useBlockStore.getState().setBlocks([block]);
    useBlockStore.getState().selectBlock(block);

    expect(useBlockStore.getState().blocks).toEqual([block]);
    expect(useBlockStore.getState().selectedBlock).toBe(block);
    expect(useBlockStore.getState().draft).toEqual(block);
    expect(useBlockStore.getState().draft).not.toBe(block);
    expect(useBlockStore.getState().isDirty).toBe(false);
    expect(useBlockStore.getState().previewActive).toBe(true);
  });

  it('marks draft as dirty only when an editable draft exists', () => {
    useBlockStore.getState().updateDraft({ name: 'Ignored' });
    expect(useBlockStore.getState().draft).toBeNull();
    expect(useBlockStore.getState().isDirty).toBe(false);

    useBlockStore.getState().selectBlock(makeBlock());
    useBlockStore.getState().updateDraft({ name: 'Changed', hp: 20 });
    expect(useBlockStore.getState().draft).toMatchObject({ name: 'Changed', hp: 20 });
    expect(useBlockStore.getState().isDirty).toBe(true);
  });

  it('merges filters and stores viewer/error flags', () => {
    useBlockStore.getState().setFilter({ search: 'hull', showDeprecated: true });
    useBlockStore.getState().setOrientation(3);
    useBlockStore.getState().setPreviewActive(false);
    useBlockStore.getState().setHighlightFace(4);
    useBlockStore.getState().setLoading(true);
    useBlockStore.getState().setError('boom');

    expect(useBlockStore.getState().filter).toEqual({ search: 'hull', showCustom: true, showVanilla: true, showDeprecated: true });
    expect(useBlockStore.getState()).toMatchObject({ orientation: 3, previewActive: false, highlightFace: 4, loading: true, error: 'boom' });
  });
});
