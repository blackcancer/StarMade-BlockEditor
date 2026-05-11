import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { ViewerColumn } from './Viewer.js';

vi.mock('../../3d/BlockViewer.js', () => ({ BlockViewer: () => <div data-testid="block-viewer" /> }));
vi.mock('../editor/FaceSelector.js', () => ({ FaceSelector: () => <div data-testid="face-selector" /> }));

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

describe('ViewerColumn', () => {
  beforeEach(() => {
    useBlockStore.setState({ draft: null, orientation: 0, previewActive: true });
  });
  afterEach(cleanup);

  it('shows an empty prompt when no draft is selected', () => {
    render(<ViewerColumn />);
    expect(screen.getByTestId('block-viewer')).toBeTruthy();
    expect(screen.getByText('Select a block from the list to preview it.')).toBeTruthy();
    expect(screen.queryByTestId('face-selector')).toBeNull();
  });

  it('renders style, face selector and orientation controls for a draft', () => {
    useBlockStore.setState({ draft: block({ blockStyle: 1 }), orientation: 0 });
    render(<ViewerColumn />);

    expect(screen.getByText('Wedge (style 1)')).toBeTruthy();
    expect(screen.getByTestId('face-selector')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(12);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
    expect(useBlockStore.getState().orientation).toBe(3);

    fireEvent.click(screen.getByTitle('Previous orientation'));
    expect(useBlockStore.getState().orientation).toBe(2);
    fireEvent.click(screen.getByTitle('Next orientation'));
    expect(useBlockStore.getState().orientation).toBe(3);
  });

  it('resets invalid orientation when block style supports fewer orientations', () => {
    useBlockStore.setState({ draft: block({ blockStyle: 3 }), orientation: 9 });
    render(<ViewerColumn />);
    expect(useBlockStore.getState().orientation).toBe(0);
  });

  it('uses fallback of 6 orientations for unknown block styles', () => {
    // blockStyle 99 not in ORIENTATION_COUNT → ?? 6
    useBlockStore.setState({ draft: block({ blockStyle: 99 as any }), orientation: 0 });
    render(<ViewerColumn />);
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  it('shows active preview only for light or activation-texture blocks, not canActivate alone', () => {
    const { rerender } = render(<ViewerColumn />);
    useBlockStore.setState({ draft: block({ canActivate: true, lightSource: false, hasActivationTexture: false }) });
    rerender(<ViewerColumn />);
    expect(screen.queryByText(/preview/)).toBeNull();

    useBlockStore.setState({ draft: block({ hasActivationTexture: true }), previewActive: true });
    rerender(<ViewerColumn />);
    expect(screen.getByText(/Activation texture preview/)).toBeTruthy();
    fireEvent.click(screen.getByText('Toggle'));
    expect(useBlockStore.getState().previewActive).toBe(false);

    // lightSource branch — shows 'Light preview' instead of 'Activation texture preview'
    useBlockStore.setState({ draft: block({ lightSource: true, hasActivationTexture: false }), previewActive: false });
    rerender(<ViewerColumn />);
    expect(screen.getByText(/Light preview/)).toBeTruthy();
    expect(screen.getByText(/OFF/)).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(useBlockStore.getState().previewActive).toBe(true);
  });
});
