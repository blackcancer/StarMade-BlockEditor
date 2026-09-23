/** @fileoverview Native StarMade viewport with installation-aware asset ownership and visible failures. */
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { WebGLRenderer } from 'three';
import { BlockMesh } from './BlockMesh.js';
import { loadRenderAssets, type RenderAssets } from './renderAssets.js';
import { requiredLayers, toRenderBlock } from './renderBlock.js';
import { useBlockStore } from '../store/blockStore.js';
import { useConfigStore } from '../store/configStore.js';
import { useT } from '../i18n/index.js';
import { localizeMessage, localizeWarning, technicalDetail } from '../i18n/messages.js';
import { captureNativeIcon } from './captureIcon.js';
import type { NativePreview } from './nativePreview.js';

class RenderBoundary extends Component<{ children: ReactNode; onError(message: string): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Render the editable block with StarMade-3D while React retains cameras, controls and error presentation. */
export function BlockViewer({ visible = true }: { visible?: boolean }) {
  const t = useT();
  const draft = useBlockStore(s => s.draft);
  const orientation = useBlockStore(s => s.orientation);
  const active = useBlockStore(s => s.previewActive);
  const highlightFace = useBlockStore(s => s.highlightFace);
  const starmadeDir = useConfigStore(s => s.starmadeDir);
  const size = useConfigStore(s => s.atlasSize);
  const pack = useConfigStore(s => s.texturePack);
  const valid = useConfigStore(s => s.isValid);
  const [generation, setGeneration] = useState(0);
  const [assets, setAssets] = useState<RenderAssets | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [gpuError, setGpuError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [nativePreview, setNativePreview] = useState<NativePreview | null>(null);
  const [renderer, setRenderer] = useState<WebGLRenderer | null>(null);
  const rendererCleanup = useRef<(() => void) | undefined>();
  const onReady = useCallback((preview: NativePreview) => { setNativePreview(preview); setReady(true); }, []);
  const block = useMemo(() => draft ? toRenderBlock(draft) : null, [draft]);
  const requested = useMemo(() => {
    try { return { key: draft ? requiredLayers(draft, orientation, active).join(',') : '', error: null }; }
    catch (error) { return { key: '', error: String(error) }; }
  }, [draft, orientation, active]);

  useEffect(() => {
    const reload = () => { setGpuError(null); setGeneration(value => value + 1); };
    window.addEventListener('atlas-imported', reload);
    return () => window.removeEventListener('atlas-imported', reload);
  }, []);
  useEffect(() => {
    setRenderError(null); setReady(false);
  }, [block, orientation, active, highlightFace, starmadeDir, generation]);
  useEffect(() => {
    const controller = new AbortController();
    let owned: RenderAssets | undefined;
    setAssets(null); setAssetError(null); setReady(false);
    if (valid && requested.key) {
      loadRenderAssets({ size, pack, layers: requested.key.split(',').map(Number), signal: controller.signal }).then(result => {
        if (controller.signal.aborted) { result.dispose(); return; }
        owned = result; setAssets(result);
      }, error => { if (!controller.signal.aborted) setAssetError(error instanceof Error ? error.message : String(error)); });
    }
    return () => { controller.abort(); owned?.dispose(); };
  }, [starmadeDir, size, pack, valid, requested.key, generation]);
  useEffect(() => () => rendererCleanup.current?.(), []);

  const onCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    rendererCleanup.current?.();
    if (!gl.capabilities.isWebGL2) { setGpuError('WebGL 2 is required for the native renderer.'); return; }
    setRenderer(gl);
    const previous = gl.debug.onShaderError;
    gl.debug.onShaderError = () => setGpuError('Native shader compilation failed.');
    const lost = () => setGpuError('WebGL context lost. Reload the preview.');
    gl.domElement.addEventListener('webglcontextlost', lost);
    rendererCleanup.current = () => {
      gl.debug.onShaderError = previous;
      gl.domElement.removeEventListener('webglcontextlost', lost);
    };
  }, []);
  const error = requested.error || assetError || renderError || gpuError;
  const detail = error ? technicalDetail(error, t) : null;
  useEffect(() => {
    useBlockStore.setState({ captureIcon: ready && nativePreview && renderer && !error
      ? () => captureNativeIcon(renderer, nativePreview) : null });
    return () => useBlockStore.setState({ captureIcon: null });
  }, [ready, nativePreview, renderer, error]);
  return (
    <div data-renderer="starmade-3d" style={{ position: 'relative', width: '100%', height: '100%', background: '#0d1117' }}>
      {error ? <div role="alert" className="viewer-render-message"><span>{t.viewer.nativeError(localizeMessage(error, t))}</span>
        {detail && <details><summary>{t.errors.technicalDetails}</summary><pre>{detail}</pre></details>}
        <button type="button" onClick={() => window.dispatchEvent(new Event('atlas-imported'))}>{t.app.reload}</button></div> : (
        <RenderBoundary onError={setRenderError}>
          <Canvas frameloop={visible ? 'always' : 'never'} camera={{ position: [2.2, 1.7, 2.2], fov: 50, near: 0.1, far: 200 }} shadows gl={{ antialias: true, alpha: true }} onCreated={onCreated}>
            <ambientLight intensity={0.35} />
            <directionalLight position={[3.4, 4.4, 2.4]} intensity={1.5} castShadow />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.501, 0]} receiveShadow>
              <planeGeometry args={[12, 12]} /><meshStandardMaterial color="#2d3a4d" roughness={0.9} />
            </mesh>
            {block && assets && <BlockMesh block={block} assets={assets} orientation={orientation} isActive={active}
              highlightFace={highlightFace} onError={setRenderError} onReady={onReady} />}
            <Grid args={[12, 12]} position={[0, -0.5, 0]} cellColor="#1e2d45" sectionColor="#2a4060" fadeDistance={12} />
            <OrbitControls enableDamping dampingFactor={0.08} minDistance={1} maxDistance={32} />
          </Canvas>
        </RenderBoundary>
      )}
      {!error && valid && block && !ready && <div role="status" className="viewer-render-message">{t.viewer.nativeLoading}</div>}
      {!error && assets && assets.manifest.warnings.length > 0 && <div role="status" className="viewer-render-message">{t.viewer.nativeWarnings(assets.manifest.warnings.map(warning => localizeWarning(warning, t)).join(' '))}</div>}
    </div>
  );
}
