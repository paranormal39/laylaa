import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Owner = { is_left: boolean,
                      left: { bytes: Uint8Array },
                      right: { bytes: Uint8Array }
                    };

export type ListingId = Uint8Array;

export type TokenId = Uint8Array;

export enum ListingStatus { active = 0, sold = 1, cancelled = 2 }

export type Listing = { seller: Owner;
                        nftContract: Uint8Array;
                        tokenId: TokenId;
                        price: bigint;
                        currency: Uint8Array;
                        status: ListingStatus;
                        buyer: { is_some: boolean, value: Owner }
                      };

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>, feeBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPlatformFee(context: __compactRuntime.CircuitContext<PS>, feeBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPlatformFeeRecipient(context: __compactRuntime.CircuitContext<PS>,
                          recipient_0: Owner): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>, paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createListing(context: __compactRuntime.CircuitContext<PS>,
                listingId_0: ListingId,
                nftContract_0: Uint8Array,
                tokenId_0: TokenId,
                price_0: bigint,
                currency_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  editListing(context: __compactRuntime.CircuitContext<PS>,
              listingId_0: ListingId,
              newPrice_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancelListing(context: __compactRuntime.CircuitContext<PS>,
                listingId_0: ListingId): __compactRuntime.CircuitResults<PS, []>;
  buyListing(context: __compactRuntime.CircuitContext<PS>,
             listingId_0: ListingId): __compactRuntime.CircuitResults<PS, []>;
  getListing(context: __compactRuntime.CircuitContext<PS>,
             listingId_0: ListingId): __compactRuntime.CircuitResults<PS, Listing>;
  quotePlatformFeeNumerator(context: __compactRuntime.CircuitContext<PS>,
                            price_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>, feeBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPlatformFee(context: __compactRuntime.CircuitContext<PS>, feeBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPlatformFeeRecipient(context: __compactRuntime.CircuitContext<PS>,
                          recipient_0: Owner): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>, paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createListing(context: __compactRuntime.CircuitContext<PS>,
                listingId_0: ListingId,
                nftContract_0: Uint8Array,
                tokenId_0: TokenId,
                price_0: bigint,
                currency_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  editListing(context: __compactRuntime.CircuitContext<PS>,
              listingId_0: ListingId,
              newPrice_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancelListing(context: __compactRuntime.CircuitContext<PS>,
                listingId_0: ListingId): __compactRuntime.CircuitResults<PS, []>;
  buyListing(context: __compactRuntime.CircuitContext<PS>,
             listingId_0: ListingId): __compactRuntime.CircuitResults<PS, []>;
  getListing(context: __compactRuntime.CircuitContext<PS>,
             listingId_0: ListingId): __compactRuntime.CircuitResults<PS, Listing>;
  quotePlatformFeeNumerator(context: __compactRuntime.CircuitContext<PS>,
                            price_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>, feeBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPlatformFee(context: __compactRuntime.CircuitContext<PS>, feeBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPlatformFeeRecipient(context: __compactRuntime.CircuitContext<PS>,
                          recipient_0: Owner): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>, paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  createListing(context: __compactRuntime.CircuitContext<PS>,
                listingId_0: ListingId,
                nftContract_0: Uint8Array,
                tokenId_0: TokenId,
                price_0: bigint,
                currency_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  editListing(context: __compactRuntime.CircuitContext<PS>,
              listingId_0: ListingId,
              newPrice_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  cancelListing(context: __compactRuntime.CircuitContext<PS>,
                listingId_0: ListingId): __compactRuntime.CircuitResults<PS, []>;
  buyListing(context: __compactRuntime.CircuitContext<PS>,
             listingId_0: ListingId): __compactRuntime.CircuitResults<PS, []>;
  getListing(context: __compactRuntime.CircuitContext<PS>,
             listingId_0: ListingId): __compactRuntime.CircuitResults<PS, Listing>;
  quotePlatformFeeNumerator(context: __compactRuntime.CircuitContext<PS>,
                            price_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
}

export type Ledger = {
  listings: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: ListingId): boolean;
    lookup(key_0: ListingId): Listing;
    [Symbol.iterator](): Iterator<[ListingId, Listing]>
  };
  readonly admin: Owner;
  readonly platformFeeRecipient: Owner;
  readonly initialized: boolean;
  readonly isPaused: boolean;
  readonly platformFeeBps: bigint;
  readonly listingCount: bigint;
  readonly volumeNight: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
