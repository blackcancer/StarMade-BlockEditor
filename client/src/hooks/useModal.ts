/** @fileoverview Native dialogs provide focus containment, inert background and focus restoration. */
import { useLayoutEffect, useRef } from 'react';

/** Open the mounted dialog in the browser's top layer and release it on unmount. */
export function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  // Capture before React commits child autoFocus; it may already move focus
  // into the dialog before any effect runs.
  const opener = useRef(document.activeElement);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus();
    };
  }, []);
  return ref;
}
