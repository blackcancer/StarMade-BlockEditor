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
  const blocks      = useBlockStore(s => s.blocks);
  const { reload }  = useBlocks();
  const { createBlock } = useCreateBlock();

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
  useConfig();
  useBlocks();

  const isValid  = useConfigStore(s => s.isValid);
  const { saveConfig } = useConfig();

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
