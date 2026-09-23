/** @fileoverview React Three Fiber bridge for the native preview and asynchronous LOD lifetime. */
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { BlockDefinition } from 'starmade-3d';
import { createNativePreview, type NativePreview } from './nativePreview.js';
import type { RenderAssets } from './renderAssets.js';

/** Current native input and host callbacks; assets are shared with the viewport generation. */
interface BlockMeshProps {
  block: BlockDefinition;
  assets: RenderAssets;
  orientation: number;
  isActive: boolean;
  highlightFace: number;
  onError(message: string): void;
  onReady(preview: NativePreview): void;
}

/** Display the current native object, keeping late model requests and GPU resources out of subsequent drafts. */
export function BlockMesh({ block, assets, orientation, isActive, highlightFace, onError, onReady }: BlockMeshProps) {
  const [preview, setPreview] = useState<NativePreview | null>(null);
  const current = useRef<NativePreview | null>(null);
  useFrame(({ camera }, delta) => current.current?.update(delta, camera as PerspectiveCamera));
  useEffect(() => {
    let obsolete = false;
    let owned: NativePreview | undefined;
    setPreview(null);
    createNativePreview({ block, assets, orientation, active: isActive, highlightFace }).then(result => {
      if (obsolete) { result.dispose(); return; }
      owned = result; current.current = result; setPreview(result); onReady(result);
    }, error => { if (!obsolete) onError(error instanceof Error ? error.message : String(error)); });
    return () => { obsolete = true; current.current = null; owned?.dispose(); };
  }, [block, assets, orientation, isActive, highlightFace, onError, onReady]);
  return preview ? <primitive object={preview.object} dispose={null} /> : null;
}
