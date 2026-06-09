// XRPL Client Implementation
// SPDX-License-Identifier: Apache-2.0

import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import type {
  AccountNFTsResponse,
  AccountInfoResponse,
  TxResponse,
  NFTokenMint,
  NFTokenBurn,
  NFTokenCreateOffer,
  NFTokenAcceptOffer,
} from 'xrpl';
import type {
  XRPLNFT,
  XRPLOffer,
  XRPLWalletInfo,
  XRPLTxResult,
  XRPLBurnReceipt,
  XRPLConfig,
} from './types.js';

export class XRPLClient {
  private client: Client;
  private wallet: Wallet | null = null;
  private config: XRPLConfig;

  constructor(config: XRPLConfig) {
    this.config = config;
    this.client = new Client(config.server);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  // Wallet Management
  generateWallet(): Wallet {
    return Wallet.generate();
  }

  async setWallet(seed: string): Promise<XRPLWalletInfo> {
    this.wallet = Wallet.fromSeed(seed);
    const balance = await this.getBalance(this.wallet.address);
    
    return {
      address: this.wallet.address,
      publicKey: this.wallet.publicKey,
      seed: this.wallet.seed,
      balance,
    };
  }

  getWallet(): Wallet | null {
    return this.wallet;
  }

  // Account Operations
  async getBalance(address?: string): Promise<string> {
    const addr = address || this.wallet?.address;
    if (!addr) throw new Error('No address provided');

    const response = await this.client.request({
      command: 'account_info',
      account: addr,
    }) as AccountInfoResponse;

    return dropsToXrp(response.result.account_data.Balance);
  }

  async getNFTs(address?: string): Promise<XRPLNFT[]> {
    const addr = address || this.wallet?.address;
    if (!addr) throw new Error('No address provided');

    const response = await this.client.request({
      command: 'account_nfts',
      account: addr,
    }) as AccountNFTsResponse;

    return (response.result.account_nfts as XRPLNFT[]).map(nft => ({
      ...nft,
      // Decode URI if present
      URI: nft.URI ? Buffer.from(nft.URI, 'hex').toString('utf8') : undefined,
    }));
  }

  // NFT Operations
  async mintNFT(
    uri: string,
    taxon: number = 0,
    options: {
      transferFee?: number;
      flags?: number;
    } = {}
  ): Promise<XRPLTxResult> {
    if (!this.wallet) throw new Error('Wallet not set');

    const mintTx: NFTokenMint = {
      TransactionType: 'NFTokenMint',
      Account: this.wallet.address,
      NFTokenTaxon: taxon,
      Flags: options.flags ?? 8, // Transferable by default
      Fee: xrpToDrops('0.0001'),
    };

    if (uri) {
      mintTx.URI = Buffer.from(uri).toString('hex').toUpperCase();
    }

    if (options.transferFee) {
      mintTx.TransferFee = options.transferFee;
    }

    const result = await this.client.submitAndWait(mintTx, {
      wallet: this.wallet,
    });

    return {
      hash: result.result.hash,
      status: result.result.meta && typeof result.result.meta !== 'string' 
        ? result.result.meta.TransactionResult === 'tesSUCCESS' ? 'success' : 'failed'
        : 'failed',
      validated: true,
      meta: result.result.meta,
    };
  }

  async burnNFT(nftId: string): Promise<XRPLTxResult> {
    if (!this.wallet) throw new Error('Wallet not set');

    const burnTx: NFTokenBurn = {
      TransactionType: 'NFTokenBurn',
      Account: this.wallet.address,
      NFTokenID: nftId,
      Fee: xrpToDrops('0.0001'),
    };

    const result = await this.client.submitAndWait(burnTx, {
      wallet: this.wallet,
    });

    return {
      hash: result.result.hash,
      status: result.result.meta && typeof result.result.meta !== 'string'
        ? result.result.meta.TransactionResult === 'tesSUCCESS' ? 'success' : 'failed'
        : 'failed',
      validated: true,
      meta: result.result.meta,
    };
  }

  // Marketplace Operations
  async createSellOffer(
    nftId: string,
    amount: string, // in drops
    destination?: string
  ): Promise<XRPLTxResult> {
    if (!this.wallet) throw new Error('Wallet not set');

    const offerTx: NFTokenCreateOffer = {
      TransactionType: 'NFTokenCreateOffer',
      Account: this.wallet.address,
      NFTokenID: nftId,
      Amount: amount,
      Fee: xrpToDrops('0.0001'),
    };

    if (destination) {
      offerTx.Destination = destination;
    }

    const result = await this.client.submitAndWait(offerTx, {
      wallet: this.wallet,
    });

    return {
      hash: result.result.hash,
      status: result.result.meta && typeof result.result.meta !== 'string'
        ? result.result.meta.TransactionResult === 'tesSUCCESS' ? 'success' : 'failed'
        : 'failed',
      validated: true,
      meta: result.result.meta,
    };
  }

  async acceptBuyOffer(offerId: string): Promise<XRPLTxResult> {
    if (!this.wallet) throw new Error('Wallet not set');

    const acceptTx: NFTokenAcceptOffer = {
      TransactionType: 'NFTokenAcceptOffer',
      Account: this.wallet.address,
      NFTokenBuyOffer: offerId,
      Fee: xrpToDrops('0.0001'),
    };

    const result = await this.client.submitAndWait(acceptTx, {
      wallet: this.wallet,
    });

    return {
      hash: result.result.hash,
      status: result.result.meta && typeof result.result.meta !== 'string'
        ? result.result.meta.TransactionResult === 'tesSUCCESS' ? 'success' : 'failed'
        : 'failed',
      validated: true,
      meta: result.result.meta,
    };
  }

  // Bridge Operations
  async getBurnReceipt(txHash: string): Promise<XRPLBurnReceipt | null> {
    try {
      const response = await this.client.request({
        command: 'tx',
        transaction: txHash,
      }) as TxResponse;

      const tx = response.result;
      
      if (tx.TransactionType !== 'NFTokenBurn') {
        return null;
      }

      // Extract receipt details
      return {
        transactionHash: tx.hash,
        tokenId: (tx as any).NFTokenID,
        issuer: (tx as any).Issuer || tx.Account,
        taxon: 0, // Would need to look up from ledger
        burnedAt: tx.date ? new Date((tx.date + 946684800) * 1000).getTime() : Date.now(),
        ledgerIndex: tx.ledger_index || 0,
      };
    } catch {
      return null;
    }
  }

  async verifyBurn(txHash: string, expectedTokenId: string): Promise<boolean> {
    const receipt = await this.getBurnReceipt(txHash);
    if (!receipt) return false;
    
    return receipt.tokenId === expectedTokenId;
  }

  // Utility Methods
  async fundWalletViaFaucet(address?: string): Promise<boolean> {
    const addr = address || this.wallet?.address;
    if (!addr) throw new Error('No address provided');
    if (!this.config.faucetUrl) throw new Error('No faucet configured');

    try {
      const response = await fetch(this.config.faucetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: addr }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Static factory methods
  static forTestnet(): XRPLClient {
    return new XRPLClient({
      server: 'wss://s.altnet.rippletest.net:51233',
      faucetUrl: 'https://faucet.altnet.rippletest.net/accounts',
      network: 'testnet',
    });
  }

  static forMainnet(): XRPLClient {
    return new XRPLClient({
      server: 'wss://xrplcluster.com',
      network: 'mainnet',
    });
  }
}
