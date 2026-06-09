import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type XRPLTxHash = Uint8Array;

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>, paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  redeemBurn(context: __compactRuntime.CircuitContext<PS>,
             burnTxHash_0: XRPLTxHash,
             metadataCID_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  isRedeemed(context: __compactRuntime.CircuitContext<PS>,
             burnTxHash_0: XRPLTxHash): __compactRuntime.CircuitResults<PS, boolean>;
  metadataOfBurn(context: __compactRuntime.CircuitContext<PS>,
                 burnTxHash_0: XRPLTxHash): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>, paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  redeemBurn(context: __compactRuntime.CircuitContext<PS>,
             burnTxHash_0: XRPLTxHash,
             metadataCID_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  isRedeemed(context: __compactRuntime.CircuitContext<PS>,
             burnTxHash_0: XRPLTxHash): __compactRuntime.CircuitResults<PS, boolean>;
  metadataOfBurn(context: __compactRuntime.CircuitContext<PS>,
                 burnTxHash_0: XRPLTxHash): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  setPaused(context: __compactRuntime.CircuitContext<PS>, paused_0: boolean): __compactRuntime.CircuitResults<PS, []>;
  redeemBurn(context: __compactRuntime.CircuitContext<PS>,
             burnTxHash_0: XRPLTxHash,
             metadataCID_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  isRedeemed(context: __compactRuntime.CircuitContext<PS>,
             burnTxHash_0: XRPLTxHash): __compactRuntime.CircuitResults<PS, boolean>;
  metadataOfBurn(context: __compactRuntime.CircuitContext<PS>,
                 burnTxHash_0: XRPLTxHash): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly admin: Uint8Array;
  readonly adminSet: boolean;
  readonly isPaused: boolean;
  processedBurns: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  metadataFor: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  readonly migrationCount: bigint;
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
