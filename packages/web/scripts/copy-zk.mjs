// Copies compiled ZK assets (keys/ + zkir/) for the NFT and Bridge contracts
// into public/midnight so FetchZkConfigProvider can fetch them at runtime.
// Output structure: public/midnight/<contractName>/keys/ and zkir/
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const out = path.resolve(__dirname, '..', 'public', 'midnight');

// Each entry: [contractName, absolutePathToManagedDir]
// FetchZkConfigProvider fetches: <base>/<contractName>/keys/<circuit>.verifier
const sources = [
  ['nft',         path.join(repoRoot, 'contracts/midnight/nft/src/managed/nft')],
  ['bridge',      path.join(repoRoot, 'contracts/midnight/bridge/src/managed/bridge')],
  ['marketplace', path.join(repoRoot, 'contracts/midnight/marketplace/src/managed/marketplace')],
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const [name, src] of sources) {
  for (const sub of ['keys', 'zkir']) {
    const from = path.join(src, sub);
    if (!existsSync(from)) {
      console.warn(`[copy-zk] missing ${from} — build the contract first (npm run compact + build)`);
      continue;
    }
    await cp(from, path.join(out, name, sub), { recursive: true });
  }
}

console.log(`[copy-zk] ZK assets copied to ${out}`);
