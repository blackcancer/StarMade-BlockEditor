import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { FaceSelector } from './FaceSelector.js';

vi.mock('./AtlasPicker.js', () => ({
  AtlasPicker: ({ selectedTileId, onSelect, onClose }: { selectedTileId: number; onSelect?: (id: number) => void; onClose: () => void }) => (
    <div role="dialog" aria-label="atlas-picker">
      <span>selected:{selectedTileId}</span>
      {onSelect && <button onClick={() => onSelect(99)}>pick-99</button>}
      <button onClick={onClose}>close-picker</button>
    </div>
  ),
}));

const block = (patch: Partial<BlockDef> = {}): BlockDef => ({
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

describe('FaceSelector', () => {
  beforeEach(() => {
    useBlockStore.setState({ draft: null, selectedBlock: null, isDirty: false, highlightFace: -1 });
  });
  afterEach(cleanup);

  it('renders nothing without a draft', () => {
    const { container } = render(<FaceSelector />);
    expect(container.textContent).toBe('');
  });

  it('updates one face in independent mode and clears the picker', () => {
    useBlockStore.setState({ draft: block({ individualSides: 6 }), highlightFace: -1 });
    render(<FaceSelector />);

    fireEvent.click(screen.getByTitle('TOP'));
    expect(useBlockStore.getState().highlightFace).toBe(2);
    expect(screen.getByRole('dialog').textContent).toContain('selected:3');
    fireEvent.click(screen.getByText('pick-99'));

    expect(useBlockStore.getState().draft?.textureId).toEqual([1, 2, 99, 4, 5, 6]);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTitle('FRONT'));
    expect(useBlockStore.getState().highlightFace).toBe(0);
    fireEvent.click(screen.getByText('close-picker'));
    expect(useBlockStore.getState().highlightFace).toBe(-1);
  });

  it('updates all faces or three face groups depending on individualSides', () => {
    useBlockStore.setState({ draft: block({ individualSides: 1 }), highlightFace: -1 });
    const { unmount } = render(<FaceSelector />);
    fireEvent.click(screen.getByTitle('LEFT'));
    fireEvent.click(screen.getByText('pick-99'));
    expect(useBlockStore.getState().draft?.textureId).toEqual([99, 99, 99, 99, 99, 99]);
    unmount();

    useBlockStore.setState({ draft: block({ individualSides: 3 }), highlightFace: -1 });
    render(<FaceSelector />);
    fireEvent.click(screen.getByTitle('BOTTOM'));
    fireEvent.click(screen.getByText('pick-99'));
    expect(useBlockStore.getState().draft?.textureId).toEqual([1, 2, 99, 99, 5, 6]);
  });

  it('covers the right/left face group in 3-side mode and shows block hints', () => {
    // individualSides=3, face 4 (RIGHT) => group [4,5]
    useBlockStore.setState({ draft: block({ individualSides: 3 }), highlightFace: -1 });
    const { unmount } = render(<FaceSelector />);
    fireEvent.click(screen.getByTitle('RIGHT'));
    fireEvent.click(screen.getByText('pick-99'));
    expect(useBlockStore.getState().draft?.textureId).toEqual([1, 2, 3, 4, 99, 99]);
    unmount();

    // hasActivationTexture hint
    useBlockStore.setState({ draft: block({ hasActivationTexture: true }), highlightFace: -1 });
    const { unmount: u2 } = render(<FaceSelector />);
    expect(screen.getByText(/Inactive preview/)).toBeTruthy();
    u2();

    // animated hint
    useBlockStore.setState({ draft: block({ animated: true }), highlightFace: -1 });
    render(<FaceSelector />);
    expect(screen.getByText(/Animated preview/)).toBeTruthy();
  });

  it('normalises sparse textureId arrays using textureId[0] as fallback', () => {
    // textureId has only 1 element — missing indices use textureId[0]
    useBlockStore.setState({ draft: block({ individualSides: 6, textureId: [42] }), highlightFace: -1 });
    render(<FaceSelector />);
    fireEvent.click(screen.getByTitle('BACK'));
    // pickerFace=1 → tileIds[1] = textureId[1] ?? textureId[0] = 42
    expect(screen.getByRole('dialog').textContent).toContain('selected:42');
  });

  it('falls back to 0 when textureId is completely empty', () => {
    // textureId=[] → tileIds[i] = undefined ?? undefined ?? 0 = 0
    useBlockStore.setState({ draft: block({ individualSides: 6, textureId: [] }), highlightFace: -1 });
    render(<FaceSelector />);
    fireEvent.click(screen.getByTitle('TOP'));
    // tileIds[2] = textureId[2] ?? textureId[0] ?? 0 = 0
    expect(screen.getByRole('dialog').textContent).toContain('selected:0');
  });

  it('opens and closes the atlas manager without selecting a face', () => {
    useBlockStore.setState({ draft: block(), highlightFace: -1 });
    render(<FaceSelector />);
    fireEvent.click(screen.getByText('Manage custom atlas…'));
    expect(screen.getByRole('dialog').textContent).toContain('selected:1792');
    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
