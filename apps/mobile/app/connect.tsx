import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { WalletButton } from "../components/WalletButton";
import { useWallet } from "../hooks/useWallet";
import type { WalletProviderKind } from "../context/WalletContext";

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export default function ConnectScreen() {
  const router = useRouter();
  const { address, connected, disconnect, connect, error, state, wallet } = useWallet();

  const handleConnect = async (provider: WalletProviderKind) => {
    await connect(provider);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Linkora Wallet</Text>
        <Text style={styles.title}>Connect your Stellar wallet</Text>
        <Text style={styles.subtitle}>
          Use Freighter in browser contexts or WalletConnect for mobile wallets.
        </Text>

        {connected && address ? (
          <View style={styles.connectedPanel}>
            <Text style={styles.panelLabel}>Connected address</Text>
            <Text style={styles.address}>{shortAddress(address)}</Text>
            <Text style={styles.provider}>
              {wallet.provider === "freighter" ? "Freighter" : "WalletConnect"}
            </Text>
            <WalletButton
              label="Continue"
              accessibilityLabel="Continue to feed"
              onPress={() => router.replace("/(tabs)/feed")}
              state={state}
              style={styles.action}
            />
            <WalletButton
              label="Disconnect"
              accessibilityLabel="Disconnect wallet"
              onPress={handleDisconnect}
              state={state}
              variant="danger"
            />
          </View>
        ) : (
          <View style={styles.buttonStack}>
            <WalletButton
              label="Connect Freighter"
              accessibilityLabel="Connect with Freighter wallet"
              onPress={() => handleConnect("freighter")}
              provider="freighter"
              state={state}
            />
            <WalletButton
              label="Connect WalletConnect"
              accessibilityLabel="Connect with WalletConnect wallet"
              onPress={() => handleConnect("walletconnect")}
              provider="walletconnect"
              state={state}
              variant="secondary"
            />
          </View>
        )}

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  eyebrow: {
    color: "#818cf8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonStack: {
    gap: 12,
  },
  connectedPanel: {
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  panelLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6,
  },
  address: {
    color: "#f8fafc",
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "700",
  },
  provider: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 16,
  },
  action: {
    marginBottom: 10,
  },
  errorBox: {
    backgroundColor: "#450a0a",
    borderColor: "#7f1d1d",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
  },
});
