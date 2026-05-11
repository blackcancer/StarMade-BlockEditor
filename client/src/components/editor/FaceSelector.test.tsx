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

  it('opens and closes the atlas manager without selecting a face', () => {
    useBlockStore.setState({ draft: block(), highlightFace: -1 });
    render(<FaceSelector />);
    fireEvent.click(screen.getByText('Manage custom atlas…'));
    expect(screen.getByRole('dialog').textContent).toContain('selected:1792');
    fireEvent.click(screen.getByText('close-picker'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
