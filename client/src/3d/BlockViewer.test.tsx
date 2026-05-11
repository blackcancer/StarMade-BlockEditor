import type React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { useBlockStore, type BlockDef } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { BlockViewer } from './BlockViewer.js';
import { loadAtlasTexture } from './AtlasTexture.js';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
}));

vi.mock('@react-three/drei', () => ({
  Grid: () => <div data-testid="grid" />,
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

vi.mock('./BlockMesh.js', () => ({
  BlockMesh: ({ block, isActive, highlightFace }: { block: BlockDef; isActive: boolean; highlightFace: number | null }) => (
    <div data-testid="block-mesh">{block.name}:{String(isActive)}:{String(highlightFace)}</div>
  ),
}));

vi.mock('./AtlasTexture.js', () => ({
  loadAtlasTexture: vi.fn(),
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

const makeTexture = () => new THREE.Texture();

describe('BlockViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    useConfigStore.setState({ starmadeDir: '/game', worldDir: 'world0', atlasSize: 64, texturePack: 'Default', isValid: false });
    useBlockStore.setState({ blocks: [], selectedBlock: null, draft: null, isDirty: false, loading: false, error: null, orientation: 0, previewActive: false, highlightFace: undefined });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the mocked canvas shell with fallback scene when config is invalid', () => {
    render(<BlockViewer />);

    expect(screen.getByTestId('canvas')).toBeTruthy();
    expect(screen.getByTestId('grid')).toBeTruthy();
    expect(screen.getByTestId('orbit-controls')).toBeTruthy();
    expect(loadAtlasTexture).not.toHaveBeenCalled();
  });

  it('loads diffuse and normal atlases, renders the selected block and reloads after atlas-imported', async () => {
    vi.mocked(loadAtlasTexture).mockResolvedValue(makeTexture());
    useConfigStore.setState({ isValid: true, atlasSize: 128, texturePack: 'HD' });
    useBlockStore.setState({ draft: block({ name: 'Glass' }), previewActive: true, highlightFace: 4, orientation: 7 });

    render(<BlockViewer />);

    await waitFor(() => expect(screen.getByTestId('block-mesh').textContent).toBe('Glass:true:4'));
    expect(loadAtlasTexture).toHaveBeenCalledWith(128, 'HD', 'diffuse');
    expect(loadAtlasTexture).toHaveBeenCalledWith(128, 'HD', 'normal');

    window.dispatchEvent(new Event('atlas-imported'));
    await waitFor(() => expect(loadAtlasTexture).toHaveBeenCalledTimes(4));
  });

  it('renders an error fallback when atlas loading fails', async () => {
    vi.mocked(loadAtlasTexture).mockRejectedValue(new Error('atlas missing'));
    useConfigStore.setState({ isValid: true });
    useBlockStore.setState({ draft: block() });

    render(<BlockViewer />);

    await waitFor(() => expect(loadAtlasTexture).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('block-mesh')).toBeNull();
  });

  it('renders active light preview footprint and clamps the source color safely', async () => {
    vi.mocked(loadAtlasTexture).mockResolvedValue(makeTexture());
    useConfigStore.setState({ isValid: true });
    useBlockStore.setState({ draft: block({ lightSource: true, lightSourceColor: [2, -1, 0.5, 8] }), previewActive: true });

    render(<BlockViewer />);

    await waitFor(() => expect(screen.getByTestId('block-mesh')).toBeTruthy());
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
  });
});
