import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { createLogger } from 'vite';
import path from 'node:path';

// The Midnight packages ship sourcemaps that reference TS sources not included
// in their npm tarballs, producing harmless "points to missing source files"
// warnings. Filter just those so real warnings stay visible.
const logger = createLogger();
const isSourcemapNoise = (msg: unknown) =>
  typeof msg === 'string' && msg.includes('points to missing source files');
const origWarn = logger.warn;
const origWarnOnce = logger.warnOnce;
logger.warn = (msg, opts) => {
  if (isSourcemapNoise(msg)) return;
  origWarn(msg, opts);
};
logger.warnOnce = (msg, opts) => {
  if (isSourcemapNoise(msg)) return;
  origWarnOnce(msg, opts);
};

// The Midnight SDKs assume Node globals (Buffer, process) and ship WASM modules
// that use top-level await. nodePolyfills shims the globals; wasm + topLevelAwait
// let Vite load those .wasm modules in the browser.
export default defineConfig({
  customLogger: logger,
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // ledger-v8@8.1.0 browser export uses `import * as wasm from '#self'` in
      // its snippets — a package self-reference Vite/rollup cannot resolve,
      // causing "module is not an object or function" at WASM init time.
      // Point both the package root and the '#self' internal specifier to our
      // local shim which wires all snippets + uses async ?init WASM.
      '@midnight-ntwrk/ledger-v8': path.resolve(
        __dirname,
        './src/lib/ledger-v8-browser-shim.js',
      ),
      // '#self' is the wasm-bindgen package self-reference inside the snippets.
      // Redirect it to the _bg.js raw implementation so snippets can access the
      // WASM exports without another circular resolution.
      '#self': path.resolve(
        __dirname,
        '../../node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm_bg.js',
      ),
    },
  },
  optimizeDeps: {
    // Pre-bundle the CJS Midnight packages so esbuild applies CJS->ESM interop
    // (e.g. compact-runtime imports object-inspect, a CJS-only default export).
    include: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-contracts',
      '@midnight-ntwrk/midnight-js-network-id',
      '@midnight-ntwrk/midnight-js-utils',
      'object-inspect',
    ],
    // Only the actual WASM packages must stay unbundled (esbuild can't bundle them).
    exclude: ['@midnight-ntwrk/onchain-runtime-v3', '@midnight-ntwrk/ledger-v8'],
    esbuildOptions: { target: 'esnext' },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward Xaman backend calls so the browser stays same-origin.
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    target: 'es2022',
  },
});
