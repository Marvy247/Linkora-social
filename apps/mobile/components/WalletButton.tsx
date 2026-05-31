import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";

import type { WalletProviderKind, WalletState } from "../context/WalletContext";

interface WalletButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => Promise<void> | void;
  state?: WalletState;
  provider?: WalletProviderKind;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: ViewStyle;
}

export function WalletButton({
  label,
  accessibilityLabel,
  onPress,
  state = "disconnected",
  provider,
  variant = "primary",
  disabled = false,
  style,
}: WalletButtonProps) {
  const isConnecting = state === "connecting";

  return (
    <TouchableOpacity
      style={[styles.button, styles[variant], (disabled || isConnecting) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || isConnecting}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={provider ? `wallet-button-${provider}` : "wallet-button"}
    >
      {isConnecting ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#6366f1",
  },
  secondary: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  danger: {
    backgroundColor: "#dc2626",
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryLabel: {
    color: "#e2e8f0",
  },
});
