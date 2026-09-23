/** @fileoverview Icon selection edits the draft; importing/restoring a slot writes its backed-up image immediately. */
import { useEffect, useRef, useState } from 'react';
import { useBlockStore } from '../../store/blockStore.js';
import { useConfigStore } from '../../store/configStore.js';
import { useT } from '../../i18n/index.js';
import { localizeMessage, technicalDetail } from '../../i18n/messages.js';
import { IconPicker } from './IconPicker.js';

/** Select an icon and manage the original image backup independently of block saves. */
export function IconField({ icon, onChange }: { icon: number; onChange: (icon: number) => void }) {
  const t = useT();
  const directory = useConfigStore(s => s.starmadeDir);
  const capture = useBlockStore(s => s.captureIcon);
  const selectionVersion = useBlockStore(s => s.selectionVersion);
  const revision = useBlockStore(s => s.iconRevision);
  const key = `${directory}:${icon}:${selectionVersion}`;
  const current = useRef(key); current.current = key;
  const input = useRef<HTMLInputElement>(null);
  const [picker, setPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [canRestore, setCanRestore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true; current.current = key;
    setGenerated(null);
    setCanRestore(false); setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/textures/icon/${icon}/status`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const status = await res.json();
        if (mounted) setCanRestore(status.canRestore === true);
      } catch (reason) { if (mounted) setError(String(reason)); }
    })();
    return () => { mounted = false; current.current = ''; };
  }, [icon, directory, key]);

  useEffect(() => () => { if (generated) URL.revokeObjectURL(generated.url); }, [generated]);
  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      const blob = await capture!();
      if (current.current === key) setGenerated({ blob, url: URL.createObjectURL(blob) });
    } catch (reason) { if (current.current === key) setError(String(reason)); }
    finally { setGenerating(false); }
  };

  const write = async (file?: File) => {
    setBusy(true); setError(null);
    try {
      const url = `/api/textures/icon/${icon}${file ? '' : '/restore'}`;
      const init: RequestInit = file
        ? { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }
        : { method: 'POST' };
      const res = await fetch(url, init);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      useBlockStore.setState(state => ({ iconRevision: state.iconRevision + 1 }));
      if (current.current === key) setCanRestore(true);
    } catch (reason) { if (current.current === key) setError(String(reason)); }
    finally { setBusy(false); }
  };
  const errorDetail = error ? technicalDetail(error, t) : null;
  return <>
    <div className="icon-field">
      <button type="button" className="icon-preview" onClick={() => setPicker(true)} title={t.properties.pickIconTooltip}><img src={`/api/textures/icon/${icon}?v=${revision}`} alt="" /></button>
      <input type="number" min={0} value={icon} onChange={event => onChange(+event.target.value)} />
      <button type="button" className="btn-secondary" onClick={() => setPicker(true)}>{t.properties.pickIcon}</button>
      <button type="button" className="btn-secondary" disabled={busy || generating} onClick={() => input.current!.click()}>{busy ? t.properties.importingIcon : t.properties.importIcon}</button>
      <button type="button" className="btn-secondary" disabled={busy || generating || !canRestore} onClick={() => void write()}>{t.properties.restoreIcon}</button>
      <button type="button" className="btn-secondary" disabled={!capture || busy || generating} onClick={() => void generate()}>{generating ? t.properties.generatingIcon : t.properties.generateIcon}</button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (file) void write(file);
      }} />
    </div>
    {generated && <div className="generated-icon-preview">
      <img src={generated.url} width={64} height={64} alt={t.properties.generatedIconPreview} />
      <button type="button" className="btn-secondary" disabled={busy || generating} onClick={() => void write(new File([generated.blob], 'block-icon.png', { type: 'image/png' }))}>{t.properties.applyGeneratedIcon}</button>
      <button type="button" className="btn-secondary" onClick={() => setGenerated(null)}>{t.properties.cancelGeneratedIcon}</button>
    </div>}
    <p className="field-notice">{t.properties.iconWriteNotice}</p>
    {error && <div className="properties-error" role="alert">
      {localizeMessage(error, t)}
      {errorDetail && <details><summary>{t.errors.technicalDetails}</summary>{errorDetail}</details>}
    </div>}
    {picker && <IconPicker selectedIconId={icon} onSelect={onChange} onClose={() => setPicker(false)} />}
  </>;
}
