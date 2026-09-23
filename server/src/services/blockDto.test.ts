import { describe, expect, it } from 'vitest';
import { BlockConfig, BlockDefinition } from 'starmade-decoder';
import { toBlockDto, updateDefinition } from './blockDto.js';

const xml = `<Config><Element><General><Armor><Block type="HULL" name="Hull" icon="3" textureId="1, 2, 3" vendor="keep">
<Hitpoints unit="legacy">00100</Hitpoints><Mass>1.5</Mass><Door>true</Door>
<LodShape>mesh</LodShape><LodShapeSwitchStyleActive>active</LodShapeSwitchStyleActive><ResourceInjection>17</ResourceInjection>
<InRecipe>false</InRecipe><ChamberRoot>12</ChamberRoot><ChamberChildren>{13, 14}</ChamberChildren>
<Consistence><Item count="2" vendor="nested">HULL</Item></Consistence>
<CollisionDefault extension="shape"><Type>BOX</Type><Slab>2</Slab><StyleId>1</StyleId></CollisionDefault>
<EffectArmor><Heat>0.5</Heat><EM>1.5</EM></EffectArmor><Extension note="x">  001  </Extension>
</Block></Armor></General></Element></Config>`;
function original(): BlockDefinition { return BlockConfig.fromXml(xml, new Map([['HULL', 1]])).getById(1)!; }
function exported(block: BlockDefinition): string { return BlockConfig.fromBlocks([block]).toXml(); }

describe('Decoder to editor contract', () => {
  it('projects core and advanced fields while retaining unknown lexical XML values', () => {
    const source = original();
    const dto = toBlockDto(source, false, 'revision');
    expect(dto).toMatchObject({ id: 1, revision: 'revision', isCustom: false, textureId: [1, 2, 3], door: true,
      effectArmor: { Heat: 0.5, EM: 1.5 }, extraProperties: { LodShape: 'mesh', LodShapeSwitchStyleActive: 'active',
        ResourceInjection: 17, InRecipe: false, ChamberRoot: 12, ChamberChildren: '{13, 14}',
        Consistence: { Item: { '#text': 'HULL', '@_count': '2', '@_vendor': 'nested' } },
        Extension: { '#text': '  001  ', '@_note': 'x' }, '@_vendor': 'keep' } });
    dto.textureId[0] = 99;
    (dto.extraProperties.Extension as Record<string, unknown>)['#text'] = 'changed';
    expect(source.textureIds[0]).toBe(1);
    expect(exported(source)).toContain('  001  ');
  });

  it('applies core and advanced edits without losing original attributes or modifying the source', () => {
    const source = original();
    const draft = toBlockDto(source, false, 'revision');
    draft.hp = 101;
    draft.textureId = [4, 5, 6];
    draft.effectArmor = { Kinetic: 2 };
    draft.extraProperties.Consistence = { Item: { '#text': 'HULL', '@_count': 3 } };
    draft.extraProperties.InRecipe = true;
    const updated = updateDefinition(source, draft);
    expect(updated.hp).toBe(101);
    expect(updated.metadata.consistence).toEqual([{ type: 'HULL', count: 3 }]);
    expect(updated.metadata.inRecipe).toBe(true);
    expect(exported(updated)).toContain('<Hitpoints unit="legacy">101</Hitpoints>');
    expect(exported(updated)).toContain('vendor="nested"');
    expect(exported(updated)).toContain('  001  ');
    expect(toBlockDto(updated, true, 'next').effectArmor).toEqual({ Kinetic: 2 });
    expect(exported(source)).toContain('00100');
    expect(source.metadata.consistence[0].count).toBe(2);
  });

  it('preserves missing defaults and supports explicit removal of advanced fields', () => {
    const source = original();
    expect(exported(updateDefinition(source, toBlockDto(source, false, 'r')))).toBe(exported(source));
    const extra = toBlockDto(source, false, 'r').extraProperties;
    delete extra.LodShape;
    delete extra.Extension;
    const updated = updateDefinition(source, { extraProperties: extra });
    expect(updated.lodShape).toBe('');
    expect(exported(updated)).not.toContain('<LodShape>');
    expect(exported(updated)).not.toContain('<Extension');
  });

  it('supports all ordinary editable core fields through immutable model updates', () => {
    const source = BlockDefinition.create({ id: 5, name: 'New' });
    const patch = { name: 'Edited', icon: 7, textureId: [8], xmlTypeName: '5', hp: 200, mass: 2, volume: 3,
      price: 4, description: 'Text', armor: 0.5, isPlacable: false, inShop: false, hasOrientation: true,
      canActivate: true, isDeprecated: true, blockStyle: 6, slab: 3, slabIds: [1, 2], styleIds: [3],
      computerReference: 4, lightSource: true, lightSourceColor: [0.1, 0.2, 0.3, 2], transparency: true,
      door: true, logicBlock: true, individualSides: 3, sideTexturesPointToOrientation: true,
      hasActivationTexture: true, extendedTexture4x4: true, onlyDrawnInBuildMode: true, lodShapeFromFar: 2, animated: true };
    expect(toBlockDto(updateDefinition(source, patch), true, 'r')).toMatchObject(patch);
  });

  it('retains lexical attributes when scalar or repeated advanced values are edited', () => {
    const source = original();
    const extra = toBlockDto(source, false, 'r').extraProperties;
    extra.Extension = 'edited';
    extra.Consistence = { Item: [{ '#text': 'HULL', '@_count': 3 }, { '#text': 'HULL', '@_count': 4 }] };
    extra.NewExtension = { Child: ['a', 'b'] };
    let updated = updateDefinition(source, { extraProperties: extra });
    expect(exported(updated)).toContain('<Extension note="x">edited</Extension>');
    expect(exported(updated)).toContain('vendor="nested"');
    expect(updated.metadata.consistence.map(item => item.count)).toEqual([3, 4]);
    const second = toBlockDto(updated, false, 'r').extraProperties;
    second.Consistence = { Item: [{ '#text': 'HULL', '@_count': 5 }] };
    updated = updateDefinition(updated, { extraProperties: second });
    expect(updated.metadata.consistence.map(item => item.count)).toEqual([5]);
    second.Consistence = '';
    expect(updateDefinition(updated, { extraProperties: second }).metadata.consistence).toEqual([]);
  });

  it('reads armor text carrying attributes and handles armor-only patches', () => {
    const source = BlockConfig.fromXml('<Config><Block type="1" name="Hull"><EffectArmor><Heat unit="keep">2</Heat></EffectArmor></Block></Config>').getById(1)!;
    expect(toBlockDto(source, false, 'r').effectArmor).toEqual({ Heat: 2 });
    expect(exported(updateDefinition(source, { effectArmor: { Heat: 3 } }))).toContain('<Heat unit="keep">3</Heat>');
    const updated = updateDefinition(source, { effectArmor: {} });
    expect(toBlockDto(updated, false, 'r').effectArmor).toEqual({});
    const extension = BlockConfig.fromXml('<Config><Block type="1" name="Hull"><EffectArmor marker="keep"><Opaque>unknown</Opaque></EffectArmor></Block></Config>').getById(1)!;
    expect(exported(updateDefinition(extension, { effectArmor: { Heat: 2 } }))).toContain('<EffectArmor marker="keep"><Opaque>unknown</Opaque>');
    const missing = BlockConfig.fromXml('<Config><Block type="1" name="Hull"/></Config>').getById(1)!;
    expect(toBlockDto(updateDefinition(missing, { effectArmor: { Heat: 2 } }), false, 'r').effectArmor).toEqual({ Heat: 2 });
  });

  it('rejects excessive nesting and arrays before serialization', () => {
    let nested: unknown = 'leaf';
    for (let i = 0; i < 26; i++) nested = { Child: nested };
    expect(() => updateDefinition(original(), { extraProperties: { Deep: nested } })).toThrow(/nesting/);
    expect(() => updateDefinition(original(), { extraProperties: { Huge: Array(4097).fill('x') } })).toThrow(/large/);
    expect(() => updateDefinition(original(), { slabIds: Array(4097).fill(1) })).toThrow(/bounded/);
  });

  it.for<unknown>([
    null, [], 3, { unexpected: true }, { constructor: 1 }, { id: 99 }, { name: '' }, { name: 42 }, { description: false },
    { hp: -1 }, { hp: 1.5 }, { hp: '2' }, { mass: Infinity }, { mass: -0.1 }, { price: Number.NaN },
    { icon: -1 }, { blockStyle: 7 }, { slab: 4 }, { individualSides: 2 }, { lodShapeFromFar: -1 },
    { lightSource: 'false' }, { textureId: '1' }, { textureId: [1, 2] }, { textureId: [2048] },
    { slabIds: [4095] }, { styleIds: [null] }, { lightSourceColor: [1, 2, 3] }, { lightSourceColor: [1, -1, 1, 1] },
    { effectArmor: [] }, { effectArmor: { Heat: 'oops' } }, { extraProperties: null },
    { extraProperties: { '@_type': 'OTHER' } }, { extraProperties: { 'bad key': 'x' } },
    { extraProperties: { InRecipe: 'bad' } }, { extraProperties: { ResourceInjection: {} } },
    { extraProperties: { Unknown: null } }, { extraProperties: { Unknown: Number.NaN } },
    { extraProperties: { constructor: 'unsafe' } }, { isCustom: 1 }, { revision: false },
    { name: 'Invalid\u0000name' }, { extraProperties: { Unknown: '\ud800' } },
  ])('rejects malformed mutation %# without changing the model', patch => {
    const source = original();
    expect(() => updateDefinition(source, patch)).toThrow(TypeError);
    expect(source.hp).toBe(100);
  });
});
