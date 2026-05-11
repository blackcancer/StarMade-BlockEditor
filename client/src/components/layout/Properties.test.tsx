import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { Properties } from './Properties.js';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  deleteBlock: vi.fn(),
}));

vi.mock('../../hooks/useApi.js', () => ({
  useSaveBlock: () => ({ save: mocks.save }),
  useDeleteBlock: () => ({ deleteBlock: mocks.deleteBlock }),
}));
vi.mock('../editor/IconPicker.js', () => ({
  IconPicker: ({ selectedIconId, onSelect, onClose }: { selectedIconId: number; onSelect: (id: number) => void; onClose: () => void }) => (
    <div role="dialog" aria-label="icon-picker">
      <span>icon:{selectedIconId}</span>
      <button onClick={() => onSelect(77)}>pick-icon-77</button>
      <button onClick={onClose}>close-icon-picker</button>
    </div>
  ),
}));
vi.mock('./advancedProperties.js', () => ({
  ExtraPropertiesEditor: ({ onChange }: { onChange: (value: Record<string, unknown>) => void }) => (
    <button type="button" onClick={() => onChange({ CustomField: 'ok' })}>edit-extra</button>
  ),
}));

const block = (patch: Partial<BlockDef> = {}): BlockDef => ({
  id: 1,
  name: 'HULL -- Grey Hull',
  icon: 10,
  textureId: [1, 2, 3, 4, 5, 6],
  xmlTypeName: 'HULL',
  hp: 10,
  mass: 1,
  volume: 1,
  price: 100,
  description: 'desc',
  armor: 0.2,
  isPlacable: true,
  inShop: true,
  hasOrientation: false,
  canActivate: false,
  isDeprecated: false,
  blockStyle: 0,
  slab: 0,
  slabIds: [],
  styleIds: [],
  effectArmor: { Heat: 0.1 },
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

function seed(draft: BlockDef, blocks: BlockDef[] = [draft, block({ id: 2, name: 'ALT -- Variant', xmlTypeName: 'ALT' })]) {
  useBlockStore.setState({
    blocks,
    selectedBlock: draft,
    draft: { ...draft },
    isDirty: false,
    error: null,
  });
}

describe('Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('alert', vi.fn());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    useBlockStore.setState({ blocks: [], selectedBlock: null, draft: null, isDirty: false, error: null });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows an empty placeholder with no draft', () => {
    render(<Properties />);
    expect(screen.getByText('Select a block to edit its properties.')).toBeTruthy();
  });

  it('edits identity, stats, shape, flags and extra properties through the draft store', () => {
    seed(block());
    render(<Properties />);

    expect(screen.getAllByText('Grey Hull').length).toBeGreaterThan(0);
    expect(screen.getByText('Vanilla block')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('HULL -- Grey Hull'), { target: { value: 'Better Hull' } });
    fireEvent.change(screen.getByDisplayValue('desc'), { target: { value: 'better desc' } });
    fireEvent.change(screen.getAllByDisplayValue('10')[1], { target: { value: '20' } });
    fireEvent.change(screen.getByDisplayValue('0.2'), { target: { value: '0.5' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '1' } });
    fireEvent.click(screen.getByText('Activation texture').closest('label')!.querySelector('input')!);
    fireEvent.click(screen.getByText('edit-extra'));

    expect(useBlockStore.getState().draft).toMatchObject({
      name: 'Better Hull',
      description: 'better desc',
      hp: 20,
      armor: 0.5,
      blockStyle: 1,
      hasActivationTexture: true,
      extraProperties: { CustomField: 'ok' },
    });
    expect(useBlockStore.getState().isDirty).toBe(true);
  });

  it('handles light color editors and palette presets when lightSource is enabled', () => {
    seed(block({ lightSource: true, lightSourceColor: [1, 0, 0, 0.5] }));
    render(<Properties />);

    fireEvent.change(screen.getAllByDisplayValue('#ff0000')[0], { target: { value: '#00ff00' } });
    expect(useBlockStore.getState().draft?.lightSourceColor.slice(0, 3)).toEqual([0, 1, 0]);

    fireEvent.change(screen.getAllByDisplayValue('#00ff00')[1], { target: { value: '#bad' } });
    expect(useBlockStore.getState().draft?.lightSourceColor.slice(0, 3)).toEqual([0, 1, 0]);
    fireEvent.change(screen.getAllByDisplayValue('#00ff00')[1], { target: { value: '#0000ff' } });
    expect(useBlockStore.getState().draft?.lightSourceColor.slice(0, 3)).toEqual([0, 0, 1]);

    fireEvent.change(screen.getByTitle('Emissive intensity'), { target: { value: '1.5' } });
    expect(useBlockStore.getState().draft?.lightSourceColor[3]).toBe(1.5);

    const colorNumberInputs = document.querySelectorAll('.light-color-row input');
    fireEvent.change(colorNumberInputs[0], { target: { value: '0.25' } });
    expect(useBlockStore.getState().draft?.lightSourceColor[0]).toBe(0.25);

    fireEvent.click(screen.getByTitle('#60b8ff'));
    expect(useBlockStore.getState().draft?.lightSourceColor[0]).toBeCloseTo(0x60 / 255);
  });


  it('edits the remaining numeric, select, flag and variant controls', () => {
    seed(block(), [block(), block({ id: 2, name: 'ALT -- Variant', xmlTypeName: 'ALT' }), block({ id: 3, name: 'BETA -- Style', xmlTypeName: 'BETA' })]);
    render(<Properties />);

    const numberInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: '11' } });
    fireEvent.change(numberInputs[2], { target: { value: '2.5' } });
    fireEvent.change(numberInputs[3], { target: { value: '3.5' } });
    fireEvent.change(numberInputs[4], { target: { value: '150' } });
    fireEvent.change(document.querySelectorAll('.effect-armor-grid input')[0], { target: { value: '0.3' } });
    fireEvent.change(numberInputs[numberInputs.length - 1], { target: { value: '9' } });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '2' } });
    fireEvent.change(selects[2], { target: { value: '3' } });
    fireEvent.change(selects[3], { target: { value: '2' } });

    fireEvent.click(screen.getByText('Textures follow orientation').closest('label')!.querySelector('input')!);
    fireEvent.click(screen.getByText('Build-mode only').closest('label')!.querySelector('input')!);
    fireEvent.click(screen.getByText('Animated').closest('label')!.querySelector('input')!);

    fireEvent.change(selects[4], { target: { value: '2' } });
    expect(useBlockStore.getState().draft?.slabIds).toEqual([2]);
    fireEvent.click(screen.getByText('Variant ×'));
    expect(useBlockStore.getState().draft?.slabIds).toEqual([]);
    fireEvent.change(selects[5], { target: { value: '3' } });

    expect(useBlockStore.getState().draft).toMatchObject({
      icon: 11,
      mass: 2.5,
      volume: 3.5,
      price: 150,
      slab: 2,
      individualSides: 3,
      computerReference: 2,
      sideTexturesPointToOrientation: true,
      onlyDrawnInBuildMode: true,
      animated: true,
      styleIds: [3],
    });
    expect(useBlockStore.getState().draft?.effectArmor?.Heat).toBe(0.3);
    expect(useBlockStore.getState().draft?.lodShapeFromFar).toBe(9);
  });

  it('opens the icon picker, imports icons and reports import failures', async () => {
    seed(block({ isCustom: true }));
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, text: async () => 'ok' } as Response)
      .mockResolvedValueOnce({ ok: false, text: async () => 'bad image' } as Response);
    render(<Properties />);

    fireEvent.click(screen.getByTitle('Pick build icon'));
    expect(screen.getByRole('dialog').textContent).toContain('icon:10');
    fireEvent.click(screen.getByText('close-icon-picker'));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByText('Pick…'));
    expect(screen.getByRole('dialog').textContent).toContain('icon:10');
    fireEvent.click(screen.getByText('pick-icon-77'));
    expect(useBlockStore.getState().draft?.icon).toBe(77);

    const input = document.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [] } });
    expect(fetch).not.toHaveBeenCalled();
    const file = new File(['icon'], 'icon.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/textures/icon/77', expect.objectContaining({ method: 'PUT', body: file })));

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Icon import failed: Error: bad image')));
  });

  it('shows Importing… label while icon upload is in flight', async () => {
    seed(block({ isCustom: true }));
    let resolveImport!: (r: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise(res => { resolveImport = res; }));
    render(<Properties />);
    const input = document.querySelector('input[type="file"]')!;
    const file = new File(['icon'], 'icon.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    // While fetch is pending the button should read 'Importing…'
    await waitFor(() => expect(screen.getByText('Importing…')).toBeTruthy());
    // Resolve so the component can clean up
    resolveImport({ ok: true, text: async () => 'ok' } as Response);
    await waitFor(() => expect(screen.getByText('Import…')).toBeTruthy());
  });

  it('saves, reverts and deletes custom blocks with confirmation', () => {
    const original = block({ isCustom: true, name: 'Custom Hull' });
    seed(original);
    useBlockStore.setState({ isDirty: true, draft: { ...original, name: 'Changed' } });
    render(<Properties />);

    fireEvent.click(screen.getByText('💾 Save to Custom'));
    expect(mocks.save).toHaveBeenCalled();

    fireEvent.click(screen.getByText('↩ Revert'));
    expect(useBlockStore.getState().draft?.name).toBe('Custom Hull');

    fireEvent.click(screen.getByText('🗑 Delete'));
    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.deleteBlock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Custom Hull' }));
  });

  it('renders API errors and does not delete when confirmation is cancelled', () => {
    seed(block({ isCustom: true }));
    useBlockStore.setState({ error: 'save failed' });
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<Properties />);

    expect(screen.getByText('save failed')).toBeTruthy();
    fireEvent.click(screen.getByText('🗑 Delete'));
    expect(mocks.deleteBlock).not.toHaveBeenCalled();
  });
});
