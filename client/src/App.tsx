/**
 * @fileoverview App root component — layout shell and global state bootstrap.
 *
 * Renders the three-column editor layout and bootstraps global data loading:
 *
 *  Sidebar | Viewer | Properties
 *
 * On mount, `useConfig()` fetches `SMToolConfig.json` and `useBlocks()` loads
 * all block definitions. If `isValid` is false (starmadeDir not configured),
 * a `<ConfigDialog>` overlay is shown prompting the user to set the path.
 *
 * ## Component tree
 *  App
 *  ├── Header         — brand, path indicator, resolution/pack selectors, actions
 *  ├── Sidebar        — searchable block list with filter toggles
 *  ├── ViewerColumn   — 3D preview + face selector + orientation controls
 *  ├── Properties     — all editable block fields with draft system
 *  └── ConfigDialog   — initial setup overlay (shown when starmadeDir is unset)
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
import { useT, useLocale, LOCALES } from './i18n/index.js';

/**
 * Config dialog shown when starmadeDir is not set.
 *
 * @component
 */
function ConfigDialog({ onSave }: { onSave: (dir: string) => void }) {
  const t = useT();
  const [dir, setDir] = React.useState('');
  return (
    <div className="config-overlay">
      <div className="config-dialog">
        <h2>{t.config.title}</h2>
        <p>{t.config.description}</p>
        <input
          type="text"
          placeholder={t.config.placeholder}
          value={dir}
          onChange={e => setDir(e.target.value)}
        />
        <button onClick={() => dir && onSave(dir)}>{t.config.save}</button>
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
  const t = useT();
  const { locale, setLocale } = useLocale();

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
        <span className="app-title">{t.app.title}</span>
        <span className="app-subtitle">{t.app.subtitle}</span>
      </div>
      <div className="app-path" title={starmadeDir}>
        {isValid
          ? <span className="valid">{t.app.dirValid(starmadeDir.split(/[/\\]/).at(-1) ?? '')}</span>
          : <span className="invalid">{t.app.dirInvalid}</span>
        }
      </div>
      <div className="spacer" />
      {isValid && (
        <>
          <select
            className="header-select"
            value={atlasSize}
            onChange={e => saveTextureConfig({ atlasSize: +e.target.value, texturePack: 'Default' })}
            title={t.app.textureResolution}
          >
            <option value={64}>64</option>
            <option value={128}>128</option>
            <option value={256}>256</option>
          </select>
          <select
            className="header-select"
            value={texturePack}
            onChange={e => saveTextureConfig({ texturePack: e.target.value })}
            title={t.app.texturePack}
          >
            {packs.map(pack => <option key={pack.name} value={pack.name}>{pack.name}</option>)}
          </select>
        </>
      )}
      <div className="app-stats">
        {blocks.length > 0 && t.app.blockCount(blocks.length)}
      </div>
      {/* Language selector */}
      <select
        className="header-select"
        value={locale}
        onChange={e => setLocale(e.target.value)}
        title={t.app.language}
        aria-label={t.app.language}
      >
        {Object.entries(LOCALES).map(([code, entry]) => (
          <option key={code} value={code}>{entry.label}</option>
        ))}
      </select>
      <button className="btn-secondary" onClick={reload} title={t.app.reloadTooltip}>
        {t.app.reload}
      </button>
      <button className="btn-primary" onClick={createBlock} title={t.app.newBlockTooltip}>
        {t.app.newBlock}
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

  const isValid = useConfigStore(s => s.isValid);

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
