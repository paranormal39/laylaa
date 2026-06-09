// Real Midnight (Preview) integration for the NFT Marketplace CLI.
// SPDX-License-Identifier: Apache-2.0
//
// Wallet construction, DUST registration, provider wiring and the transaction
// signing workaround are adapted from the proven example-counter `api.ts`
// (midnight-js 4.x + wallet-sdk 3.x). The contract-specific pieces target the
// compiled @nftmarket/nft-contract.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { NFT, witnesses as nftWitnesses } from '@nftmarket/nft-contract';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v8';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type FinalizedTxData, type MidnightProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js/types';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js/utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Buffer } from 'buffer';
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { type Config, contractConfig, resolveManagedPath } from './config.js';
import { type NFTProviders, NFTPrivateStateId, type DeployedNFTContract, type NFTCircuits } from './common-types.js';

// Required for GraphQL subscriptions (wallet sync) in Node.js
// @ts-expect-error: enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

const nftCompiledContract = CompiledContract.make('nft', NFT.Contract).pipe(
  CompiledContract.withWitnesses(nftWitnesses),
  CompiledContract.withCompiledFileAssets(contractConfig.zkConfigPath),
);

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
  coinPublicKeyHex: string;
  unshieldedAddress: string;
}

// ----- Owner (Either<ZswapCoinPublicKey, ContractAddress>) helpers -----

export interface Owner {
  is_left: boolean;
  left: { bytes: Uint8Array };
  right: { bytes: Uint8Array };
}

export function ownerFromCoinPublicKeyHex(hex: string): Owner {
  return {
    is_left: true,
    left: { bytes: Uint8Array.from(Buffer.from(hex, 'hex')) },
    right: { bytes: new Uint8Array(32) },
  };
}

export function padCID(cid: string): Uint8Array {
  const out = new Uint8Array(64);
  const bytes = Buffer.from(cid, 'utf8');
  out.set(bytes.subarray(0, 64));
  return out;
}

export function randomTokenId(): Uint8Array {
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

// --- transaction signing workaround (verbatim approach from example-counter) ---
const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: 'proof' | 'pre-proof',
): void => {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
};

export const createWalletAndMidnightProvider = async (
  ctx: WalletContext,
): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey() {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl?) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
};

export const waitForSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((state) => state.isSynced),
    ),
  );

export const waitForFunds = (wallet: WalletFacade): Promise<bigint> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.filter((state) => state.isSynced),
      Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

const buildShieldedConfig = ({ indexer, indexerWS, node, proofServer }: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(node.replace(/^http/, 'ws')),
});

const buildUnshieldedConfig = ({ indexer, indexerWS }: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
});

const buildDustConfig = ({ indexer, indexerWS, node, proofServer }: Config) => ({
  networkId: getNetworkId(),
  costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(node.replace(/^http/, 'ws')),
});

const deriveKeysFromSeed = (seed: string) => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Failed to initialize HDWallet from seed');
  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivationResult.type !== 'keysDerived') throw new Error('Failed to derive keys');
  hdWallet.hdWallet.clear();
  return derivationResult.keys;
};

export const formatBalance = (balance: bigint): string => balance.toLocaleString();

export function generateSeed(): string {
  return toHex(Buffer.from(generateRandomSeed()));
}

export function shieldedAddressFor(state: any): string {
  const networkId = getNetworkId();
  const coinPubKey = ShieldedCoinPublicKey.fromHexString(state.shielded.coinPublicKey.toHexString());
  const encPubKey = ShieldedEncryptionPublicKey.fromHexString(state.shielded.encryptionPublicKey.toHexString());
  return MidnightBech32m.encode(networkId, new ShieldedAddress(coinPubKey, encPubKey)).toString();
}

export const registerForDustGeneration = async (
  wallet: WalletFacade,
  unshieldedKeystore: UnshieldedKeystore,
): Promise<void> => {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  if (state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n) return;
  const nightUtxos = state.unshielded.availableCoins.filter(
    (coin: any) => coin.meta?.registeredForDustGeneration !== true,
  );
  if (nightUtxos.length > 0) {
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      nightUtxos,
      unshieldedKeystore.getPublicKey(),
      (payload) => unshieldedKeystore.signData(payload),
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    await wallet.submitTransaction(finalized);
  }
  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((s) => s.isSynced),
      Rx.filter((s) => s.dust.balance(new Date()) > 0n),
    ),
  );
};

export const buildWallet = async (config: Config, seed: string): Promise<WalletContext> => {
  const keys = deriveKeysFromSeed(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const walletConfig = {
    ...buildShieldedConfig(config),
    ...buildUnshieldedConfig(config),
    ...buildDustConfig(config),
  };
  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  const state = await Rx.firstValueFrom(wallet.state());
  return {
    wallet,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
    coinPublicKeyHex: state.shielded.coinPublicKey.toHexString(),
    unshieldedAddress: unshieldedKeystore.getBech32Address(),
  };
};

export const getUnshieldedBalance = async (wallet: WalletFacade): Promise<bigint> => {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return state.unshielded.balances[unshieldedToken().raw] ?? 0n;
};

export const getDustBalance = async (wallet: WalletFacade): Promise<bigint> => {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return state.dust.balance(new Date());
};

export const configureProviders = async (ctx: WalletContext, config: Config): Promise<NFTProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<NFTCircuits>(contractConfig.zkConfigPath);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;
  return {
    privateStateProvider: levelPrivateStateProvider<typeof NFTPrivateStateId>({
      privateStateStoreName: contractConfig.privateStateStoreName,
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

// ----- NFT contract operations -----

export const deployNFT = async (providers: NFTProviders): Promise<DeployedNFTContract> => {
  const contract = await deployContract(providers, {
    compiledContract: nftCompiledContract,
    privateStateId: NFTPrivateStateId,
    initialPrivateState: {},
  });
  return contract;
};

export const joinNFT = async (
  providers: NFTProviders,
  contractAddress: string,
): Promise<DeployedNFTContract> => {
  const contract = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: nftCompiledContract,
    privateStateId: NFTPrivateStateId,
    initialPrivateState: {},
  });
  return contract;
};

export const mintNFT = async (
  contract: DeployedNFTContract,
  tokenId: Uint8Array,
  to: Owner,
  metadataCID: Uint8Array,
): Promise<FinalizedTxData> => {
  const finalized = await contract.callTx.mint(tokenId as any, to as any, metadataCID as any);
  return finalized.public;
};

export const transferNFT = async (
  contract: DeployedNFTContract,
  to: Owner,
  tokenId: Uint8Array,
): Promise<FinalizedTxData> => {
  const finalized = await contract.callTx.transfer(to as any, tokenId as any);
  return finalized.public;
};

export const burnNFT = async (
  contract: DeployedNFTContract,
  tokenId: Uint8Array,
): Promise<FinalizedTxData> => {
  const finalized = await contract.callTx.burn(tokenId as any);
  return finalized.public;
};

export const getTotalSupply = async (
  providers: NFTProviders,
  contractAddress: ContractAddress,
): Promise<bigint | null> => {
  assertIsContractAddress(contractAddress);
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  if (state == null) return null;
  return NFT.ledger(state.data).totalSupply;
};

/** Iterate the ownerOf ledger map and return tokenIds (hex) owned by `coinPublicKeyHex`. */
export const getOwnedTokens = async (
  providers: NFTProviders,
  contractAddress: ContractAddress,
  coinPublicKeyHex: string,
): Promise<string[]> => {
  assertIsContractAddress(contractAddress);
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  if (state == null) return [];
  const owned: string[] = [];
  const data: any = NFT.ledger(state.data);
  try {
    for (const [tokenId, owner] of data.ownerOf) {
      const ownerHex = Buffer.from(owner.left.bytes).toString('hex');
      if (owner.is_left && ownerHex === coinPublicKeyHex) {
        owned.push(Buffer.from(tokenId).toString('hex'));
      }
    }
  } catch {
    // ledger map iteration shape may differ; best-effort
  }
  return owned;
};

// ----- Generic contract deployment (bridge / marketplace / collection) -----
//
// These three contracts keep all state in the public ledger and use empty
// witnesses, so a single generic deploy path works for all of them. Contract
// modules are loaded dynamically so the CLI still starts if one of them has
// not been built yet.

export interface ContractDef {
  key: string;
  label: string;
  pkg: string;
  managedName: string;
  privateStateId: string;
  privateStateStoreName: string;
  load: () => Promise<{ Contract: any; witnesses: any }>;
}

export const GENERIC_CONTRACTS: ContractDef[] = [
  {
    key: 'bridge',
    label: 'Bridge (Burn-To-Mint)',
    pkg: '@nftmarket/bridge-contract',
    managedName: 'bridge',
    privateStateId: 'bridgePrivateState',
    privateStateStoreName: 'bridge-private-state',
    load: async () => {
      const m: any = await import('@nftmarket/bridge-contract');
      return { Contract: m.Bridge.Contract, witnesses: m.witnesses };
    },
  },
  {
    key: 'marketplace',
    label: 'Marketplace',
    pkg: '@nftmarket/marketplace-contract',
    managedName: 'marketplace',
    privateStateId: 'marketplacePrivateState',
    privateStateStoreName: 'marketplace-private-state',
    load: async () => {
      const m: any = await import('@nftmarket/marketplace-contract');
      return { Contract: m.Marketplace.Contract, witnesses: m.witnesses };
    },
  },
  {
    key: 'collection',
    label: 'Collection',
    pkg: '@nftmarket/collection-contract',
    managedName: 'collection',
    privateStateId: 'collectionPrivateState',
    privateStateStoreName: 'collection-private-state',
    load: async () => {
      const m: any = await import('@nftmarket/collection-contract');
      return { Contract: m.Collection.Contract, witnesses: m.witnesses };
    },
  },
];

const configureProvidersGeneric = async (
  ctx: WalletContext,
  config: Config,
  zkConfigPath: string,
  privateStateStoreName: string,
): Promise<any> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<string>(zkConfigPath);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName,
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

const buildGenericCompiledAndProviders = async (
  ctx: WalletContext,
  config: Config,
  def: ContractDef,
): Promise<{ compiled: any; providers: any }> => {
  const mod = await def.load();
  const zkConfigPath = resolveManagedPath(def.pkg, def.managedName);
  const compiled = CompiledContract.make(def.managedName, mod.Contract).pipe(
    CompiledContract.withWitnesses(mod.witnesses),
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );
  const providers = await configureProvidersGeneric(ctx, config, zkConfigPath, def.privateStateStoreName);
  return { compiled, providers };
};

export const deployGenericContract = async (
  ctx: WalletContext,
  config: Config,
  def: ContractDef,
): Promise<string> => {
  const { compiled, providers } = await buildGenericCompiledAndProviders(ctx, config, def);
  const deployed = await deployContract(providers, {
    compiledContract: compiled,
    privateStateId: def.privateStateId,
    initialPrivateState: {},
  });
  return deployed.deployTxData.public.contractAddress;
};

export const joinGenericContract = async (
  ctx: WalletContext,
  config: Config,
  def: ContractDef,
  contractAddress: string,
): Promise<any> => {
  const { compiled, providers } = await buildGenericCompiledAndProviders(ctx, config, def);
  return findDeployedContract(providers, {
    contractAddress,
    compiledContract: compiled,
    privateStateId: def.privateStateId,
    initialPrivateState: {},
  });
};

// ----- Bridge Burn-To-Mint operation -----
//
// Records a verified XRPL burn on the bridge contract. The circuit returns the
// wrapped token id (== the burn hash); replay is rejected on-chain. The CLI
// then mints the wrapped NFT on the NFT contract using that token id.
export const redeemBurn = async (
  bridge: any,
  burnTxHash: Uint8Array,
  metadataCID: Uint8Array,
): Promise<FinalizedTxData> => {
  const finalized = await bridge.callTx.redeemBurn(burnTxHash as any, metadataCID as any);
  return finalized.public;
};

// Convert a 64-char hex XRPL tx hash into the 32-byte Bytes<32> the contracts
// expect (also used directly as the wrapped Midnight token id).
export function hexHashToBytes32(hash: string): Uint8Array {
  const clean = hash.trim().replace(/^0x/i, '');
  if (clean.length !== 64) {
    throw new Error(`Expected a 64-char hex hash (32 bytes), got ${clean.length} chars`);
  }
  return Uint8Array.from(Buffer.from(clean, 'hex'));
}
