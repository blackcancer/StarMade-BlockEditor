import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore, type BlockDef } from '../../store/blockStore.js';
import { Sidebar } from './BlockList.js';
import { useI18nStore } from '../../i18n/index.js';
import fr from '../../i18n/fr.js';

const block = (patch: Partial<BlockDef>): BlockDef => ({
  id: 1,
  name: 'HULL -- Grey Hull',
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

const vanilla = block({ id: 2, name: 'METAL_MESH -- Metal mesh', xmlTypeName: 'METAL_MESH', isCustom: false, blockStyle: 0 });
const custom = block({ id: 1, name: 'CUSTOM_BLOCK: My Custom', xmlTypeName: 'CUSTOM_BLOCK', isCustom: true, blockStyle: 3 });
const deprecated = block({ id: 3, name: '', xmlTypeName: 'OLD_BLOCK', isDeprecated: true, blockStyle: 2 });

describe('Sidebar', () => {
  beforeEach(() => {
    useBlockStore.setState({
      blocks: [vanilla, custom, deprecated],
      selectedBlock: null, draft: null, isDirty: false,
      filter: { search: '', showCustom: true, showVanilla: true, showDeprecated: false },
      loading: false,
      error: null,
    });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); useI18nStore.getState().setLocale('en'); });

  it('localizes recognized catalogue failures without a technical detail panel', () => {
    useI18nStore.getState().setLocale('fr');
    useBlockStore.setState({ error: 'Invalid block catalogue' });
    render(<Sidebar />);
    expect(screen.getByText(fr.errors.catalogue)).toBeTruthy();
    expect(screen.queryByText(fr.errors.technicalDetails)).toBeNull();
  });

  it('renders human-readable names, counts and sorted cards while hiding deprecated by default', () => {
    render(<Sidebar />);
    expect(screen.getByText('My Custom')).toBeTruthy();
    expect(screen.getByText('Metal mesh')).toBeTruthy();
    expect(screen.queryByText('OLD_BLOCK')).toBeNull();
    expect(screen.getByText('Vanilla: 2 · Custom: 1')).toBeTruthy();
    expect(screen.getByText('★ Custom')).toBeTruthy();
  });

  it('filters by search, custom/vanilla/deprecated toggles and shows empty state', () => {
    render(<Sidebar />);

    fireEvent.change(screen.getByPlaceholderText('🔍 Search block…'), { target: { value: 'metal' } });
    expect(screen.getByText('Metal mesh')).toBeTruthy();
    expect(screen.queryByText('My Custom')).toBeNull();

    fireEvent.click(screen.getByLabelText(/Vanilla/));
    expect(screen.getByText('No blocks match your search.')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Vanilla/));
    fireEvent.change(screen.getByPlaceholderText('🔍 Search block…'), { target: { value: 'old' } });
    fireEvent.click(screen.getByLabelText('Deprecated'));
    expect(screen.getByText('Old Block')).toBeTruthy();
    expect(screen.getByText('⚠ Deprecated')).toBeTruthy();
  });

  it('selects a clicked block and displays loading/error status', () => {
    useBlockStore.setState({ loading: true, error: 'failed' });
    render(<Sidebar />);
    fireEvent.click(screen.getByText('Metal mesh'));

    expect(useBlockStore.getState().selectedBlock?.id).toBe(2);
    expect(screen.getByText('Loading blocks…')).toBeTruthy();
    expect(screen.getByText('failed').closest('details')).toBeTruthy();
  });

  it('hides images on error and toggles custom filter', () => {
    const { container } = render(<Sidebar />);
    const img = container.querySelector('img')!;
    // Trigger onError — handler sets style.display = 'none'
    fireEvent.error(img);
    expect(img.style.display).toBe('none');

    // Toggle custom checkbox
    fireEvent.click(screen.getByLabelText(/Custom/));
    expect(useBlockStore.getState().filter.showCustom).toBe(false);
    expect(screen.queryByText('My Custom')).toBeNull();
    fireEvent.click(screen.getByLabelText(/Custom/));
    expect(useBlockStore.getState().filter.showCustom).toBe(true);
  });

  it('falls back to prettified type when name equals the xml prefix only', () => {
    // name == prefix after slice → trim returns '' → prettifyTypeName(prefix)
    const b = block({ id: 5, xmlTypeName: 'HULL', name: 'HULL', isCustom: false });
    useBlockStore.setState({ blocks: [b], filter: { search: '', showCustom: true, showVanilla: true, showDeprecated: false } });
    render(<Sidebar />);
    expect(screen.getByText('Hull')).toBeTruthy();
  });

  it('falls back to block id string when both name and typePrefix are empty', () => {
    const b = block({ id: 99, xmlTypeName: '', name: '', isCustom: false });
    useBlockStore.setState({ blocks: [b], filter: { search: '', showCustom: true, showVanilla: true, showDeprecated: false } });
    render(<Sidebar />);
    expect(screen.getByText('99')).toBeTruthy();
  });
  it('preserves unsaved changes on same-block clicks and cancelled navigation', () => {
    useBlockStore.getState().selectBlock(vanilla); useBlockStore.getState().updateDraft({ name: 'Unsaved' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); render(<Sidebar />);
    fireEvent.click(screen.getByText('Metal mesh')); expect(confirm).not.toHaveBeenCalled(); expect(useBlockStore.getState().draft?.name).toBe('Unsaved');
    fireEvent.click(screen.getByText('My Custom')); expect(confirm).toHaveBeenCalledOnce(); expect(useBlockStore.getState().draft?.name).toBe('Unsaved');
    confirm.mockReturnValue(true); fireEvent.click(screen.getByText('My Custom')); expect(useBlockStore.getState().selectedBlock?.id).toBe(1); expect(useBlockStore.getState().isDirty).toBe(false);
  });
  it('finds blocks by numeric identifier even when its name and type do not match', () => {
    render(<Sidebar />); fireEvent.change(screen.getByPlaceholderText('🔍 Search block…'), { target: { value: '2' } });
    expect(screen.getByText('Metal mesh')).toBeTruthy(); expect(screen.queryByText('My Custom')).toBeNull();
  });

  it('opens the accepted block with a keyboard-accessible card, keeping cancelled navigation in the list', () => {
    const open = vi.fn();
    useBlockStore.getState().selectBlock(vanilla); useBlockStore.getState().updateDraft({ name: 'Draft' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Sidebar onBlockOpen={open} />);
    const current = screen.getByRole('button', { name: /Metal mesh/ });
    expect(current.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(current); expect(open).toHaveBeenCalledOnce(); expect(confirm).not.toHaveBeenCalled();
    expect(useBlockStore.getState().draft?.name).toBe('Draft');
    fireEvent.click(screen.getByRole('button', { name: /My Custom/ })); expect(open).toHaveBeenCalledOnce();
    confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: /My Custom/ }));
    expect(open).toHaveBeenCalledTimes(2); expect(useBlockStore.getState().selectedBlock?.id).toBe(1);
  });

});
