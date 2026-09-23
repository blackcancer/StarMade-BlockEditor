/** @fileoverview Responsive workspace navigation; panels stay mounted to retain drafts and scroll. */
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useT } from '../../i18n/index.js';

/** Stable identifiers shared by the workspace tabs and their associated panels. */
export type WorkspacePanel = 'blocks' | 'preview' | 'properties';
const panels: WorkspacePanel[] = ['blocks', 'preview', 'properties'];

/** Match the CSS breakpoint, including live orientation and window changes. */
export function useCompactLayout(): boolean {
  const [query] = useState(() => window.matchMedia('(max-width: 1024px)'));
  const [compact, setCompact] = useState(query.matches);
  useEffect(() => {
    const changed = (event: MediaQueryListEvent) => setCompact(event.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, [query]);
  return compact;
}

/** A touch-sized tab list with the conventional arrow/Home/End keyboard controls. */
export function MobileNavigation({ panel, onChange }: { panel: WorkspacePanel; onChange(panel: WorkspacePanel): void }) {
  const t = useT();
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % panels.length; break;
      case 'ArrowLeft': next = (index + panels.length - 1) % panels.length; break;
      case 'Home': next = 0; break;
      case 'End': next = panels.length - 1; break;
      default: return;
    }
    event.preventDefault();
    onChange(panels[next]);
    document.getElementById(`tab-${panels[next]}`)!.focus();
  };
  return <nav className="mobile-navigation" role="tablist" aria-label={t.mobile.navigation}>
    {panels.map((name, index) => <button key={name} type="button" role="tab" id={`tab-${name}`}
      aria-controls={`panel-${name}`} aria-selected={panel === name} tabIndex={panel === name ? 0 : -1}
      onClick={() => onChange(name)} onKeyDown={event => navigate(event, index)}>{t.mobile[name]}</button>)}
  </nav>;
}
