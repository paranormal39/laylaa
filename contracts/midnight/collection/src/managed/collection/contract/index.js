import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.15.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(64);

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(16);

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(256);

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_5 = new _ZswapCoinPublicKey_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_6 = new _ContractAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_5.alignment().concat(_descriptor_6.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_5.fromValue(value_0),
      right: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_5.toValue(value_0.left).concat(_descriptor_6.toValue(value_0.right)));
  }
}

const _descriptor_7 = new _Either_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _CollectionData_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment().concat(_descriptor_7.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_8.alignment().concat(_descriptor_9.alignment().concat(_descriptor_9.alignment().concat(_descriptor_4.alignment()))))))))));
  }
  fromValue(value_0) {
    return {
      name: _descriptor_1.fromValue(value_0),
      symbol: _descriptor_2.fromValue(value_0),
      description: _descriptor_3.fromValue(value_0),
      metadataCID: _descriptor_1.fromValue(value_0),
      creator: _descriptor_7.fromValue(value_0),
      isVerified: _descriptor_4.fromValue(value_0),
      isApprovedForMigration: _descriptor_4.fromValue(value_0),
      royaltyBps: _descriptor_8.fromValue(value_0),
      maxSupply: _descriptor_9.fromValue(value_0),
      currentSupply: _descriptor_9.fromValue(value_0),
      isPaused: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.name).concat(_descriptor_2.toValue(value_0.symbol).concat(_descriptor_3.toValue(value_0.description).concat(_descriptor_1.toValue(value_0.metadataCID).concat(_descriptor_7.toValue(value_0.creator).concat(_descriptor_4.toValue(value_0.isVerified).concat(_descriptor_4.toValue(value_0.isApprovedForMigration).concat(_descriptor_8.toValue(value_0.royaltyBps).concat(_descriptor_9.toValue(value_0.maxSupply).concat(_descriptor_9.toValue(value_0.currentSupply).concat(_descriptor_4.toValue(value_0.isPaused)))))))))));
  }
}

const _descriptor_10 = new _CollectionData_0();

class _Either_1 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_11 = new _Either_1();

const _descriptor_12 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      initialize: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`initialize: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('initialize',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 51 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._initialize_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      createCollection: (...args_1) => {
        if (args_1.length !== 8) {
          throw new __compactRuntime.CompactError(`createCollection: expected 8 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const collectionId_0 = args_1[1];
        const name_0 = args_1[2];
        const symbol_0 = args_1[3];
        const description_0 = args_1[4];
        const metadataCID_0 = args_1[5];
        const royaltyBps_0 = args_1[6];
        const maxSupply_0 = args_1[7];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(collectionId_0.buffer instanceof ArrayBuffer && collectionId_0.BYTES_PER_ELEMENT === 1 && collectionId_0.length === 32)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Bytes<32>',
                                     collectionId_0)
        }
        if (!(name_0.buffer instanceof ArrayBuffer && name_0.BYTES_PER_ELEMENT === 1 && name_0.length === 64)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Bytes<64>',
                                     name_0)
        }
        if (!(symbol_0.buffer instanceof ArrayBuffer && symbol_0.BYTES_PER_ELEMENT === 1 && symbol_0.length === 16)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Bytes<16>',
                                     symbol_0)
        }
        if (!(description_0.buffer instanceof ArrayBuffer && description_0.BYTES_PER_ELEMENT === 1 && description_0.length === 256)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Bytes<256>',
                                     description_0)
        }
        if (!(metadataCID_0.buffer instanceof ArrayBuffer && metadataCID_0.BYTES_PER_ELEMENT === 1 && metadataCID_0.length === 64)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Bytes<64>',
                                     metadataCID_0)
        }
        if (!(typeof(royaltyBps_0) === 'bigint' && royaltyBps_0 >= 0n && royaltyBps_0 <= 65535n)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Uint<0..65536>',
                                     royaltyBps_0)
        }
        if (!(typeof(maxSupply_0) === 'bigint' && maxSupply_0 >= 0n && maxSupply_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('createCollection',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'collection.compact line 62 char 1',
                                     'Uint<0..18446744073709551616>',
                                     maxSupply_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(collectionId_0).concat(_descriptor_1.toValue(name_0).concat(_descriptor_2.toValue(symbol_0).concat(_descriptor_3.toValue(description_0).concat(_descriptor_1.toValue(metadataCID_0).concat(_descriptor_8.toValue(royaltyBps_0).concat(_descriptor_9.toValue(maxSupply_0))))))),
            alignment: _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment().concat(_descriptor_8.alignment().concat(_descriptor_9.alignment()))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._createCollection_0(context,
                                                  partialProofData,
                                                  collectionId_0,
                                                  name_0,
                                                  symbol_0,
                                                  description_0,
                                                  metadataCID_0,
                                                  royaltyBps_0,
                                                  maxSupply_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      verifyCollection: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`verifyCollection: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const collectionId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('verifyCollection',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 94 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(collectionId_0.buffer instanceof ArrayBuffer && collectionId_0.BYTES_PER_ELEMENT === 1 && collectionId_0.length === 32)) {
          __compactRuntime.typeError('verifyCollection',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'collection.compact line 94 char 1',
                                     'Bytes<32>',
                                     collectionId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(collectionId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._verifyCollection_0(context,
                                                  partialProofData,
                                                  collectionId_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      approveForMigration: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`approveForMigration: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const collectionId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('approveForMigration',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 117 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(collectionId_0.buffer instanceof ArrayBuffer && collectionId_0.BYTES_PER_ELEMENT === 1 && collectionId_0.length === 32)) {
          __compactRuntime.typeError('approveForMigration',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'collection.compact line 117 char 1',
                                     'Bytes<32>',
                                     collectionId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(collectionId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._approveForMigration_0(context,
                                                     partialProofData,
                                                     collectionId_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      incrementSupply: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`incrementSupply: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const collectionId_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('incrementSupply',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 140 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(collectionId_0.buffer instanceof ArrayBuffer && collectionId_0.BYTES_PER_ELEMENT === 1 && collectionId_0.length === 32)) {
          __compactRuntime.typeError('incrementSupply',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'collection.compact line 140 char 1',
                                     'Bytes<32>',
                                     collectionId_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('incrementSupply',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'collection.compact line 140 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(collectionId_0).concat(_descriptor_9.toValue(amount_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_9.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._incrementSupply_0(context,
                                                 partialProofData,
                                                 collectionId_0,
                                                 amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      setPaused: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`setPaused: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const collectionId_0 = args_1[1];
        const paused_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('setPaused',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 166 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(collectionId_0.buffer instanceof ArrayBuffer && collectionId_0.BYTES_PER_ELEMENT === 1 && collectionId_0.length === 32)) {
          __compactRuntime.typeError('setPaused',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'collection.compact line 166 char 1',
                                     'Bytes<32>',
                                     collectionId_0)
        }
        if (!(typeof(paused_0) === 'boolean')) {
          __compactRuntime.typeError('setPaused',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'collection.compact line 166 char 1',
                                     'Boolean',
                                     paused_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(collectionId_0).concat(_descriptor_4.toValue(paused_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_4.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._setPaused_0(context,
                                           partialProofData,
                                           collectionId_0,
                                           paused_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      getCollection: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`getCollection: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const collectionId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('getCollection',
                                     'argument 1 (as invoked from Typescript)',
                                     'collection.compact line 190 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(collectionId_0.buffer instanceof ArrayBuffer && collectionId_0.BYTES_PER_ELEMENT === 1 && collectionId_0.length === 32)) {
          __compactRuntime.typeError('getCollection',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'collection.compact line 190 char 1',
                                     'Bytes<32>',
                                     collectionId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(collectionId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._getCollection_0(context,
                                               partialProofData,
                                               collectionId_0);
        partialProofData.output = { value: _descriptor_10.toValue(result_0), alignment: _descriptor_10.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      initialize: this.circuits.initialize,
      createCollection: this.circuits.createCollection,
      verifyCollection: this.circuits.verifyCollection,
      approveForMigration: this.circuits.approveForMigration,
      incrementSupply: this.circuits.incrementSupply,
      setPaused: this.circuits.setPaused,
      getCollection: this.circuits.getCollection
    };
    this.provableCircuits = {
      initialize: this.circuits.initialize,
      createCollection: this.circuits.createCollection,
      verifyCollection: this.circuits.verifyCollection,
      approveForMigration: this.circuits.approveForMigration,
      incrementSupply: this.circuits.incrementSupply,
      setPaused: this.circuits.setPaused,
      getCollection: this.circuits.getCollection
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('initialize', new __compactRuntime.ContractOperation());
    state_0.setOperation('createCollection', new __compactRuntime.ContractOperation());
    state_0.setOperation('verifyCollection', new __compactRuntime.ContractOperation());
    state_0.setOperation('approveForMigration', new __compactRuntime.ContractOperation());
    state_0.setOperation('incrementSupply', new __compactRuntime.ContractOperation());
    state_0.setOperation('setPaused', new __compactRuntime.ContractOperation());
    state_0.setOperation('getCollection', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(1n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue({ is_left: false, left: { bytes: new Uint8Array(32) }, right: { bytes: new Uint8Array(32) } }),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(2n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(false),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(3n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(0n),
                                                                                              alignment: _descriptor_9.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _initialize_0(context, partialProofData) {
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_13.toValue(2n),
                                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'collection: already initialized');
    const tmp_0 = this._left_0(this._ownPublicKey_0(context, partialProofData));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(1n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(2n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(true),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _createCollection_0(context,
                      partialProofData,
                      collectionId_0,
                      name_0,
                      symbol_0,
                      description_0,
                      metadataCID_0,
                      royaltyBps_0,
                      maxSupply_0)
  {
    const id_0 = collectionId_0;
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_13.toValue(0n),
                                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'collection: already exists');
    let t_0;
    __compactRuntime.assert((t_0 = royaltyBps_0, t_0 <= 1000n),
                            'collection: royalty too high');
    const creator_0 = this._left_0(this._ownPublicKey_0(context,
                                                        partialProofData));
    const data_0 = { name: name_0,
                     symbol: symbol_0,
                     description: description_0,
                     metadataCID: metadataCID_0,
                     creator: creator_0,
                     isVerified: false,
                     isApprovedForMigration: false,
                     royaltyBps: royaltyBps_0,
                     maxSupply: maxSupply_0,
                     currentSupply: 0n,
                     isPaused: false };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(0n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(data_0),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(3n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_8.toValue(tmp_0),
                                                                alignment: _descriptor_8.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _verifyCollection_0(context, partialProofData, collectionId_0) {
    const id_0 = collectionId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'collection: not found');
    const caller_0 = this._left_0(this._ownPublicKey_0(context, partialProofData));
    __compactRuntime.assert(this._equal_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_13.toValue(1n),
                                                                                                                                alignment: _descriptor_13.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          caller_0),
                            'collection: not admin');
    const existing_0 = _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 0 } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_13.toValue(0n),
                                                                                                              alignment: _descriptor_13.alignment() } }] } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_0.toValue(id_0),
                                                                                                              alignment: _descriptor_0.alignment() } }] } },
                                                                                   { popeq: { cached: false,
                                                                                              result: undefined } }]).value);
    const tmp_0 = { name: existing_0.name,
                    symbol: existing_0.symbol,
                    description: existing_0.description,
                    metadataCID: existing_0.metadataCID,
                    creator: existing_0.creator,
                    isVerified: true,
                    isApprovedForMigration: existing_0.isApprovedForMigration,
                    royaltyBps: existing_0.royaltyBps,
                    maxSupply: existing_0.maxSupply,
                    currentSupply: existing_0.currentSupply,
                    isPaused: existing_0.isPaused };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(0n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(tmp_0),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _approveForMigration_0(context, partialProofData, collectionId_0) {
    const id_0 = collectionId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'collection: not found');
    const caller_0 = this._left_0(this._ownPublicKey_0(context, partialProofData));
    __compactRuntime.assert(this._equal_1(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_13.toValue(1n),
                                                                                                                                alignment: _descriptor_13.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          caller_0),
                            'collection: not admin');
    const existing_0 = _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 0 } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_13.toValue(0n),
                                                                                                              alignment: _descriptor_13.alignment() } }] } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_0.toValue(id_0),
                                                                                                              alignment: _descriptor_0.alignment() } }] } },
                                                                                   { popeq: { cached: false,
                                                                                              result: undefined } }]).value);
    const tmp_0 = { name: existing_0.name,
                    symbol: existing_0.symbol,
                    description: existing_0.description,
                    metadataCID: existing_0.metadataCID,
                    creator: existing_0.creator,
                    isVerified: existing_0.isVerified,
                    isApprovedForMigration: true,
                    royaltyBps: existing_0.royaltyBps,
                    maxSupply: existing_0.maxSupply,
                    currentSupply: existing_0.currentSupply,
                    isPaused: existing_0.isPaused };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(0n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(tmp_0),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _incrementSupply_0(context, partialProofData, collectionId_0, amount_0) {
    const id_0 = collectionId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'collection: not found');
    const existing_0 = _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 0 } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_13.toValue(0n),
                                                                                                              alignment: _descriptor_13.alignment() } }] } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_0.toValue(id_0),
                                                                                                              alignment: _descriptor_0.alignment() } }] } },
                                                                                   { popeq: { cached: false,
                                                                                              result: undefined } }]).value);
    const newSupply_0 = ((t1) => {
                          if (t1 > 18446744073709551615n) {
                            throw new __compactRuntime.CompactError('collection.compact line 145 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                          }
                          return t1;
                        })(existing_0.currentSupply + amount_0);
    __compactRuntime.assert(this._equal_2(existing_0.maxSupply, 0n)
                            ||
                            newSupply_0 <= existing_0.maxSupply,
                            'collection: would exceed max supply');
    const tmp_0 = { name: existing_0.name,
                    symbol: existing_0.symbol,
                    description: existing_0.description,
                    metadataCID: existing_0.metadataCID,
                    creator: existing_0.creator,
                    isVerified: existing_0.isVerified,
                    isApprovedForMigration: existing_0.isApprovedForMigration,
                    royaltyBps: existing_0.royaltyBps,
                    maxSupply: existing_0.maxSupply,
                    currentSupply: newSupply_0,
                    isPaused: existing_0.isPaused };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(0n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(tmp_0),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _setPaused_0(context, partialProofData, collectionId_0, paused_0) {
    const id_0 = collectionId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'collection: not found');
    const existing_0 = _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                  partialProofData,
                                                                                  [
                                                                                   { dup: { n: 0 } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_13.toValue(0n),
                                                                                                              alignment: _descriptor_13.alignment() } }] } },
                                                                                   { idx: { cached: false,
                                                                                            pushPath: false,
                                                                                            path: [
                                                                                                   { tag: 'value',
                                                                                                     value: { value: _descriptor_0.toValue(id_0),
                                                                                                              alignment: _descriptor_0.alignment() } }] } },
                                                                                   { popeq: { cached: false,
                                                                                              result: undefined } }]).value);
    const caller_0 = this._left_0(this._ownPublicKey_0(context, partialProofData));
    __compactRuntime.assert(this._equal_3(existing_0.creator, caller_0)
                            ||
                            this._equal_4(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_13.toValue(1n),
                                                                                                                                alignment: _descriptor_13.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          caller_0),
                            'collection: not authorized');
    const tmp_0 = { name: existing_0.name,
                    symbol: existing_0.symbol,
                    description: existing_0.description,
                    metadataCID: existing_0.metadataCID,
                    creator: existing_0.creator,
                    isVerified: existing_0.isVerified,
                    isApprovedForMigration: existing_0.isApprovedForMigration,
                    royaltyBps: existing_0.royaltyBps,
                    maxSupply: existing_0.maxSupply,
                    currentSupply: existing_0.currentSupply,
                    isPaused: paused_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(0n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(tmp_0),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _getCollection_0(context, partialProofData, collectionId_0) {
    const id_0 = collectionId_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'collection: not found');
    return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                      partialProofData,
                                                                      [
                                                                       { dup: { n: 0 } },
                                                                       { idx: { cached: false,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_13.toValue(0n),
                                                                                                  alignment: _descriptor_13.alignment() } }] } },
                                                                       { idx: { cached: false,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_0.toValue(id_0),
                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                       { popeq: { cached: false,
                                                                                  result: undefined } }]).value);
  }
  _equal_0(x0, y0) {
    {
      let x1 = x0.is_left;
      let y1 = y0.is_left;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.left;
      let y1 = y0.left;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    {
      let x1 = x0.right;
      let y1 = y0.right;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    return true;
  }
  _equal_1(x0, y0) {
    {
      let x1 = x0.is_left;
      let y1 = y0.is_left;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.left;
      let y1 = y0.left;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    {
      let x1 = x0.right;
      let y1 = y0.right;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    {
      let x1 = x0.is_left;
      let y1 = y0.is_left;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.left;
      let y1 = y0.left;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    {
      let x1 = x0.right;
      let y1 = y0.right;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    return true;
  }
  _equal_4(x0, y0) {
    {
      let x1 = x0.is_left;
      let y1 = y0.is_left;
      if (x1 !== y1) { return false; }
    }
    {
      let x1 = x0.left;
      let y1 = y0.left;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    {
      let x1 = x0.right;
      let y1 = y0.right;
      {
        let x2 = x1.bytes;
        let y2 = y1.bytes;
        if (!x2.every((x, i) => y2[i] === x)) { return false; }
      }
    }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    collections: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_13.toValue(0n),
                                                                                                     alignment: _descriptor_13.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_9.toValue(0n),
                                                                                                                                 alignment: _descriptor_9.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_13.toValue(0n),
                                                                                                     alignment: _descriptor_13.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'collection.compact line 41 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_13.toValue(0n),
                                                                                                     alignment: _descriptor_13.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'collection.compact line 41 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_13.toValue(0n),
                                                                                                      alignment: _descriptor_13.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(key_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_10.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get admin() {
      return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(1n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get initialized() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(2n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get collectionCount() {
      return _descriptor_9.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(3n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
