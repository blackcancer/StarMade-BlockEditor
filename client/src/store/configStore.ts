/**
 * @fileoverview Config store — Zustand.
 *
 * Holds the starmadeDir, atlasSize, and API health state.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import { create } from 'zustand';

interface ConfigStore {
  starmadeDir: string;
  worldDir:    string;
  atlasSize:   64 | 128 | 256;
  texturePack: string;
  isValid:     boolean;
  setConfig:   (cfg: Partial<Omit<ConfigStore, 'setConfig'>>) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  starmadeDir: '',
  worldDir:    'world0',
  atlasSize:   256,
  texturePack: 'Default',
  isValid:     false,
  setConfig:   (cfg) => set(s => ({ ...s, ...cfg })),
}));
