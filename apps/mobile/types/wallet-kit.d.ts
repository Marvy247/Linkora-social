declare module "@stellar/wallet-kit" {
  export class WalletKit {
    connect(): Promise<{ publicKey?: string; address?: string }>;
    disconnect(): Promise<void>;
    getPublicKey(): Promise<string>;
    isConnected(): Promise<boolean>;
  }

  export const NETWORK: {
    TESTNET: "TESTNET";
    MAINNET: "MAINNET";
  };
}
