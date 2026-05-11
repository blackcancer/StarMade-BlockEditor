import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlockDef } from '../../store/blockStore.js';
import { ExtraPropertiesEditor } from './advancedProperties.js';

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
  afterEach(cleanup);

  it('shows an empty state, filters properties and edits generic other values', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ExtraPropertiesEditor value={{}} blocks={blocks} onChange={onChange} />);
    expect(screen.getByText('No additional BlockConfig properties.')).toBeTruthy();

    rerender(<ExtraPropertiesEditor value={{ CustomString: 'hello', CustomNumber: 2, CustomBool: true, Nested: { '#text': 'value' } }} blocks={blocks} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search 4 properties…'), { target: { value: 'custom string' } });
    expect(screen.getByText('Custom String')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search 4 properties…'), { target: { value: 'nested' } });
    expect(screen.getByText('Nested')).toBeTruthy();
    expect(screen.queryByText('Custom String')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search 4 properties…'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No property matches “zzzz”.')).toBeTruthy();

    fireEvent.click(screen.getByText('Clear'));
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

    rerender(<ExtraPropertiesEditor value={{ InRecipe: true, BlockResourceType: 2, RecipeBuyResource: { Element: 'METAL' }, Consistence: { Item: { '#text': 'METAL', '@_count': '2' } }, CubatomConsistence: '' }} blocks={blocks} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Consistence: { Item: [{ '#text': 'METAL', '@_count': '4' }] } }));
    fireEvent.click(screen.getByText('+ Add material'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Consistence: { Item: [{ '#text': 'METAL', '@_count': '2' }, { '#text': 'METAL', '@_count': '1' }] } }));
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
    fireEvent.click(screen.getByText(/General chamber/).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ GeneralChamber: true }));
    fireEvent.change(screen.getByDisplayValue('GroupA'), { target: { value: 'GroupB' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ChamberConfigGroups: { Element: 'GroupB' } }));
    fireEvent.click(screen.getByText(/Main Combination Controller/).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ MainCombinationController: true }));
  });

  it('edits collision, lod and logic gameplay structured properties', () => {
    const onChange = vi.fn();
    render(<ExtraPropertiesEditor value={{
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

    fireEvent.click(screen.getByText('Physical').closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Physical: true }));
    fireEvent.change(screen.getByDisplayValue('None'), { target: { value: 'BlockType' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ CollisionDefault: { '@_type': 'BlockType', StyleId: 0, '@_slab': '0' } }));
    fireEvent.change(screen.getByDisplayValue('old.obj'), { target: { value: 'new.obj' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ DetailedCollisionForAstronautMode: { '@_type': 'ConvexHull', Mesh: 'new.obj' } }));
    fireEvent.change(screen.getByDisplayValue('lod-old'), { target: { value: 'lod-new' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ LodShape: 'lod-new' }));
    fireEvent.click(screen.getByText(/Sensor Input/).closest('label')!.querySelector('input')!);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ SensorInput: true }));
    fireEvent.change(screen.getByDisplayValue('Off'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ResourceInjection: 2 }));
  });
});
