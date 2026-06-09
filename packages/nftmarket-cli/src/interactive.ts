// Interactive CLI — real Midnight (Preview) + real XRPL (Testnet)
// SPDX-License-Identifier: Apache-2.0

import Enquirer from 'enquirer';
import chalk from 'chalk';
import ora from 'ora';
import { configForNetwork, type Config } from './config.js';
import {
  buildWallet,
  waitForSync,
  waitForFunds,
  getUnshieldedBalance,
  getDustBalance,
  registerForDustGeneration,
  configureProviders,
  deployNFT,
  joinNFT,
  mintNFT,
  transferNFT,
  burnNFT,
  getTotalSupply,
  getOwnedTokens,
  generateSeed,
  formatBalance,
  ownerFromCoinPublicKeyHex,
  padCID,
  randomTokenId,
  deployGenericContract,
  joinGenericContract,
  redeemBurn,
  hexHashToBytes32,
  GENERIC_CONTRACTS,
  type WalletContext,
} from './midnight-api.js';
import type { NFTProviders, DeployedNFTContract } from './common-types.js';
import { XRPLClient } from './utils/xrpl.js';

const { prompt } = Enquirer;
const DIV = '──────────────────────────────────────────────────────────────';

interface CLIContext {
  network: string;
  config: Config;
  seed: string | null;
  walletCtx: WalletContext | null;
  providers: NFTProviders | null;
  nft: DeployedNFTContract | null;
  nftAddress: string | null;
  deployed: Record<string, string>;
  bridge: any | null;
  bridgeAddress: string | null;
  xrpl: XRPLClient | null;
}

export async function startInteractiveMode(network: string): Promise<void> {
  console.clear();
  console.log(
    chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║            NFT Marketplace CLI — Development & Testing            ║
║                  XRPL Testnet + Midnight Preview                 ║
╚══════════════════════════════════════════════════════════════════╝`),
  );
  console.log(chalk.dim(`  Midnight network: ${network}   (proof server expected at http://127.0.0.1:6300)\n`));

  const ctx: CLIContext = {
    network,
    config: configForNetwork(network),
    seed: null,
    walletCtx: null,
    providers: null,
    nft: null,
    nftAddress: null,
    deployed: {},
    bridge: null,
    bridgeAddress: null,
    xrpl: null,
  };

  let running = true;
  while (running) {
    try {
      const { action } = await prompt<{ action: string }>({
        type: 'select',
        name: 'action',
        message: 'Main menu:',
        choices: [
          { name: 'wallet', message: '📁 Midnight Wallet (create / restore / balance)' },
          { name: 'contracts', message: '📦 Deploy contracts (NFT / Bridge / Marketplace / Collection)' },
          { name: 'nft', message: '🎨 Midnight NFT contract (deploy / mint / transfer / burn)' },
          { name: 'xrpl', message: '💧 XRPL Testnet (connect / NFTs / mint / burn)' },
          { name: 'bridge', message: '🌉 Burn-To-Mint bridge (XRPL burn → Midnight mint, REAL)' },
          { name: 'demo', message: '🧪 Demo flows (collection / marketplace — simulated)' },
          { name: 'status', message: '📊 Status' },
          { name: 'exit', message: '👋 Exit' },
        ],
      });

      switch (action) {
        case 'wallet': await walletMenu(ctx); break;
        case 'contracts': await contractsMenu(ctx); break;
        case 'nft': await nftMenu(ctx); break;
        case 'xrpl': await xrplMenu(ctx); break;
        case 'bridge': await bridgeMenu(ctx); break;
        case 'demo': await demoMenu(ctx); break;
        case 'status': await showStatus(ctx); break;
        case 'exit':
          running = false;
          if (ctx.xrpl) await ctx.xrpl.disconnect().catch(() => {});
          console.log(chalk.green('\nGoodbye!'));
          break;
      }
    } catch (error) {
      if (isCancel(error)) { running = false; break; }
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    }
  }
  // Wallet/network handles keep the event loop alive; exit explicitly.
  process.exit(0);
}

function isCancel(error: unknown): boolean {
  return error === '' || error === undefined || (error instanceof Error && error.message === '');
}

// ============================ Wallet ============================

async function walletMenu(ctx: CLIContext): Promise<void> {
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'Midnight Wallet:',
    choices: [
      { name: 'create', message: 'Create a new wallet' },
      { name: 'restore', message: 'Restore wallet from seed' },
      { name: 'sync', message: 'Sync & show balances' },
      { name: 'fund', message: 'Show funding instructions (faucet)' },
      { name: 'dust', message: 'Register NIGHT for DUST generation' },
      { name: 'back', message: '⬅️  Back' },
    ],
  });

  switch (action) {
    case 'create': await createWallet(ctx); break;
    case 'restore': await restoreWallet(ctx); break;
    case 'sync': await syncWallet(ctx); break;
    case 'fund': showFunding(ctx); break;
    case 'dust': await doRegisterDust(ctx); break;
  }
}

async function createWallet(ctx: CLIContext): Promise<void> {
  const seed = generateSeed();
  const spinner = ora('Building wallet...').start();
  try {
    ctx.seed = seed;
    ctx.walletCtx = await buildWallet(ctx.config, seed);
    ctx.providers = null;
    ctx.nft = null;
    spinner.succeed('Wallet created');
    console.log(`\n${DIV}`);
    console.log(chalk.yellow('  SAVE THIS SEED (shown once):'));
    console.log('  ' + chalk.cyan(seed));
    console.log(DIV);
    console.log('  Unshielded address (send tNIGHT here):');
    console.log('  ' + chalk.green(ctx.walletCtx.unshieldedAddress));
    console.log(DIV);
    showFunding(ctx);
  } catch (e) {
    spinner.fail('Failed to build wallet');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function restoreWallet(ctx: CLIContext): Promise<void> {
  const { seed } = await prompt<{ seed: string }>({
    type: 'password',
    name: 'seed',
    message: 'Enter wallet seed (64-char hex):',
  });
  if (!seed) return;
  const spinner = ora('Restoring wallet...').start();
  try {
    ctx.seed = seed.trim();
    ctx.walletCtx = await buildWallet(ctx.config, ctx.seed);
    ctx.providers = null;
    ctx.nft = null;
    spinner.succeed('Wallet restored');
    console.log('  Unshielded address: ' + chalk.green(ctx.walletCtx.unshieldedAddress));
  } catch (e) {
    spinner.fail('Failed to restore wallet');
    console.error(e instanceof Error ? e.message : e);
  }
}

function showFunding(ctx: CLIContext): void {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create or restore a wallet first.')); return; }
  console.log('\n  Fund your wallet with tNIGHT from the Preview faucet:');
  console.log('  ' + chalk.cyan('https://faucet.preview.midnight.network'));
  console.log('  Address: ' + chalk.green(ctx.walletCtx.unshieldedAddress) + '\n');
}

async function syncWallet(ctx: CLIContext): Promise<void> {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create or restore a wallet first.')); return; }
  const spinner = ora('Syncing with Preview indexer...').start();
  try {
    await waitForSync(ctx.walletCtx.wallet);
    const night = await getUnshieldedBalance(ctx.walletCtx.wallet);
    const dust = await getDustBalance(ctx.walletCtx.wallet);
    spinner.succeed('Synced');
    console.log(`  tNIGHT: ${chalk.green(formatBalance(night))}`);
    console.log(`  DUST:   ${chalk.green(formatBalance(dust))}`);
    if (night === 0n) console.log(chalk.yellow('  No tNIGHT yet — fund via the faucet, then sync again.'));
    else if (dust === 0n) console.log(chalk.yellow('  You have tNIGHT but no DUST — run "Register NIGHT for DUST".'));
  } catch (e) {
    spinner.fail('Sync failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doRegisterDust(ctx: CLIContext): Promise<void> {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create or restore a wallet first.')); return; }
  const spinner = ora('Waiting for funds, then registering NIGHT for DUST...').start();
  try {
    await waitForSync(ctx.walletCtx.wallet);
    const night = await getUnshieldedBalance(ctx.walletCtx.wallet);
    if (night === 0n) {
      spinner.warn('No tNIGHT yet. Fund via faucet first.');
      return;
    }
    await registerForDustGeneration(ctx.walletCtx.wallet, ctx.walletCtx.unshieldedKeystore);
    const dust = await getDustBalance(ctx.walletCtx.wallet);
    spinner.succeed('DUST ready');
    console.log(`  DUST: ${chalk.green(formatBalance(dust))}`);
  } catch (e) {
    spinner.fail('DUST registration failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

// ============================ Deploy contracts ============================

async function contractsMenu(ctx: CLIContext): Promise<void> {
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'Deploy Midnight contracts:',
    choices: [
      { name: 'all', message: 'Deploy ALL contracts (NFT + Bridge + Marketplace + Collection)' },
      { name: 'nft', message: 'Deploy NFT contract' },
      { name: 'bridge', message: 'Deploy Bridge contract' },
      { name: 'marketplace', message: 'Deploy Marketplace contract' },
      { name: 'collection', message: 'Deploy Collection contract' },
      { name: 'show', message: 'Show deployed contract addresses' },
      { name: 'back', message: '⬅️  Back' },
    ],
  });

  switch (action) {
    case 'all': await deployAllContracts(ctx); break;
    case 'nft': await doDeploy(ctx); break;
    case 'bridge': await deployOne(ctx, 'bridge'); break;
    case 'marketplace': await deployOne(ctx, 'marketplace'); break;
    case 'collection': await deployOne(ctx, 'collection'); break;
    case 'show': showDeployed(ctx); break;
  }
}

async function deployOne(ctx: CLIContext, key: string): Promise<void> {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create/restore a wallet first.')); return; }
  const def = GENERIC_CONTRACTS.find((d) => d.key === key);
  if (!def) { console.log(chalk.red(`  Unknown contract: ${key}`)); return; }
  const spinner = ora(`Deploying ${def.label} (proving + submitting)...`).start();
  try {
    await waitForSync(ctx.walletCtx.wallet);
    const address = await deployGenericContract(ctx.walletCtx, ctx.config, def);
    ctx.deployed[def.key] = address;
    spinner.succeed(`${def.label} deployed`);
    console.log('  Contract address: ' + chalk.green(address));
  } catch (e) {
    spinner.fail(`${def.label} deploy failed`);
    console.error(e instanceof Error ? e.message : e);
  }
}

async function deployAllContracts(ctx: CLIContext): Promise<void> {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create/restore a wallet first.')); return; }
  // NFT first (uses its own typed deploy path).
  await doDeploy(ctx);
  if (ctx.nftAddress) ctx.deployed['nft'] = ctx.nftAddress;
  // Then the generic public-ledger contracts.
  for (const def of GENERIC_CONTRACTS) {
    await deployOne(ctx, def.key);
  }
  console.log(`\n${DIV}`);
  console.log(chalk.cyan('  Deployment complete.'));
  showDeployed(ctx);
}

function showDeployed(ctx: CLIContext): void {
  console.log(`\n${DIV}`);
  console.log('  Deployed contract addresses');
  console.log(DIV);
  const entries = Object.entries(ctx.deployed);
  if (entries.length === 0) {
    console.log(chalk.dim('  None deployed yet.'));
  } else {
    for (const [key, addr] of entries) {
      console.log(`  ${key.padEnd(12)} ${chalk.green(addr)}`);
    }
  }
  console.log(DIV + '\n');
}

// ============================ NFT contract ============================

async function ensureProviders(ctx: CLIContext): Promise<NFTProviders | null> {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create/restore a wallet first.')); return null; }
  if (ctx.providers) return ctx.providers;
  const spinner = ora('Configuring providers (wallet sync + proof server)...').start();
  try {
    await waitForSync(ctx.walletCtx.wallet);
    ctx.providers = await configureProviders(ctx.walletCtx, ctx.config);
    spinner.succeed('Providers ready');
    return ctx.providers;
  } catch (e) {
    spinner.fail('Failed to configure providers');
    console.error(e instanceof Error ? e.message : e);
    return null;
  }
}

async function nftMenu(ctx: CLIContext): Promise<void> {
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'Midnight NFT contract:',
    choices: [
      { name: 'deploy', message: 'Deploy a new NFT contract' },
      { name: 'join', message: 'Connect to an existing NFT contract' },
      { name: 'mint', message: 'Mint an NFT to myself' },
      { name: 'transfer', message: 'Transfer an NFT' },
      { name: 'burn', message: 'Burn an NFT' },
      { name: 'mine', message: 'List my NFTs' },
      { name: 'supply', message: 'Show total supply' },
      { name: 'back', message: '⬅️  Back' },
    ],
  });

  switch (action) {
    case 'deploy': await doDeploy(ctx); break;
    case 'join': await doJoin(ctx); break;
    case 'mint': await doMint(ctx); break;
    case 'transfer': await doTransfer(ctx); break;
    case 'burn': await doBurn(ctx); break;
    case 'mine': await doListMine(ctx); break;
    case 'supply': await doSupply(ctx); break;
  }
}

async function doDeploy(ctx: CLIContext): Promise<void> {
  const providers = await ensureProviders(ctx);
  if (!providers) return;
  const spinner = ora('Deploying NFT contract (proving + submitting)...').start();
  try {
    ctx.nft = await deployNFT(providers);
    ctx.nftAddress = ctx.nft.deployTxData.public.contractAddress;
    spinner.succeed('NFT contract deployed');
    console.log('  Contract address: ' + chalk.green(ctx.nftAddress));
    console.log(chalk.dim('  Save this address to reconnect later.'));
  } catch (e) {
    spinner.fail('Deploy failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doJoin(ctx: CLIContext): Promise<void> {
  const providers = await ensureProviders(ctx);
  if (!providers) return;
  const { address } = await prompt<{ address: string }>({
    type: 'input',
    name: 'address',
    message: 'NFT contract address:',
  });
  if (!address) return;
  const spinner = ora('Connecting to contract...').start();
  try {
    ctx.nft = await joinNFT(providers, address.trim());
    ctx.nftAddress = ctx.nft.deployTxData.public.contractAddress;
    spinner.succeed('Connected to NFT contract');
    console.log('  Contract address: ' + chalk.green(ctx.nftAddress));
  } catch (e) {
    spinner.fail('Connect failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doMint(ctx: CLIContext): Promise<void> {
  if (!ctx.nft || !ctx.walletCtx) { console.log(chalk.yellow('  Deploy/join a contract first.')); return; }
  const { cid } = await prompt<{ cid: string }>({
    type: 'input',
    name: 'cid',
    message: 'IPFS metadata CID (or any string up to 64 bytes):',
    initial: 'QmExampleMetadataCID',
  });
  const tokenId = randomTokenId();
  const owner = ownerFromCoinPublicKeyHex(ctx.walletCtx.coinPublicKeyHex);
  const spinner = ora('Minting NFT (proving + submitting)...').start();
  try {
    const tx = await mintNFT(ctx.nft, tokenId, owner, padCID(cid || 'QmExampleMetadataCID'));
    spinner.succeed('NFT minted');
    console.log('  Token ID: ' + chalk.green(Buffer.from(tokenId).toString('hex')));
    console.log('  Tx: ' + chalk.dim(tx.txId ?? '(submitted)'));
  } catch (e) {
    spinner.fail('Mint failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doTransfer(ctx: CLIContext): Promise<void> {
  if (!ctx.nft) { console.log(chalk.yellow('  Deploy/join a contract first.')); return; }
  const answers = await prompt<{ tokenId: string; toHex: string }>([
    { type: 'input', name: 'tokenId', message: 'Token ID (hex):' },
    { type: 'input', name: 'toHex', message: "Recipient coin public key (hex):" },
  ]);
  if (!answers.tokenId || !answers.toHex) return;
  const spinner = ora('Transferring NFT...').start();
  try {
    const tokenId = Uint8Array.from(Buffer.from(answers.tokenId.trim(), 'hex'));
    const to = ownerFromCoinPublicKeyHex(answers.toHex.trim());
    const tx = await transferNFT(ctx.nft, to, tokenId);
    spinner.succeed('NFT transferred');
    console.log('  Tx: ' + chalk.dim(tx.txId ?? '(submitted)'));
  } catch (e) {
    spinner.fail('Transfer failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doBurn(ctx: CLIContext): Promise<void> {
  if (!ctx.nft) { console.log(chalk.yellow('  Deploy/join a contract first.')); return; }
  const { tokenId } = await prompt<{ tokenId: string }>({
    type: 'input',
    name: 'tokenId',
    message: 'Token ID to burn (hex):',
  });
  if (!tokenId) return;
  const spinner = ora('Burning NFT...').start();
  try {
    const tx = await burnNFT(ctx.nft, Uint8Array.from(Buffer.from(tokenId.trim(), 'hex')));
    spinner.succeed('NFT burned');
    console.log('  Tx: ' + chalk.dim(tx.txId ?? '(submitted)'));
  } catch (e) {
    spinner.fail('Burn failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doListMine(ctx: CLIContext): Promise<void> {
  if (!ctx.providers || !ctx.nftAddress || !ctx.walletCtx) { console.log(chalk.yellow('  Deploy/join a contract first.')); return; }
  const spinner = ora('Reading ledger...').start();
  try {
    const owned = await getOwnedTokens(ctx.providers, ctx.nftAddress, ctx.walletCtx.coinPublicKeyHex);
    spinner.succeed(`You own ${owned.length} NFT(s)`);
    owned.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  } catch (e) {
    spinner.fail('Read failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function doSupply(ctx: CLIContext): Promise<void> {
  if (!ctx.providers || !ctx.nftAddress) { console.log(chalk.yellow('  Deploy/join a contract first.')); return; }
  const spinner = ora('Reading total supply...').start();
  try {
    const supply = await getTotalSupply(ctx.providers, ctx.nftAddress);
    spinner.succeed(`Total supply: ${supply ?? 0n}`);
  } catch (e) {
    spinner.fail('Read failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

// ============================ XRPL ============================

async function xrplMenu(ctx: CLIContext): Promise<void> {
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'XRPL Testnet:',
    choices: [
      { name: 'connect', message: 'Connect / create a Testnet wallet' },
      { name: 'balance', message: 'Show XRP balance' },
      { name: 'nfts', message: 'List my XRPL NFTs' },
      { name: 'mint', message: 'Mint an XRPL NFT' },
      { name: 'burn', message: 'Burn an XRPL NFT' },
      { name: 'back', message: '⬅️  Back' },
    ],
  });

  switch (action) {
    case 'connect': await xrplConnect(ctx); break;
    case 'balance': await xrplBalance(ctx); break;
    case 'nfts': await xrplNfts(ctx); break;
    case 'mint': await xrplMint(ctx); break;
    case 'burn': await xrplBurn(ctx); break;
  }
}

async function xrplConnect(ctx: CLIContext): Promise<void> {
  const { seed } = await prompt<{ seed: string }>({
    type: 'input',
    name: 'seed',
    message: 'XRPL seed (leave empty to create + faucet-fund a new wallet):',
  });
  const spinner = ora('Connecting to XRPL Testnet...').start();
  try {
    ctx.xrpl = new XRPLClient();
    const { address, isNew } = await ctx.xrpl.connect(seed ? seed.trim() : undefined);
    spinner.succeed('Connected to XRPL Testnet');
    console.log('  Address: ' + chalk.green(address));
    if (isNew) {
      console.log('  Seed (save it): ' + chalk.cyan(ctx.xrpl.seed ?? ''));
      console.log(chalk.dim('  New wallet funded by the testnet faucet.'));
    }
  } catch (e) {
    spinner.fail('Connect failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function xrplBalance(ctx: CLIContext): Promise<void> {
  if (!ctx.xrpl?.isConnected) { console.log(chalk.yellow('  Connect an XRPL wallet first.')); return; }
  const spinner = ora('Fetching balance...').start();
  try {
    const bal = await ctx.xrpl.getBalance();
    spinner.succeed(`Balance: ${bal} XRP`);
  } catch (e) {
    spinner.fail('Failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function xrplNfts(ctx: CLIContext): Promise<void> {
  if (!ctx.xrpl?.isConnected) { console.log(chalk.yellow('  Connect an XRPL wallet first.')); return; }
  const spinner = ora('Fetching NFTs...').start();
  try {
    const nfts = await ctx.xrpl.getNFTs();
    spinner.succeed(`You own ${nfts.length} XRPL NFT(s)`);
    nfts.forEach((n, i) => {
      console.log(`  ${i + 1}. ${n.NFTokenID}`);
      if (n.URI) console.log(`     URI: ${n.URI}`);
      console.log(`     Taxon: ${n.NFTokenTaxon}`);
    });
  } catch (e) {
    spinner.fail('Failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function xrplMint(ctx: CLIContext): Promise<void> {
  if (!ctx.xrpl?.isConnected) { console.log(chalk.yellow('  Connect an XRPL wallet first.')); return; }
  const answers = await prompt<{ uri: string; taxon: string }>([
    { type: 'input', name: 'uri', message: 'Metadata URI (e.g. ipfs://...):', initial: 'ipfs://QmExample' },
    { type: 'input', name: 'taxon', message: 'Taxon:', initial: '0' },
  ]);
  const spinner = ora('Minting XRPL NFT...').start();
  try {
    const hash = await ctx.xrpl.mintNFT(answers.uri, parseInt(answers.taxon || '0', 10));
    spinner.succeed('XRPL NFT minted');
    console.log('  Tx hash: ' + chalk.green(hash));
  } catch (e) {
    spinner.fail('Mint failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

async function xrplBurn(ctx: CLIContext): Promise<void> {
  if (!ctx.xrpl?.isConnected) { console.log(chalk.yellow('  Connect an XRPL wallet first.')); return; }
  const { nftId } = await prompt<{ nftId: string }>({
    type: 'input',
    name: 'nftId',
    message: 'NFTokenID to burn:',
  });
  if (!nftId) return;
  const spinner = ora('Burning XRPL NFT...').start();
  try {
    const hash = await ctx.xrpl.burnNFT(nftId.trim());
    spinner.succeed('XRPL NFT burned');
    console.log('  Tx hash: ' + chalk.green(hash));
    console.log(chalk.dim('  Use this hash as the burn proof in the Burn-To-Mint bridge.'));
  } catch (e) {
    spinner.fail('Burn failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

// ============================ Burn-To-Mint bridge (REAL) ============================

async function bridgeMenu(ctx: CLIContext): Promise<void> {
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'Burn-To-Mint bridge (XRPL → Midnight):',
    choices: [
      { name: 'run', message: 'Run full flow: burn an XRPL NFT → redeem → mint on Midnight' },
      { name: 'manual', message: 'Redeem an existing XRPL burn hash → mint on Midnight' },
      { name: 'join', message: 'Connect to a deployed bridge contract (by address)' },
      { name: 'back', message: '⬅️  Back' },
    ],
  });

  switch (action) {
    case 'run': await runBurnToMint(ctx); break;
    case 'manual': await manualRedeem(ctx); break;
    case 'join': await joinBridge(ctx); break;
  }
}

// Ensure we have a live bridge contract handle (deploy or join).
async function ensureBridge(ctx: CLIContext): Promise<boolean> {
  if (ctx.bridge) return true;
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create/restore a wallet first.')); return false; }
  const def = GENERIC_CONTRACTS.find((d) => d.key === 'bridge')!;
  // Prefer an address already deployed this session.
  let address = ctx.deployed['bridge'] ?? ctx.bridgeAddress ?? '';
  if (!address) {
    const { addr } = await prompt<{ addr: string }>({
      type: 'input',
      name: 'addr',
      message: 'Bridge contract address (deploy one first via 📦 Deploy contracts if needed):',
    });
    address = (addr ?? '').trim();
  }
  if (!address) { console.log(chalk.yellow('  No bridge address provided.')); return false; }
  const spinner = ora('Connecting to bridge contract...').start();
  try {
    await waitForSync(ctx.walletCtx.wallet);
    ctx.bridge = await joinGenericContract(ctx.walletCtx, ctx.config, def, address);
    ctx.bridgeAddress = address;
    spinner.succeed('Bridge contract ready');
    return true;
  } catch (e) {
    spinner.fail('Failed to connect to bridge');
    console.error(e instanceof Error ? e.message : e);
    return false;
  }
}

async function joinBridge(ctx: CLIContext): Promise<void> {
  ctx.bridge = null;
  ctx.bridgeAddress = null;
  await ensureBridge(ctx);
  if (ctx.bridgeAddress) console.log('  Bridge: ' + chalk.green(ctx.bridgeAddress));
}

// Mint the wrapped NFT on Midnight using the burn hash as the token id.
async function mintWrapped(ctx: CLIContext, burnHash: Uint8Array, metadataCID: string): Promise<void> {
  if (!ctx.nft || !ctx.walletCtx) {
    console.log(chalk.yellow('  No NFT contract connected. Deploy/join one via 🎨 Midnight NFT contract first.'));
    return;
  }
  const owner = ownerFromCoinPublicKeyHex(ctx.walletCtx.coinPublicKeyHex);
  const spinner = ora('Minting wrapped NFT on Midnight (proving + submitting)...').start();
  try {
    const tx = await mintNFT(ctx.nft, burnHash, owner, padCID(metadataCID));
    spinner.succeed('Wrapped NFT minted on Midnight');
    console.log('  Midnight token id: ' + chalk.green(Buffer.from(burnHash).toString('hex')));
    console.log('  Mint tx: ' + chalk.dim(tx.txId ?? '(submitted)'));
  } catch (e) {
    spinner.fail('Midnight mint failed');
    console.error(e instanceof Error ? e.message : e);
  }
}

// Record a burn hash on the bridge, then mint the wrapped NFT.
async function redeemAndMint(ctx: CLIContext, burnHash: Uint8Array, metadataCID: string): Promise<void> {
  const spinner = ora('Redeeming burn on the bridge contract (proving + submitting)...').start();
  try {
    const tx = await redeemBurn(ctx.bridge, burnHash, padCID(metadataCID));
    spinner.succeed('Burn redeemed on bridge (replay-protected)');
    console.log('  Redeem tx: ' + chalk.dim(tx.txId ?? '(submitted)'));
  } catch (e) {
    spinner.fail('Bridge redeem failed');
    console.error(e instanceof Error ? e.message : e);
    console.log(chalk.dim('  (If this says "burn already redeemed", the hash was bridged before.)'));
    return;
  }
  await mintWrapped(ctx, burnHash, metadataCID);
}

async function runBurnToMint(ctx: CLIContext): Promise<void> {
  if (!ctx.xrpl?.isConnected) { console.log(chalk.yellow('  Connect an XRPL wallet first (💧 XRPL Testnet).')); return; }
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create/restore a Midnight wallet first.')); return; }
  if (!(await ensureBridge(ctx))) return;

  // 1. Pick an XRPL NFT to burn.
  const listSpinner = ora('Fetching your XRPL NFTs...').start();
  let nfts;
  try {
    nfts = await ctx.xrpl.getNFTs();
    listSpinner.succeed(`Found ${nfts.length} XRPL NFT(s)`);
  } catch (e) {
    listSpinner.fail('Failed to read XRPL NFTs');
    console.error(e instanceof Error ? e.message : e);
    return;
  }
  if (nfts.length === 0) {
    console.log(chalk.yellow('  You own no XRPL NFTs. Mint one first via 💧 XRPL Testnet → Mint.'));
    return;
  }
  const { nftId } = await prompt<{ nftId: string }>({
    type: 'select',
    name: 'nftId',
    message: 'Select the XRPL NFT to burn (this is irreversible):',
    choices: nfts.map((n) => ({ name: n.NFTokenID, message: `${n.NFTokenID}${n.URI ? `  (${n.URI})` : ''}` })),
  });
  const chosen = nfts.find((n) => n.NFTokenID === nftId);
  const metadataCID = chosen?.URI && chosen.URI.length > 0 ? chosen.URI : 'bridged-from-xrpl';

  // 2. Burn it on XRPL → real burn tx hash.
  const burnSpinner = ora('Burning the NFT on XRPL Testnet...').start();
  let burnHashHex: string;
  try {
    burnHashHex = await ctx.xrpl.burnNFT(nftId);
    burnSpinner.succeed('XRPL NFT burned');
    console.log('  Burn tx hash: ' + chalk.green(burnHashHex));
  } catch (e) {
    burnSpinner.fail('XRPL burn failed');
    console.error(e instanceof Error ? e.message : e);
    return;
  }

  // 3. Redeem on the bridge + mint the wrapped NFT on Midnight.
  let burnHash: Uint8Array;
  try {
    burnHash = hexHashToBytes32(burnHashHex);
  } catch (e) {
    console.error(chalk.red(e instanceof Error ? e.message : String(e)));
    return;
  }
  await redeemAndMint(ctx, burnHash, metadataCID);
}

async function manualRedeem(ctx: CLIContext): Promise<void> {
  if (!ctx.walletCtx) { console.log(chalk.yellow('  Create/restore a Midnight wallet first.')); return; }
  if (!(await ensureBridge(ctx))) return;
  const answers = await prompt<{ hash: string; cid: string }>([
    { type: 'input', name: 'hash', message: 'XRPL burn tx hash (64-char hex):' },
    { type: 'input', name: 'cid', message: 'Metadata CID/URI for the wrapped NFT:', initial: 'bridged-from-xrpl' },
  ]);
  if (!answers.hash) return;
  let burnHash: Uint8Array;
  try {
    burnHash = hexHashToBytes32(answers.hash);
  } catch (e) {
    console.error(chalk.red(e instanceof Error ? e.message : String(e)));
    return;
  }
  await redeemAndMint(ctx, burnHash, answers.cid || 'bridged-from-xrpl');
}

// ============================ Demo flows ============================

async function demoMenu(ctx: CLIContext): Promise<void> {
  const { action } = await prompt<{ action: string }>({
    type: 'select',
    name: 'action',
    message: 'Demo flows (simulated — contracts not yet deployed):',
    choices: [
      { name: 'collection', message: 'Collection management (demo)' },
      { name: 'marketplace', message: 'Marketplace listings (demo)' },
      { name: 'back', message: '⬅️  Back' },
    ],
  });
  if (action === 'back') return;
  const sim = { walletManager: {}, contractManager: {}, xrplClient: ctx.xrpl, network: ctx.network } as any;
  if (action === 'collection') {
    const { CollectionCommands } = await import('./commands/collection-impl.js');
    await new CollectionCommands(sim).create();
  } else if (action === 'marketplace') {
    const { MarketplaceCommands } = await import('./commands/marketplace-impl.js');
    await new MarketplaceCommands(sim).browse();
  }
}

// ============================ Status ============================

async function showStatus(ctx: CLIContext): Promise<void> {
  console.log(`\n${DIV}`);
  console.log('  Status');
  console.log(DIV);
  console.log(`  Midnight network:  ${ctx.network}`);
  console.log(`  Wallet:            ${ctx.walletCtx ? chalk.green('loaded') : chalk.red('none')}`);
  if (ctx.walletCtx) console.log(`  Address:           ${ctx.walletCtx.unshieldedAddress}`);
  console.log(`  Providers:         ${ctx.providers ? chalk.green('ready') : chalk.dim('not configured')}`);
  console.log(`  NFT contract:      ${ctx.nftAddress ? chalk.green(ctx.nftAddress) : chalk.dim('none')}`);
  console.log(`  Bridge contract:   ${ctx.bridgeAddress ? chalk.green(ctx.bridgeAddress) : chalk.dim('none')}`);
  const deployed = Object.entries(ctx.deployed);
  if (deployed.length > 0) {
    console.log('  Deployed:');
    for (const [key, addr] of deployed) console.log(`    ${key.padEnd(12)} ${chalk.green(addr)}`);
  }
  console.log(`  XRPL:              ${ctx.xrpl?.isConnected ? chalk.green(ctx.xrpl.address ?? 'connected') : chalk.red('not connected')}`);
  console.log(DIV + '\n');
}
