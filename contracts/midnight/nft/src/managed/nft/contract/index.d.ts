import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Owner = { is_left: boolean,
                      left: { bytes: Uint8Array },
                      right: { bytes: Uint8Array }
                    };

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       tokenId_0: Uint8Array,
       to_0: Owner,
       metadataCID_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  ownerOfToken(context: __compactRuntime.CircuitContext<PS>,
               tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Owner>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Owner,
           tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approve(context: __compactRuntime.CircuitContext<PS>,
          spender_0: Owner,
          tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  transferFrom(context: __compactRuntime.CircuitContext<PS>,
               fromOwner_0: Owner,
               to_0: Owner,
               tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  burn(context: __compactRuntime.CircuitContext<PS>, tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       tokenId_0: Uint8Array,
       to_0: Owner,
       metadataCID_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  ownerOfToken(context: __compactRuntime.CircuitContext<PS>,
               tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Owner>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Owner,
           tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approve(context: __compactRuntime.CircuitContext<PS>,
          spender_0: Owner,
          tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  transferFrom(context: __compactRuntime.CircuitContext<PS>,
               fromOwner_0: Owner,
               to_0: Owner,
               tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  burn(context: __compactRuntime.CircuitContext<PS>, tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       tokenId_0: Uint8Array,
       to_0: Owner,
       metadataCID_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  ownerOfToken(context: __compactRuntime.CircuitContext<PS>,
               tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Owner>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           to_0: Owner,
           tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approve(context: __compactRuntime.CircuitContext<PS>,
          spender_0: Owner,
          tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  transferFrom(context: __compactRuntime.CircuitContext<PS>,
               fromOwner_0: Owner,
               to_0: Owner,
               tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  burn(context: __compactRuntime.CircuitContext<PS>, tokenId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  ownerOf: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Owner;
    [Symbol.iterator](): Iterator<[Uint8Array, Owner]>
  };
  metadataOf: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  approvedOf: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Owner;
    [Symbol.iterator](): Iterator<[Uint8Array, Owner]>
  };
  readonly totalSupply: bigint;
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
