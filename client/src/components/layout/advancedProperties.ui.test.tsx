import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlockDef } from '../../store/blockStore.js';
import { ExtraPropertiesEditor } from './advancedProperties.js';
import en from '../../i18n/en.js';
import fr from '../../i18n/fr.js';
import { useI18nStore } from '../../i18n/index.js';

const block = (id: number, xmlTypeName = `TYPE_${id}`, name = `${xmlTypeName} -- Block ${id}`): BlockDef => ({
  id,
  name,
  icon: id,
  textureId: [id],
  xmlTypeName,
  hp: 1,
  mass: 1,
  volume: 1,
  price: 1,
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
});

const blocks = [block(1, 'METAL'), block(2, 'CRYSTAL')];

describe('ExtraPropertiesEditor UI', () => {
  afterEach(() => { cleanup(); useI18nStore.getState().setLocale('en'); });

  it('localizes known XML fields and nested metadata while preserving extension keys and search', () => {
    useI18nStore.getState().setLocale('fr');
    render(<ExtraPropertiesEditor value={{ Physical: true, CustomExtension: { '#text': 'a', '@_count': '3' } }} blocks={blocks} onChange={vi.fn()} />);
    expect(screen.getByText(fr.extraLabel.Physical)).toBeTruthy();
    expect(screen.getByText(fr.advanced.value)).toBeTruthy();
    expect(screen.getByText(fr.advanced.count)).toBeTruthy();
    expect(screen.getByText('CustomExtension')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(fr.advanced.searchPlaceholder(2)), { target: { value: fr.extraLabel.Physical } });
    expect(screen.getByText(fr.extraLabel.Physical)).toBeTruthy();
    expect(screen.queryByText('CustomExtension')).toBeNull();
  });

  it('shows an empty state, filters properties and edits generic other values', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ExtraPropertiesEditor value={{}} blocks={blocks} onChange={onChange} />);
    expect(screen.getByText('No additional BlockConfig properties.')).toBeTruthy();

    rerender(<ExtraPropertiesEditor value={{ CustomString: 'hello', CustomNumber: 2, CustomBool: true, Nested: { '#text': 'value' } }} blocks={blocks} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search 4 properties…'), { target: { value: 'custom string' } });
    expect(screen.getByText('CustomString')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search 4 properties…'), { target: { value: 'nested' } });
    expect(screen.getByText('Nested')).toBeTruthy();
    expect(screen.queryByText('CustomString')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search 4 properties…'), { target: { value: 'zzzz' } });
    expect(screen.getByText(en.advanced.noMatch('zzzz'))).toBeTruthy();

    fireEvent.click(screen.getByText(en.advanced.clear));
    fireEvent.change(screen.getByDisplayValue('hello'), { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CustomString: 'world' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CustomBool: false }));
  });


  it('edits multiline, array, object and empty generic property values', () => {
    const onChange = vi.fn();
    render(<ExtraPropertiesEditor value={{
      LongText: 'x'.repeat(80),
      ListValue: ['one', 2],
      ObjectValue: { NestedNumber: 3 },
      EmptyValue: null,
    }} blocks={blocks} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('x'.repeat(80)), { target: { value: 'shorter' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ LongText: 'shorter' }));

    fireEvent.change(screen.getByDisplayValue('one'), { target: { value: 'two' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ListValue: ['two', 2] }));

    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ObjectValue: { NestedNumber: 4 } }));

    const emptyInputs = screen.getAllByDisplayValue('');
    fireEvent.change(emptyInputs[emptyInputs.length - 1], { target: { value: 'filled' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ EmptyValue: 'filled' }));
  });

  it('edits recipe resources and preserves inactive recipe fields', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ExtraPropertiesEditor value={{ InRecipe: false, Consistence: { Item: { '#text': 'METAL', '@_count': '2' } } }} blocks={blocks} onChange={onChange} />);
    expect(screen.getByText('Recipe fields are inactive because InRecipe is false.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('In recipe'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ InRecipe: true }));

    rerender(<ExtraPropertiesEditor value={{ InRecipe: true, BlockResourceType: 2, RecipeBuyResource: { Element: 'METAL' }, Consistence: { Item: { '#text': 'METAL', '@_count': '2' } }, CubatomConsistence: { Item: { '#text': 'CRYSTAL', '@_count': '3' } } }} blocks={blocks} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Basic resource'), { target: { value: '6' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ BlockResourceType: 6 }));
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Consistence: { Item: [{ '#text': 'METAL', '@_count': '4' }] } }));
    fireEvent.change(screen.getAllByDisplayValue('Block 1')[0], { target: { value: 'CRYSTAL' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ RecipeBuyResource: { Element: 'CRYSTAL' } }));
    fireEvent.change(screen.getAllByDisplayValue('Block 1')[1], { target: { value: 'CRYSTAL' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Consistence: { Item: [{ '#text': 'CRYSTAL', '@_count': '2' }] } }));
    fireEvent.click(screen.getByText('+ Add buy resource'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ RecipeBuyResource: { Element: ['METAL', 'METAL'] } }));
    fireEvent.click(screen.getByText('+ Add material'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Consistence: { Item: [{ '#text': 'METAL', '@_count': '2' }, { '#text': 'METAL', '@_count': '1' }] } }));
    fireEvent.click(screen.getByText(en.advanced.addCubatom));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CubatomConsistence: { Item: [{ '#text': 'CRYSTAL', '@_count': '3' }, { '#text': 'METAL', '@_count': '1' }] } }));
    fireEvent.click(screen.getAllByTitle(en.advanced.noResources)[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Consistence: '' }));
    fireEvent.click(screen.getAllByText('×')[0]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ RecipeBuyResource: '' }));
  });

  it('edits factory, chamber and controller structured properties', () => {
    const onChange = vi.fn();
    render(<ExtraPropertiesEditor value={{
      ProducedInFactory: 1,
      BasicResourceFactory: 0,
      FactoryBakeTime: 2,
      Factory: 'INPUT',
      GeneralChamber: false,
      ChamberCapacity: 1,
      ChamberRoot: 0,
      ChamberParent: 0,
      ChamberUpgradesTo: 0,
      ChamberPermission: 0,
      ChamberConfigGroups: { Element: 'GroupA' },
      ControlledBy: { Element: 'METAL' },
      Controlling: '',
      MainCombinationController: false,
    }} blocks={blocks} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('Capsule refinery'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ProducedInFactory: 3 }));
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '4.5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ FactoryBakeTime: 4.5 }));
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ BasicResourceFactory: 2 }));
    fireEvent.change(selects[2], { target: { value: 'OUTPUT' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Factory: 'OUTPUT' }));
    fireEvent.click(screen.getByText(/General chamber/).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ GeneralChamber: true }));
    fireEvent.change(screen.getByDisplayValue('GroupA'), { target: { value: 'GroupB' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ChamberConfigGroups: { Element: 'GroupB' } }));
    fireEvent.click(screen.getByText('+ Add group'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ChamberConfigGroups: { Element: 'GroupA' } }));
    fireEvent.change(selects[3], { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ChamberRoot: 2 }));
    fireEvent.click(screen.getByText(en.extraLabel.MainCombinationController).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ MainCombinationController: true }));
    fireEvent.click(screen.getByText(en.extraLabel.SupportCombinationController).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ SupportCombinationController: true }));
    fireEvent.click(screen.getByText('+ Add controls'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Controlling: { Element: 'METAL' } }));
  });

  it('edits collision, lod and logic gameplay structured properties', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ExtraPropertiesEditor value={{
      Physical: false,
      CollisionDefault: { '@_type': 'None' },
      DetailedCollisionForAstronautMode: { '@_type': 'ConvexHull', Mesh: 'old.obj' },
      LodShape: 'lod-old',
      LodShapeSwitchStyleActive: 'lod-active',
      LodActivationAnimationStyle: 0,
      SensorInput: false,
      ResourceInjection: 0,
      ExplosionAbsorbtion: 0.1,
    }} blocks={blocks} onChange={onChange} />);

    fireEvent.click(screen.getByText(en.extraLabel.Physical).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Physical: true }));
    fireEvent.change(screen.getByDisplayValue('None'), { target: { value: 'BlockType' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CollisionDefault: { '@_type': 'BlockType', StyleId: 0, '@_slab': '0' } }));
    fireEvent.change(screen.getByDisplayValue('old.obj'), { target: { value: 'new.obj' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ DetailedCollisionForAstronautMode: { '@_type': 'ConvexHull', Mesh: 'new.obj' } }));
    rerender(<ExtraPropertiesEditor value={{ CollisionDefault: { '@_type': 'BlockType', StyleId: 0, '@_slab': '0' }, LodShape: 'lod-old', LodShapeSwitchStyleActive: 'lod-active', LodActivationAnimationStyle: 0, SensorInput: false, ResourceInjection: 0, ExplosionAbsorbtion: 0.1 }} blocks={blocks} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Cube'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CollisionDefault: { '@_type': 'BlockType', StyleId: 3, '@_slab': '0' } }));
    fireEvent.change(screen.getByDisplayValue('Full block'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CollisionDefault: { '@_type': 'BlockType', StyleId: 0, '@_slab': '2' } }));
    fireEvent.change(screen.getByDisplayValue('lod-old'), { target: { value: 'lod-new' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ LodShape: 'lod-new' }));
    fireEvent.change(screen.getByDisplayValue('lod-active'), { target: { value: 'lod-active-new' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ LodShapeSwitchStyleActive: 'lod-active-new' }));
    fireEvent.change(screen.getByDisplayValue('No active LOD switch'), { target: { value: '1' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ LodActivationAnimationStyle: 1 }));
    fireEvent.click(screen.getByText(en.extraLabel.SensorInput).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ SensorInput: true }));
    fireEvent.change(screen.getByDisplayValue('Off'), { target: { value: '17' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ResourceInjection: 17 }));
    fireEvent.change(screen.getByDisplayValue('0.1'), { target: { value: '0.9' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ExplosionAbsorbtion: 0.9 }));
  });

  it('edits chamber relationships, capacity and permissions without losing other fields', () => {
    const onChange = vi.fn();
    const value = { ChamberRoot: 1, ChamberCapacity: 1.25, ChamberPermission: 8,
      ChamberConfigGroups: { Element: ['GroupA', 'GroupB'] }, ControlledBy: { Element: 'METAL' }, CustomExtension: 'keep' };
    render(<ExtraPropertiesEditor value={value} blocks={blocks} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('1.25'), { target: { value: '2.5' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...value, ChamberCapacity: 2.5 });
    fireEvent.change(screen.getByDisplayValue('8'), { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...value, ChamberPermission: 9 });
    const selects = document.querySelectorAll('.chambers-editor select');
    fireEvent.change(selects[1], { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...value, ChamberParent: 2 });
    fireEvent.change(selects[2], { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...value, ChamberUpgradesTo: 2 });
    fireEvent.click(screen.getByDisplayValue('GroupA').parentElement!.querySelector('button')!);
    expect(onChange).toHaveBeenLastCalledWith({ ...value, ChamberConfigGroups: { Element: 'GroupB' } });
    fireEvent.click(screen.getByText(en.advanced.addControlledBy));
    expect(onChange).toHaveBeenLastCalledWith({ ...value, ControlledBy: { Element: ['METAL', 'METAL'] } });
  });

  it('shows an existing unknown injection code without silently replacing it with a known mode', () => {
    const onChange = vi.fn();
    render(<ExtraPropertiesEditor value={{ ResourceInjection: 2, CustomExtension: 'keep' }} blocks={blocks} onChange={onChange} />);
    const select = screen.getByDisplayValue('2') as HTMLSelectElement;
    expect(select.value).toBe('2');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: '17' } });
    expect(onChange).toHaveBeenCalledWith({ ResourceInjection: 17, CustomExtension: 'keep' });
  });

  it('covers float step, newline textarea, StringElementListEditor multi-item and missing @_count', () => {
    const onChange = vi.fn();
    // Float number → step=0.01 branch in ExtraValueEditor
    // Newline string → value.includes('\n') branch → textarea
    // Multi-item StringElementListEditor: editing item at index 1 covers the i !== index false branch
    // Consistence item missing @_count → ?? 1 fallback
    // LodShape absent → ?? '' fallback in LodMeshEditor
    // Factory key absent → 'Factory' in value === false → no Factory field
    render(<ExtraPropertiesEditor value={{
      FloatProp: 1.5,
      NewlineProp: 'line1\nline2',
      ChamberConfigGroups: { Element: ['GroupA', 'GroupB'] },
      Consistence: { Item: [{ '#text': 'METAL' }] },
      InRecipe: true,
      ProducedInFactory: 0,
      LodShape: null,
      LodShapeSwitchStyleActive: null,
      LodActivationAnimationStyle: null,
      SensorInput: false,
      ResourceInjection: null,
      ExplosionAbsorbtion: null,
    }} blocks={blocks} onChange={onChange} />) ;

    // Float → step 0.01
    const floatInput = screen.getByDisplayValue('1.5');
    expect(floatInput.getAttribute('step')).toBe('0.01');
    fireEvent.change(floatInput, { target: { value: '2.5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ FloatProp: 2.5 }));

    // Newline string → textarea
    const textareas = document.querySelectorAll('textarea');
    const textarea = textareas[textareas.length - 1] as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    fireEvent.change(textarea, { target: { value: 'changed' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ NewlineProp: 'changed' }));

    // StringElementListEditor multi-item: edit GroupB (index 1) → covers i !== index branch
    const groupInputs = screen.getAllByDisplayValue(/Group/);
    fireEvent.change(groupInputs[1], { target: { value: 'GroupC' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ChamberConfigGroups: { Element: ['GroupA', 'GroupC'] } }));

    // Consistence with missing @_count → count defaults to 1
    expect(screen.getByDisplayValue('1')).toBeTruthy();

    // LodShape absent → LodMeshEditor shows empty string input
    // Pass all three LOD keys but with null values → triggers ?? '' and ?? 0 branches
    const lodInputs = document.querySelectorAll('input[value=""]') as NodeListOf<HTMLInputElement>;
    expect(lodInputs.length).toBeGreaterThan(0);

    // 'Factory' not in value → Factory slot select is not rendered
    expect(screen.queryByText('Factory slot')).toBeNull();
  });

  it('covers ?? fallbacks in ResourceListEditor, ElementListEditor and normalizeResourceItems with empty blocks', () => {
    const onChange = vi.fn();
    render(<ExtraPropertiesEditor value={{
      Consistence: { Item: [{ '@_count': '2' }] },
      RecipeBuyResource: '',
      InRecipe: true,
      ProducedInFactory: null,
      BasicResourceFactory: null,
      FactoryBakeTime: null,
    }} blocks={[]} onChange={onChange} />);

    // ResourceListEditor + Add material with empty blocks → blocks[0]?.xmlTypeName === undefined → ?? ''
    // The existing item has no '#text' so name='' and it gets filtered out in serialization
    fireEvent.click(screen.getByText('+ Add material'));
    // Both items have name='' so serializeResourceList returns ''
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      Consistence: '',
    }));

    // ElementListEditor + Add buy resource with empty blocks → ?? ''
    // RecipeBuyResource is '' → normalizeElementList('') = [] → add button adds '' → serializeElementList(['']) = ''
    fireEvent.click(screen.getByText('+ Add buy resource'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ RecipeBuyResource: '' }));
  });

  it('covers false branch of i !== index in ResourceListEditor and ElementListEditor with multi-item lists', () => {
    const onChange = vi.fn();
    // 2 Consistence items → update index 0 → item at index 1 stays (covers i !== index false branch of ResourceListEditor)
    // 2 ElementList items → update index 0 → item at index 1 stays
    render(<ExtraPropertiesEditor value={{
      Consistence: { Item: [{ '#text': 'METAL', '@_count': '1' }, { '#text': 'CRYSTAL', '@_count': '2' }] },
      RecipeBuyResource: { Element: ['METAL', 'CRYSTAL'] },
      InRecipe: true,
      CustomNull: null,
    }} blocks={blocks} onChange={onChange} />);

    // Update count of first Consistence item → second item preserved (i !== index branch)
    const counts = document.querySelectorAll('input.resource-count');
    fireEvent.change(counts[0], { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      Consistence: { Item: [
        { '#text': 'METAL', '@_count': '5' },
        { '#text': 'CRYSTAL', '@_count': '2' },
      ]},
    }));

    // Update first ElementList item → second item preserved
    const selects = document.querySelectorAll('.element-list-editor select');
    fireEvent.change(selects[0], { target: { value: 'CRYSTAL' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      RecipeBuyResource: { Element: ['CRYSTAL', 'CRYSTAL'] },
    }));

    // value[key] === null → JSON.stringify(null ?? '') branch (matchesFilter on 'Other' group)
    const searchInput = document.querySelector('.extra-properties-toolbar input')! as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'custom' } });
    expect(screen.getByText('CustomNull')).toBeTruthy();
  });

  it('covers value.Factory ?? \'\'  and JSON.stringify(undefined ?? \'\') edge branches', () => {
    const onChange = vi.fn();
    render(<ExtraPropertiesEditor value={{
      ProducedInFactory: 0,
      Factory: null,
      CustomUndefined: undefined as unknown as string,
    }} blocks={blocks} onChange={onChange} />);

    // Factory: null → String(null ?? '') = '' → Factory slot field is rendered
    expect(screen.getByText('Factory slot')).toBeTruthy();
    // Find the select within Factory / Production group
    const selects = document.querySelectorAll('.production-editor select');
    const factorySlotSelect = selects[selects.length - 1] as HTMLSelectElement;
    expect(factorySlotSelect.value).toBe('');

    // matchesFilter on 'CustomUndefined' (undefined value) → JSON.stringify(undefined ?? '')
    const searchInput = document.querySelector('.extra-properties-toolbar input')! as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'custom' } });
    expect(screen.getByText('CustomUndefined')).toBeTruthy();
  });
});
