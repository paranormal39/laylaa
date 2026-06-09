import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Owner = { is_left: boolean,
                      left: { bytes: Uint8Array },
                      right: { bytes: Uint8Array }
                    };

export type CollectionId = Uint8Array;

export type MetadataCID = Uint8Array;

export type CollectionData = { name: Uint8Array;
                               symbol: Uint8Array;
                               description: Uint8Array;
                               metadataCID: MetadataCID;
                               creator: Owner;
                               isVerified: boolean;
                               isApprovedForMigration: boolean;
                               royaltyBps: bigint;
                               maxSupply: bigint;
                               currentSupply: bigint;
                               isPaused: boolean
                             };

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  createCollection(context: __compactRuntime.CircuitContext<PS>,
                   collectionId_0: CollectionId,
                   name_0: Uint8Array,
                   symbol_0: Uint8Array,
                   description_0: Uint8Array,
                   metadataCID_0: MetadataCID,
                   royaltyBps_0: bigint,
                   maxSupply_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyCollection(context: __compactRuntime.CircuitContext<PS>,
                   collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, []>;
  approveForMigration(context: __compactRuntime.CircuitContext<PS>,
                      collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, []>;
  incrementSupply(context: __compactRuntime.CircuitContext<PS>,
                  collectionId_0: CollectionId,
                  amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>,
            collectionId_0: CollectionId,
            paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  getCollection(context: __compactRuntime.CircuitContext<PS>,
                collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, CollectionData>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  createCollection(context: __compactRuntime.CircuitContext<PS>,
                   collectionId_0: CollectionId,
                   name_0: Uint8Array,
                   symbol_0: Uint8Array,
                   description_0: Uint8Array,
                   metadataCID_0: MetadataCID,
                   royaltyBps_0: bigint,
                   maxSupply_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyCollection(context: __compactRuntime.CircuitContext<PS>,
                   collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, []>;
  approveForMigration(context: __compactRuntime.CircuitContext<PS>,
                      collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, []>;
  incrementSupply(context: __compactRuntime.CircuitContext<PS>,
                  collectionId_0: CollectionId,
                  amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>,
            collectionId_0: CollectionId,
            paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  getCollection(context: __compactRuntime.CircuitContext<PS>,
                collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, CollectionData>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  createCollection(context: __compactRuntime.CircuitContext<PS>,
                   collectionId_0: CollectionId,
                   name_0: Uint8Array,
                   symbol_0: Uint8Array,
                   description_0: Uint8Array,
                   metadataCID_0: MetadataCID,
                   royaltyBps_0: bigint,
                   maxSupply_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyCollection(context: __compactRuntime.CircuitContext<PS>,
                   collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, []>;
  approveForMigration(context: __compactRuntime.CircuitContext<PS>,
                      collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, []>;
  incrementSupply(context: __compactRuntime.CircuitContext<PS>,
                  collectionId_0: CollectionId,
                  amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>,
            collectionId_0: CollectionId,
            paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  getCollection(context: __compactRuntime.CircuitContext<PS>,
                collectionId_0: CollectionId): __compactRuntime.CircuitResults<PS, CollectionData>;
}

export type Ledger = {
  collections: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: CollectionId): boolean;
    lookup(key_0: CollectionId): CollectionData;
    [Symbol.iterator](): Iterator<[CollectionId, CollectionData]>
  };
  readonly admin: Owner;
  readonly initialized: boolean;
  readonly collectionCount: bigint;
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
