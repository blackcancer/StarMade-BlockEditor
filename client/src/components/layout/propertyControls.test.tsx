import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlockDef } from '../../store/blockStore.js';
import { BlockIdSelect, BlockTypeSelect, Field, VariantSelector } from './propertyControls.js';

const block = (id: number, xmlTypeName = `TYPE_${id}`, name = `${xmlTypeName} - Block ${id}`): BlockDef => ({
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

const blocks = [block(1), block(2)];

describe('propertyControls', () => {
  afterEach(cleanup);

  it('renders a field label, tooltip and child control', () => {
    render(<Field label="Hitpoints" tooltip="HP tooltip"><input aria-label="hp" /></Field>);
    expect(screen.getByText('Hitpoints').getAttribute('title')).toBe('HP tooltip');
    expect(screen.getByLabelText('HP tooltip')).toBeTruthy();
    expect(screen.getByLabelText('hp')).toBeTruthy();
  });

  it('adds and removes variant ids while preventing duplicates/empty values', () => {
    const onChange = vi.fn();
    const { rerender } = render(<VariantSelector ids={[1]} options={blocks} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith([1, 2]);

    rerender(<VariantSelector ids={[1, 2]} options={blocks} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Block 1 ×/));
    expect(onChange).toHaveBeenLastCalledWith([2]);
  });

  it('renders empty/unknown variant states', () => {
    render(<VariantSelector ids={[99]} options={blocks} onChange={vi.fn()} />);
    expect(screen.getByText(/Unknown block ×/)).toBeTruthy();
  });

  it('selects block type and block id values', () => {
    const onTypeChange = vi.fn();
    const onIdChange = vi.fn();
    render(
      <>
        <BlockTypeSelect blocks={blocks} value="TYPE_1" onChange={onTypeChange} />
        <BlockIdSelect blocks={blocks} value={0} onChange={onIdChange} allowNone />
      </>,
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'TYPE_2' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '2' } });
    expect(onTypeChange).toHaveBeenCalledWith('TYPE_2');
    expect(onIdChange).toHaveBeenCalledWith(2);
  });
});
