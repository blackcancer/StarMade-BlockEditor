import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { blocksRouter, collectExtraProperties, parseEffectArmor, serializeEffectArmor, warmBlockCache, getBlockIconIds } from './blocks.js';

describe('block API XML helpers', () => {
  it('parses effect armor records defensively', () => {
    expect(parseEffectArmor({ EM: '1.5', HEAT: 2, BAD: 'nan', INF: 'Infinity' })).toEqual({ EM: 1.5, HEAT: 2 });
    expect(parseEffectArmor(null)).toEqual({});
    expect(parseEffectArmor('bad')).toEqual({});
  });

  it('serializes effect armor only when values are finite and present', () => {
    expect(serializeEffectArmor({ EM: 1, HEAT: Number.NaN, KIN: Infinity })).toEqual({ EM: 1 });
    expect(serializeEffectArmor({})).toBeUndefined();
    expect(serializeEffectArmor({ BAD: Number.NaN })).toBeUndefined();
  });

  it('collects only non-core XML properties into the extra bag', () => {
    const extra = collectExtraProperties({
      '@_type': 'HULL',
      '@_icon': '1',
      IndividualSides: '6',
      Description: 'Core field',
      CustomFoo: 'bar',
      Nested: { A: 1 },
    });
    expect(extra).toEqual({ CustomFoo: 'bar', Nested: { A: 1 } });
  });
});

describe('blocks API routes', () => {
  const originalCwd = process.cwd();
  let tmp: string;
  let game: string;
  let app: express.Express;

  async function revision(): Promise<string> { return (await request(app).get('/blocks').expect(200)).headers.etag; }

  function writeFixtureFiles(): void {
    game = path.join(tmp, 'StarMade');
    const configDir = path.join(game, 'data', 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: game }), 'utf8');
    fs.writeFileSync(path.join(configDir, 'BlockTypes.properties'), 'HULL=1\nDOOR=2\nINVALID=not-a-number\n# comment\n', 'utf8');
    fs.writeFileSync(path.join(configDir, 'BlockConfig.xml'), `<?xml version="1.0"?>
<Config>
  <Element>
    <General>
      <Basic>
        <Block type="HULL" name="HULL -- Basic Hull" icon="5" textureId="1, 2, bad, 4">
          <Hitpoints>100</Hitpoints>
          <Mass>2.5</Mass>
          <Volume>3.5</Volume>
          <Price>50</Price>
          <Description>Hull desc</Description>
          <ArmorValue>0.25</ArmorValue>
          <Placable>false</Placable>
          <InShop>true</InShop>
          <Orientation>true</Orientation>
          <CanActivate>true</CanActivate>
          <Deprecated>false</Deprecated>
          <BlockStyle>1</BlockStyle>
          <Slab>2</Slab>
          <SlabIds>2, 3, nope</SlabIds>
          <StyleIds>4, 5</StyleIds>
          <EffectArmor><Heat>0.5</Heat><EM>1.5</EM></EffectArmor>
          <BlockComputerReference>2</BlockComputerReference>
          <LightSource>true</LightSource>
          <LightSourceColor>0.1,0.2,0.3</LightSourceColor>
          <Transparency>true</Transparency>
          <Door>false</Door>
          <LogicBlock>true</LogicBlock>
          <IndividualSides>6</IndividualSides>
          <SideTexturesPointToOrientation>true</SideTexturesPointToOrientation>
          <HasActivationTexture>true</HasActivationTexture>
          <ExtendedTexture4x4>true</ExtendedTexture4x4>
          <OnlyDrawnInBuildMode>true</OnlyDrawnInBuildMode>
          <LodShapeFromFar>7</LodShapeFromFar>
          <Animated>true</Animated>
          <CustomFoo>bar</CustomFoo>
        </Block>
        <Block type="DOOR" name="DOOR -- Door" icon="6" textureId="6"><Hitpoints>25</Hitpoints></Block>
        <Block type="UNKNOWN" name="Unknown" icon="0" textureId="0"><Hitpoints>1</Hitpoints></Block>
      </Basic>
    </General>
  </Element>
</Config>`, 'utf8');
  }

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-blocks-'));
    process.chdir(tmp);
    writeFixtureFiles();
    app = express();
    app.use(express.json());
    app.use('/blocks', blocksRouter);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('loads and parses vanilla blocks, type ids, booleans, lists and extra properties', async () => {
    await request(app)
      .get('/blocks')
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).toMatchObject({
          id: 1,
          name: 'HULL -- Basic Hull',
          icon: 5,
          textureId: [1, 2, 4],
          xmlTypeName: 'HULL',
          hp: 100,
          mass: 2.5,
          volume: 3.5,
          price: 50,
          description: 'Hull desc',
          armor: 0.25,
          isPlacable: false,
          inShop: true,
          hasOrientation: true,
          canActivate: true,
          blockStyle: 1,
          slab: 2,
          slabIds: [2, 3],
          styleIds: [4, 5],
          effectArmor: { Heat: 0.5, EM: 1.5 },
          computerReference: 2,
          lightSource: true,
          lightSourceColor: [0.1, 0.2, 0.3, 1],
          transparency: true,
          logicBlock: true,
          individualSides: 6,
          sideTexturesPointToOrientation: true,
          hasActivationTexture: true,
          extendedTexture4x4: true,
          onlyDrawnInBuildMode: true,
          lodShapeFromFar: 7,
          animated: true,
          extraProperties: { CustomFoo: 'bar' },
          isCustom: false,
        });
      });

    await request(app).get('/blocks/1').expect(200).expect(res => expect(res.body.id).toBe(1));
    await request(app).get('/blocks/999').expect(404);
  });

  it('creates, updates, serializes and reloads custom blocks', async () => {
    await request(app)
      .put('/blocks/1').set('If-Match', await revision())
      .send({ name: 'Custom Hull', textureId: [9, 8, 7], slab: 3, effectArmor: { Kinetic: 2 }, lightSourceColor: [1, 0, 0, 0.5], extraProperties: { CustomFoo: 'baz' } })
      .expect(200)
      .expect(res => {
        expect(res.body).toMatchObject({ id: 1, name: 'Custom Hull', isCustom: true, textureId: [9, 8, 7], slab: 3 });
      });

    const customXml = fs.readFileSync(path.join(game, 'customBlockConfig', 'BlockConfigImport.xml'), 'utf8');
    expect(customXml).toContain('Custom Hull');
    expect(customXml).toContain('<CustomFoo>baz</CustomFoo>');

    await request(app)
      .get('/blocks/1')
      .expect(200)
      .expect(res => expect(res.body).toMatchObject({ name: 'Custom Hull', isCustom: true, effectArmor: { Kinetic: 2 } }));

    await request(app)
      .post('/blocks').set('If-Match', await revision())
      .send({ name: 'Created Block', textureId: [3], extraProperties: { FullName: 'Created Full' } })
      .expect(201)
      .expect(res => {
        expect(res.body).toMatchObject({ id: 1000, name: 'Created Block', xmlTypeName: '1000', isCustom: true });
      });

    await request(app).put('/blocks/999').set('If-Match', await revision()).send({ name: 'nope' }).expect(404);
  });

  it('deletes only custom blocks and preserves vanilla blocks', async () => {
    await request(app).delete('/blocks/2').set('If-Match', await revision()).expect(403);
    await request(app).delete('/blocks/999').set('If-Match', await revision()).expect(404);

    let createdId = 0;
    await request(app).post('/blocks').set('If-Match', await revision()).send({ name: 'Delete Me' }).expect(201).expect(res => { createdId = res.body.id; });
    await request(app).delete(`/blocks/${createdId}`).set('If-Match', await revision()).expect(200).expect(res => expect(res.body).toEqual({ ok: true, deletedId: createdId }));
    await request(app).get(`/blocks/${createdId}`).expect(404);
  });

  it('requires matching catalogue preconditions and rejects malformed route IDs', async () => {
    const old = await revision();
    await request(app).post('/blocks').send({}).expect(428);
    await request(app).put('/blocks/1').send({}).expect(428);
    await request(app).delete('/blocks/1').expect(428);
    await request(app).post('/blocks').set('If-Match', '*').send({}).expect(409)
      .expect(res => expect(res.body.error).toContain('Reload, then use Revert'));
    await request(app).put('/blocks/1').set('If-Match', old).send({ hp: 101 }).expect(200);
    await request(app).put('/blocks/1').set('If-Match', old).send({ hp: 102 }).expect(409)
      .expect(res => {
        expect(res.body.error).toContain('Reload, then use Revert');
        expect(res.body.error).toContain('Copy any edits');
      });
    await request(app).delete('/blocks/1x').set('If-Match', await revision()).expect(400);
    await request(app).get('/blocks/nope').expect(400);
    await request(app).put('/blocks/1').set('If-Match', await revision()).send({ hp: -1 }).expect(400);
  });

  it('returns 500 when config is missing', async () => {
    fs.rmSync(path.join(tmp, 'SMToolConfig.json'));
    await request(app).get('/blocks').expect(500).expect(res => expect(res.body.error).toContain('SMToolConfig.json not found'));
  });

  it('warms Decoder models and exposes sorted unique valid icons', () => {
    expect(warmBlockCache()).toEqual({ dir: game, count: 2 });
    expect(getBlockIconIds()).toEqual([5, 6]);
    fs.appendFileSync(path.join(game, 'data/config/BlockTypes.properties'), 'BAD=3\nFRACTION=4\n');
    fs.writeFileSync(path.join(game, 'data/config/BlockConfig.xml'), '<Config><Block type="BAD" name="Bad" icon="-1"/><Block type="FRACTION" name="Fraction" icon="1.5"/></Config>');
    expect(getBlockIconIds()).toEqual([]);
  });

  it('returns safe JSON errors for an unset installation and inaccessible catalogue', async () => {
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: '' }));
    await request(app).get('/blocks').expect(400);
    fs.writeFileSync(path.join(tmp, 'SMToolConfig.json'), JSON.stringify({ starmadeDir: game }));
    fs.unlinkSync(path.join(game, 'data/config/BlockTypes.properties'));
    await request(app).get('/blocks').expect(500).expect(res => expect(res.body.error).not.toContain(game));
  });
});
