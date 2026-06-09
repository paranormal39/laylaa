/// <reference types="vite/client" />

// Midnight Lace DApp Connector API injected on window.
interface MidnightConnector {
  enable: () => Promise<any>;
  isEnabled: () => Promise<boolean>;
  serviceUriConfig: () => Promise<{
    indexerUri: string;
    indexerWsUri: string;
    proverServerUri: string;
    substrateNodeUri: string;
  }>;
  apiVersion: string;
  name: string;
}

interface Window {
  midnight?: {
    mnLace?: MidnightConnector;
    [key: string]: MidnightConnector | undefined;
  };
}
