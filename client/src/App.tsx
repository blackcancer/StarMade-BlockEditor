/**
 * @fileoverview App root component.
 *
 * Layout: three-column (Sidebar | Viewer | Properties).
 * Loads config + blocks on mount.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import { Sidebar }      from './components/sidebar/BlockList.js';
import { ViewerColumn } from './components/layout/Viewer.js';
import { Properties }   from './components/layout/Properties.js';
import { useConfig, useBlocks, useCreateBlock } from './hooks/useApi.js';
import { invalidateAtlasCache } from './3d/AtlasTexture.js';
import { useConfigStore } from './store/configStore.js';
import { useBlockStore }  from './store/blockStore.js';

/**
 * Config dialog shown when starmadeDir is not set.
 *
 * @component
 */
function ConfigDialog({ onSave }: { onSave: (dir: string) => void }) {
  const [dir, setDir] = React.useState('');
  return (
    <div className="config-overlay">
      <div className="config-dialog">
        <h2>⚙ StarMade Block Editor</h2>
        <p>Set the path to your StarMade installation directory to get started.</p>
        <input
          type="text"
          placeholder="e.g. D:/Games/StarMade/StarMade"
          value={dir}
          onChange={e => setDir(e.target.value)}
        />
        <button onClick={() => dir && onSave(dir)}>Save & Load Blocks</button>
      </div>
    </div>
  );
}

/**
 * Header bar with global actions.
 *
 * @component
 */
function Header() {
  const starmadeDir = useConfigStore(s => s.starmadeDir);
  const isValid     = useConfigStore(s => s.isValid);
  const atlasSize   = useConfigStore(s => s.atlasSize);
  const texturePack = useConfigStore(s => s.texturePack);
  const setConfig   = useConfigStore(s => s.setConfig);
  const blocks      = useBlockStore(s => s.blocks);
  const { reload }  = useBlocks(false);
  const { createBlock } = useCreateBlock();
  const [packs, setPacks] = React.useState<Array<{ name: string; sizes: number[] }>>([]);

  useEffect(() => {
    if (!isValid) return;
    fetch(`/api/textures/packs?size=${atlasSize}`)
      .then(r => r.json())
      .then(data => setPacks(data.packs ?? []))
      .catch(console.error);
  }, [atlasSize, isValid]);

  const saveTextureConfig = async (patch: { atlasSize?: number; texturePack?: string }) => {
    const next = { atlasSize, texturePack, ...patch };
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    invalidateAtlasCache();
    setConfig({
      atlasSize: data.atlasSize ?? next.atlasSize,
      texturePack: data.texturePack ?? next.texturePack,
      isValid: data.isValid ?? isValid,
    });
  };

  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="app-title">⚙ StarMade Block Editor</span>
        <span className="app-subtitle">v1.0.0</span>
      </div>
      <div className="app-path" title={starmadeDir}>
        {isValid
          ? <span className="valid">✓ {starmadeDir.split(/[/\\]/).at(-1)}</span>
          : <span className="invalid">⚠ No StarMade directory configured</span>
        }
      </div>
      <div className="spacer" />
      {isValid && (
        <>
          <select
            className="header-select"
            value={atlasSize}
            onChange={e => saveTextureConfig({ atlasSize: +e.target.value, texturePack: 'Default' })}
            title="Texture resolution"
          >
            <option value={64}>64</option>
            <option value={128}>128</option>
            <option value={256}>256</option>
          </select>
          <select
            className="header-select"
            value={texturePack}
            onChange={e => saveTextureConfig({ texturePack: e.target.value })}
            title="Texture pack"
          >
            {packs.map(pack => <option key={pack.name} value={pack.name}>{pack.name}</option>)}
          </select>
        </>
      )}
      <div className="app-stats">
        {blocks.length > 0 && `${blocks.length} blocks`}
      </div>
      <button className="btn-secondary" onClick={reload} title="Reload blocks from disk">
        ↺ Reload
      </button>
      <button className="btn-primary" onClick={createBlock} title="Create a new custom block">
        + New Block
      </button>
    </header>
  );
}

/**
 * App root.
 *
 * @component
 */
export function App() {
  const { saveConfig } = useConfig();
  useBlocks();

  const isValid  = useConfigStore(s => s.isValid);

  return (
    <div className="app-root">
      <Header />
      <div className="app-body">
        <Sidebar />
        <ViewerColumn />
        <Properties />
      </div>
      {!isValid && (
        <ConfigDialog onSave={dir => saveConfig({ starmadeDir: dir })} />
      )}
    </div>
  );
}
