import { beforeEach, describe, expect, it } from 'vitest';
import { useConfigStore } from './configStore.js';

describe('configStore', () => {
  beforeEach(() => {
    useConfigStore.setState({ starmadeDir: '', worldDir: 'world0', atlasSize: 256, texturePack: 'Default', isValid: false });
  });

  it('exposes safe defaults', () => {
    expect(useConfigStore.getState()).toMatchObject({
      starmadeDir: '',
      worldDir: 'world0',
      atlasSize: 256,
      texturePack: 'Default',
      isValid: false,
    });
  });

  it('merges partial config updates without dropping existing fields', () => {
    useConfigStore.getState().setConfig({ starmadeDir: '/game', atlasSize: 64, isValid: true });
    useConfigStore.getState().setConfig({ texturePack: 'Custom' });

    expect(useConfigStore.getState()).toMatchObject({
      starmadeDir: '/game',
      worldDir: 'world0',
      atlasSize: 64,
      texturePack: 'Custom',
      isValid: true,
    });
  });
});
