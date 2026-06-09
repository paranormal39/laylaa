import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger } from "./managed/gxgnight/contract/index.js";

// Private state for the GxgNight token contract.
// Holds the player's secret key used to derive a one-time claim nullifier in-circuit.
export type GxgNightPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createGxgNightPrivateState = (secretKey: Uint8Array): GxgNightPrivateState => ({
  secretKey,
});

// Witness implementation. The compiler-declared witness `playerSecretKey()`
// returns the player's secret from private state; it never leaves the proving context.
export const gxgNightWitnesses = {
  playerSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, GxgNightPrivateState>): [GxgNightPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
};
