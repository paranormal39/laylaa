#!/usr/bin/env node
// Generates src/lib/ledger-v8-browser-shim.js from the installed ledger-v8 _fs entry.
// Replaces the browser entry (circular #self snippets) and the node entry (sync readFileSync)
// with an async vite-plugin-wasm-compatible init.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, '../../../node_modules/@midnight-ntwrk/ledger-v8');
const fsJs = readFileSync(resolve(pkgDir, 'midnight_ledger_wasm_fs.js'), 'utf8');

const lines = fsJs.split('\n');
const snippetImports = lines.filter(l => l.trim().startsWith('import * as snippets_'));
const snippetAssigns = lines.filter(l => l.trim().startsWith("imports['./snippets/"));

// Use relative paths from src/lib/ so Vite can resolve them without going through
// the package exports map (which would re-trigger the #self circular issue).
const rel = '../../../../node_modules/@midnight-ntwrk/ledger-v8';

const shim = [
  '// AUTO-GENERATED — do not edit by hand. Re-run scripts/gen-ledger-shim.mjs after upgrading ledger-v8.',
  '// Browser shim for @midnight-ntwrk/ledger-v8: async WASM init compatible with vite-plugin-wasm.',
  '// Replaces the "browser" export (circular #self snippet imports) and the "node" export (sync readFileSync).',
  `import wasmInit from '${rel}/midnight_ledger_wasm_bg.wasm?init';`,
  `export * from '${rel}/midnight_ledger_wasm_bg.js';`,
  `import { __wbg_set_wasm } from '${rel}/midnight_ledger_wasm_bg.js';`,
  `import * as _bg from '${rel}/midnight_ledger_wasm_bg.js';`,
  ...snippetImports.map(l =>
    l.trim().replace(/from '\.\/snippets\//, `from '${rel}/snippets/`)
  ),
  '',
  'const imports = {};',
  "imports['./midnight_ledger_wasm_bg.js'] = _bg;",
  ...snippetAssigns.map(l => l.trim()),
  '',
  'const instance = await wasmInit(imports);',
  'const wasm = instance.exports;',
  '__wbg_set_wasm(wasm);',
  'wasm.__wbindgen_start();',
].join('\n');

const out = resolve(__dirname, '../src/lib/ledger-v8-browser-shim.js');
writeFileSync(out, shim, 'utf8');
console.log('wrote', out);
