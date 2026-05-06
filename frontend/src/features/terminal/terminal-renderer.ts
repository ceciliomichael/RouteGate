"use client";

import type { IDisposable, Terminal } from "@xterm/xterm";

interface TerminalRendererActivation {
  dispose: () => void;
}

export function activateTerminalRenderer(
  terminal: Terminal,
): TerminalRendererActivation {
  let contextLossDisposable: IDisposable | null = null;
  let isDisposed = false;
  let webglAddon: { dispose: () => void } | null = null;

  void import("@xterm/addon-webgl")
    .then(({ WebglAddon }) => {
      if (isDisposed) {
        return;
      }

      const addon = new WebglAddon();

      try {
        contextLossDisposable = addon.onContextLoss(() => {
          contextLossDisposable?.dispose();
          contextLossDisposable = null;
          addon.dispose();

          if (webglAddon === addon) {
            webglAddon = null;
          }
        });

        terminal.loadAddon(addon);
        webglAddon = addon;
      } catch {
        contextLossDisposable?.dispose();
        contextLossDisposable = null;
        addon.dispose();
      }
    })
    .catch(() => undefined);

  return {
    dispose() {
      isDisposed = true;
      contextLossDisposable?.dispose();
      contextLossDisposable = null;
      webglAddon?.dispose();
      webglAddon = null;
    },
  };
}
