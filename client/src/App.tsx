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
import { useConfigStore } from './store/configStore.js';
import { useBlockStore }  from './store/blockStore.js';
import { useT, useLocale, LOCALES } from './i18n/index.js';
import { MobileNavigation, useCompactLayout, type WorkspacePanel } from './components/layout/MobileNavigation.js';
import { useModal } from './hooks/useModal.js';
import { localizeMessage, technicalDetail } from './i18n/messages.js';

/** Keep diagnostics available while the primary message follows the current language. */
function ErrorMessage({ error }: { error: string }) {
  const t = useT();
  const detail = technicalDetail(error, t);
  return <div className="properties-error" role="alert">{localizeMessage(error, t)}
    {detail && <details><summary>{t.errors.technicalDetails}</summary><div>{detail}</div></details>}
  </div>;
}

/**
 * Config dialog shown when starmadeDir is not set.
 *
 * @component
 */
function ConfigDialog({ onSave, error }: { onSave: (dir: string) => void; error: string | null }) {
  const t = useT();
  const [dir, setDir] = React.useState('');
  const modal = useModal();
  return (
    <dialog ref={modal} className="config-overlay" aria-labelledby="config-title" onCancel={event => event.preventDefault()}>
      <form className="config-dialog" onSubmit={event => { event.preventDefault(); if (dir.trim()) onSave(dir.trim()); }}>
        <h2 id="config-title">{t.config.title}</h2>
        <p>{t.config.description}</p>
        {error && <ErrorMessage error={error} />}
        <input
          type="text"
          aria-label={t.config.directoryLabel}
          autoFocus
          placeholder={t.config.placeholder}
          value={dir}
          onChange={e => setDir(e.target.value)}
        />
        <button type="submit">{t.config.save}</button>
      </form>
    </dialog>
  );
}

/**
 * Header bar with global actions.
 *
 * @component
 */
function Header({ compact }: { compact: boolean }) {
  const t = useT();
  const { locale, setLocale } = useLocale();

  const starmadeDir = useConfigStore(s => s.starmadeDir);
  const isValid     = useConfigStore(s => s.isValid);
  const atlasSize   = useConfigStore(s => s.atlasSize);
  const texturePack = useConfigStore(s => s.texturePack);
  const { saveConfig } = useConfig(false);
  const setError = useBlockStore(s => s.setError);
  const blocks      = useBlockStore(s => s.blocks);
  const isDirty = useBlockStore(s => s.isDirty);
  const { reload }  = useBlocks(false);
  const { createBlock } = useCreateBlock();
  const [packs, setPacks] = React.useState<Array<{ name: string; sizes: number[] }>>([]);

  useEffect(() => {
    if (!isValid) return;
    let active = true;
    fetch(`/api/textures/packs?size=${atlasSize}`)
      .then(r => {
        if (!r.ok) throw new Error(`Texture packs: HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { if (active) setPacks(data.packs ?? []); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [atlasSize, isValid, starmadeDir, setError]);

  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="app-title">{t.app.title}</span>
        <span className="app-subtitle">{t.app.subtitle}</span>
      </div>
      <div className="app-path" title={starmadeDir}>
        {isValid
          ? <span className="valid">{t.app.dirValid(starmadeDir.split(/[/\\]/).at(-1)!)}</span>
          : <span className="invalid">{t.app.dirInvalid}</span>
        }
      </div>
      <div className="spacer" />
      <details className="header-settings" open={!compact}>
      <summary>{t.app.settings}</summary>
      <div className="header-controls">
      {isValid && (
        <>
          <select
            className="header-select"
            value={atlasSize}
            onChange={e => saveConfig({ atlasSize: +e.target.value, texturePack: 'Default' })}
            title={t.app.textureResolution}
          >
            <option value={64}>64</option>
            <option value={128}>128</option>
            <option value={256}>256</option>
          </select>
          <select
            className="header-select"
            value={texturePack}
            onChange={e => saveConfig({ texturePack: e.target.value })}
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
      </div>
      </details>
      <button className="btn-primary" onClick={() => {
        if (!isDirty || window.confirm(t.sidebar.discardConfirm)) void createBlock();
      }} title={t.app.newBlockTooltip}>
        {t.app.newBlock}
      </button>
    </header>
  );
}

/**
 * Root component for the editor single-page application.
 *
 * `App` is the only component that composes the global layout. It starts configuration and block-list loading, renders the header/sidebar/viewer/properties columns, and shows the setup dialog while the configured StarMade directory is invalid. Data fetching and mutations remain in hooks so this shell stays declarative.
 *
 * @returns Mounted editor layout and conditional configuration dialog.
 */

export function App() {
  const t = useT();
  const { saveConfig } = useConfig();
  useBlocks();

  const isValid = useConfigStore(s => s.isValid);
  const error = useBlockStore(s => s.error);
  const isDirty = useBlockStore(s => s.isDirty);
  const compact = useCompactLayout();
  const [panel, setPanel] = React.useState<WorkspacePanel>('blocks');
  const previewPanel = React.useRef<HTMLDivElement>(null);
  const focusPreview = React.useRef(false);
  const openBlock = () => { focusPreview.current = compact; setPanel('preview'); };
  useEffect(() => {
    if (focusPreview.current) { previewPanel.current!.focus(); focusPreview.current = false; }
  }, [panel]);
  const panelAttributes = (name: WorkspacePanel) => ({
    id: `panel-${name}`, hidden: compact && panel !== name,
    'aria-hidden': compact && panel !== name,
    role: compact ? 'tabpanel' : undefined,
    'aria-labelledby': compact ? `tab-${name}` : undefined,
    tabIndex: compact ? 0 : undefined,
  });

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  return (
    <div className="app-root">
      <Header compact={compact} />
      {isValid && error && <ErrorMessage error={error} />}
      <div className="app-body">
        <div className="workspace-panel panel-blocks" {...panelAttributes('blocks')}><Sidebar onBlockOpen={openBlock} /></div>
        <div ref={previewPanel} className="workspace-panel panel-preview" {...panelAttributes('preview')}><ViewerColumn visible={!compact || panel === 'preview'} /></div>
        <div className="workspace-panel panel-properties" {...panelAttributes('properties')}><Properties /></div>
      </div>
      {compact && <MobileNavigation panel={panel} onChange={setPanel} />}
      {!isValid && (
        <ConfigDialog error={error} onSave={dir => {
          if (!isDirty || window.confirm(t.sidebar.discardConfirm)) void saveConfig({ starmadeDir: dir });
        }} />
      )}
    </div>
  );
}
