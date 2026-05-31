import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity } from "react-native";

import { WalletProvider } from "../context/WalletContext";
import { useWallet } from "../hooks/useWallet";
import { parseDeepLink } from "../utils/deepLinks";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function HeaderWalletAddress() {
  const router = useRouter();
  const { address, connected } = useWallet();

  return (
    <TouchableOpacity
      style={styles.headerWallet}
      onPress={() => router.push("/connect" as Parameters<typeof router.push>[0])}
      accessibilityRole="button"
      accessibilityLabel={
        connected && address ? `Connected wallet ${address}` : "Open wallet connection screen"
      }
    >
      <Text style={styles.headerWalletText}>
        {connected && address ? shortAddress(address) : "Connect"}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Root layout — wraps the entire app in WalletProvider and sets up
 * the bottom tab navigator with deep-link handling.
 *
 * Screens:
 *   (tabs)/feed        — main post feed
 *   (tabs)/explore     — discovery / search
 *   (tabs)/pools       — community pools
 *   (tabs)/mini-apps   — mini app browser
 *   (tabs)/profile     — user profile
 *
 * Stack screens (detail views) are declared as modal/stack routes
 * alongside the tabs via the Tabs.Screen `href` opt-out pattern.
 */
export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function handleInitialUrl() {
      let initialUrl: string | null = null;
      try {
        initialUrl = await Linking.getInitialURL();
      } catch {
        return;
      }
      if (isMounted && initialUrl) {
        handleDeepLink(initialUrl);
      }
    }

    function handleDeepLink(url: string) {
      const deepLink = parseDeepLink(url);
      if (!deepLink) return;
      router.push(deepLink.path as Parameters<typeof router.push>[0]);
    }

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    handleInitialUrl();

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);

  return (
    <WalletProvider>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#0f172a",
          },
          headerTitleStyle: {
            color: "#f8fafc",
            fontWeight: "700",
          },
          headerTintColor: "#f8fafc",
          headerRight: () => <HeaderWalletAddress />,
          tabBarActiveTintColor: "#6366f1",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#0f172a",
            borderTopColor: "#1e293b",
          },
        }}
      >
        <Tabs.Screen name="(tabs)/feed" options={{ title: "Feed", tabBarLabel: "Feed" }} />
        <Tabs.Screen name="(tabs)/explore" options={{ title: "Explore", tabBarLabel: "Explore" }} />
        <Tabs.Screen name="(tabs)/pools" options={{ title: "Pools", tabBarLabel: "Pools" }} />
        <Tabs.Screen
          name="(tabs)/mini-apps"
          options={{ title: "Mini Apps", tabBarLabel: "Mini Apps" }}
        />
        <Tabs.Screen name="(tabs)/profile" options={{ title: "Profile", tabBarLabel: "Profile" }} />
        <Tabs.Screen name="connect" options={{ href: null, title: "Connect Wallet" }} />
        {/* Detail screens — hidden from tab bar */}
        <Tabs.Screen name="post/[id]" options={{ href: null, headerShown: true, title: "Post" }} />
        <Tabs.Screen
          name="profile/[address]"
          options={{ href: null, headerShown: true, title: "Profile" }}
        />
        <Tabs.Screen name="pool/[id]" options={{ href: null, headerShown: true, title: "Pool" }} />
      </Tabs>
    </WalletProvider>
  );
}

const styles = StyleSheet.create({
  headerWallet: {
    minHeight: 32,
    minWidth: 82,
    borderRadius: 16,
    marginRight: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  headerWalletText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
});
