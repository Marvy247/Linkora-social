import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Linking } from "react-native";
import {
  setWalletAddress,
  getWalletAddress,
  deleteWalletAddress,
  setConnectionState,
  getConnectionState,
  deleteConnectionState,
} from "../utils/secureStorage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WalletState = "loading" | "disconnected" | "connecting" | "connected" | "error";

export type WalletProviderKind = "freighter" | "walletconnect";

export interface WalletInfo {
  address: string | null;
  network: string | null;
  provider: WalletProviderKind | null;
}

interface StoredConnectionState {
  connected: boolean;
  address: string;
  timestamp: number;
}

interface WalletConnectLike {
  connect: () => Promise<{ publicKey?: string; address?: string }>;
  disconnect: () => Promise<void>;
  getPublicKey?: () => Promise<string>;
  isConnected?: () => Promise<boolean>;
}

async function createWalletConnectAdapter(): Promise<WalletConnectLike> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const projectId = env?.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID;

  const { default: SignClient } = await import("@walletconnect/sign-client");
  let client: Awaited<ReturnType<typeof SignClient.init>> | null = null;
  let topic: string | null = null;
  let currentAddress: string | null = null;

  return {
    async connect() {
      if (!projectId) {
        throw new Error("WalletConnect project id not configured");
      }

      client =
        client ??
        (await SignClient.init({
          projectId,
          metadata: {
            name: "Linkora",
            description: "Linkora SocialFi mobile app",
            url: "https://github.com/Epta-Node/Linkora-social",
            icons: [],
          },
        }));

      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          stellar: {
            methods: ["stellar_signXDR"],
            chains: ["stellar:testnet"],
            events: ["accountsChanged"],
          },
        },
      });

      if (uri) {
        await Linking.openURL(uri);
      }

      const session = await approval();
      topic = session.topic;
      const account = session.namespaces.stellar?.accounts?.[0];
      currentAddress = account?.split(":").pop() ?? null;

      if (!currentAddress) {
        throw new Error("No Stellar account returned from WalletConnect");
      }

      return { publicKey: currentAddress };
    },
    async disconnect() {
      if (client && topic) {
        await client.disconnect({
          topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      }
      topic = null;
      currentAddress = null;
    },
    async getPublicKey() {
      if (!currentAddress) {
        throw new Error("WalletConnect is not connected");
      }
      return currentAddress;
    },
    async isConnected() {
      return Boolean(currentAddress);
    },
  };
}

declare global {
  // Test/runtime escape hatch for environments where the optional wallet kit
  // package is intentionally not installed.
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __LINKORA_WALLET_KIT__: any | undefined;
}

export interface WalletContextType {
  /** Current connection state machine value */
  state: WalletState;
  /** Wallet address and network info */
  wallet: WalletInfo;
  /** Last error message, if any */
  error: string | null;
  /** Initiate wallet connection */
  connect: (provider?: WalletProviderKind) => Promise<void>;
  /** Disconnect and clear persisted state */
  disconnect: () => Promise<void>;
  /** Re-check connection state (e.g. after app foreground) */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps): JSX.Element {
  const [state, setState] = useState<WalletState>("loading");
  const [wallet, setWallet] = useState<WalletInfo>({
    address: null,
    network: null,
    provider: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Lazy-loaded WalletConnect-compatible wallet kit instance
  const [walletKit, setWalletKit] = useState<WalletConnectLike | null>(
    () => globalThis.__LINKORA_WALLET_KIT__ ?? null
  );

  // Initialize the WalletConnect adapter on mount.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        if (globalThis.__LINKORA_WALLET_KIT__) {
          setWalletKit(globalThis.__LINKORA_WALLET_KIT__);
          return;
        }

        if (!cancelled) {
          setWalletKit(await createWalletConnectAdapter());
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setError("Wallet kit not available");
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const importFreighterApi = useCallback(async () => {
    const loader = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<Record<string, unknown>>;
    return loader("@stellar/freighter-api");
  }, []);

  const requestFreighterAddress = useCallback(async (): Promise<string> => {
    const freighter = await importFreighterApi();

    const available =
      typeof freighter.isConnected === "function" ? await freighter.isConnected() : true;

    if (!available) {
      throw new Error("Freighter is not available");
    }

    if (typeof freighter.requestAccess === "function") {
      const result = await freighter.requestAccess();
      if (typeof result === "string") return result;
      if (
        result &&
        typeof result === "object" &&
        "address" in result &&
        typeof result.address === "string"
      ) {
        return result.address;
      }
    }

    if (typeof freighter.getPublicKey === "function") {
      const publicKey = await freighter.getPublicKey();
      if (typeof publicKey === "string") return publicKey;
    }

    if (typeof freighter.getAddress === "function") {
      const result = await freighter.getAddress();
      if (typeof result === "string") return result;
      if (
        result &&
        typeof result === "object" &&
        "address" in result &&
        typeof result.address === "string"
      ) {
        return result.address;
      }
    }

    throw new Error("No address returned from Freighter");
  }, [importFreighterApi]);

  // Check persisted connection state once wallet kit is ready
  const checkConnectionState = useCallback(async () => {
    if (!walletKit) return;

    try {
      setState("loading");
      setError(null);

      const storedAddress = await getWalletAddress();
      const storedConn = await getConnectionState();

      if (storedAddress && storedConn) {
        const isConnected: boolean = await walletKit.isConnected();

        if (isConnected) {
          const currentAddress: string = await walletKit.getPublicKey();

          if (currentAddress === storedAddress) {
            setWallet({
              address: currentAddress,
              network: "TESTNET",
              provider: "walletconnect",
            });
            setState("connected");
            return;
          }
        }

        // Stale — clear storage
        await Promise.all([deleteWalletAddress(), deleteConnectionState()]);
      }

      setState("disconnected");
      setWallet({ address: null, network: null, provider: null });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [walletKit]);

  useEffect(() => {
    if (walletKit) {
      checkConnectionState();
    }
  }, [walletKit, checkConnectionState]);

  // Connect
  const connect = useCallback(
    async (provider: WalletProviderKind = "walletconnect") => {
      try {
        setState("connecting");
        setError(null);

        let address: string | null = null;

        if (provider === "freighter") {
          address = await requestFreighterAddress();
        } else {
          if (!walletKit) {
            throw new Error("WalletConnect is not available");
          }

          const result: { publicKey?: string; address?: string } = await walletKit.connect();
          address = result.publicKey ?? result.address ?? null;

          if (typeof walletKit.getPublicKey === "function") {
            address = await walletKit.getPublicKey();
          }
        }

        if (!address) {
          throw new Error("No address returned from wallet");
        }

        const connState: StoredConnectionState = {
          connected: true,
          address,
          timestamp: Date.now(),
        };

        await Promise.all([setWalletAddress(address), setConnectionState(connState)]);

        setWallet({ address, network: "TESTNET", provider });
        setState("connected");
      } catch (err) {
        setState("error");
        setError(err instanceof Error ? err.message : "Connection failed");
        setWallet({ address: null, network: null, provider: null });
      }
    },
    [requestFreighterAddress, walletKit]
  );

  // Disconnect
  const disconnect = useCallback(async () => {
    try {
      setError(null);
      if (walletKit) {
        await walletKit.disconnect();
      }
    } catch {
      // Ignore disconnect errors — always clear local state
    } finally {
      await Promise.all([deleteWalletAddress(), deleteConnectionState()]);
      setWallet({ address: null, network: null, provider: null });
      setState("disconnected");
    }
  }, [walletKit]);

  const refresh = useCallback(async () => {
    await checkConnectionState();
  }, [checkConnectionState]);

  const value: WalletContextType = {
    state,
    wallet,
    error,
    connect,
    disconnect,
    refresh,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns wallet state and actions.
 * Must be used inside <WalletProvider>.
 */
export function useWalletContext(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return ctx;
}

export { WalletContext };
