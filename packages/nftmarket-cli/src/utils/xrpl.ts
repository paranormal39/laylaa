// Self-contained XRPL Testnet client for the CLI
// SPDX-License-Identifier: Apache-2.0

import { Client, Wallet, dropsToXrp, xrpToDrops } from 'xrpl';

export interface XRPLNFT {
  NFTokenID: string;
  URI?: string;
  nft_serial: number;
  NFTokenTaxon: number;
  Issuer?: string;
}

// Endpoints are tried in order. The xrpl-labs testnet node runs on port 443,
// which works through most firewalls/WSL; the official altnet node on port
// 51233 is often blocked, so it is only a fallback.
const DEFAULT_TESTNET_ENDPOINTS = [
  'wss://testnet.xrpl-labs.com',
  'wss://s.altnet.rippletest.net:51233',
];

export class XRPLClient {
  private client: Client | null = null;
  private wallet: Wallet | null = null;
  public isConnected = false;
  private endpoints: string[];

  constructor(server?: string) {
    this.endpoints = server ? [server] : DEFAULT_TESTNET_ENDPOINTS;
  }

  private async connectAny(): Promise<void> {
    let lastError: unknown;
    for (const url of this.endpoints) {
      const client = new Client(url, { connectionTimeout: 20000 });
      try {
        await client.connect();
        this.client = client;
        return;
      } catch (e) {
        lastError = e;
        try { await client.disconnect(); } catch { /* ignore */ }
      }
    }
    throw new Error(
      `Could not connect to any XRPL Testnet endpoint (${this.endpoints.join(', ')}). ` +
        `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  async connect(seed?: string): Promise<{ address: string; isNew: boolean }> {
    if (!this.client || !this.client.isConnected()) await this.connectAny();
    this.isConnected = true;
    let isNew = false;
    if (seed) {
      this.wallet = Wallet.fromSeed(seed);
    } else {
      // Fund a brand-new testnet wallet via the faucet
      const funded = await this.requireClient().fundWallet();
      this.wallet = funded.wallet;
      isNew = true;
    }
    return { address: this.wallet.address, isNew };
  }

  private requireClient(): Client {
    if (!this.client) throw new Error('XRPL client not connected');
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client?.isConnected()) await this.client.disconnect();
    this.isConnected = false;
  }

  get address(): string | null {
    return this.wallet?.address ?? null;
  }

  get seed(): string | null {
    return this.wallet?.seed ?? null;
  }

  async getBalance(address?: string): Promise<string> {
    const addr = address ?? this.wallet?.address;
    if (!addr) throw new Error('No XRPL address');
    const res = await this.requireClient().request({ command: 'account_info', account: addr });
    return dropsToXrp(res.result.account_data.Balance).toString();
  }

  async getNFTs(address?: string): Promise<XRPLNFT[]> {
    const addr = address ?? this.wallet?.address;
    if (!addr) throw new Error('No XRPL address');
    const res = await this.requireClient().request({ command: 'account_nfts', account: addr });
    return (res.result.account_nfts as unknown as XRPLNFT[]).map((n) => ({
      ...n,
      URI: n.URI ? Buffer.from(n.URI, 'hex').toString('utf8') : undefined,
    }));
  }

  async mintNFT(uri: string, taxon = 0): Promise<string> {
    if (!this.wallet) throw new Error('XRPL wallet not connected');
    const tx: any = {
      TransactionType: 'NFTokenMint',
      Account: this.wallet.address,
      NFTokenTaxon: taxon,
      Flags: 8, // transferable
      Fee: xrpToDrops('0.0001'),
    };
    if (uri) tx.URI = Buffer.from(uri).toString('hex').toUpperCase();
    const res = await this.requireClient().submitAndWait(tx, { wallet: this.wallet });
    return res.result.hash;
  }

  async burnNFT(nftId: string): Promise<string> {
    if (!this.wallet) throw new Error('XRPL wallet not connected');
    const tx: any = {
      TransactionType: 'NFTokenBurn',
      Account: this.wallet.address,
      NFTokenID: nftId,
      Fee: xrpToDrops('0.0001'),
    };
    const res = await this.requireClient().submitAndWait(tx, { wallet: this.wallet });
    return res.result.hash;
  }

  async getTransaction(hash: string): Promise<unknown> {
    const res = await this.requireClient().request({ command: 'tx', transaction: hash });
    return res.result;
  }
}
