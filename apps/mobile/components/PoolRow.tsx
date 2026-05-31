import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface PoolSearchResult {
  id: string;
  name: string;
  description: string;
  token: string;
  balance: string;
  members: number;
}

interface PoolRowProps {
  pool: PoolSearchResult;
  onPress: (pool: PoolSearchResult) => void;
}

export function PoolRow({ pool, onPress }: PoolRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(pool)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${pool.name} pool`}
      testID={`pool-result-${pool.id}`}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>#</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>{pool.name}</Text>
          <Text style={styles.balance}>{pool.balance}</Text>
        </View>
        <Text style={styles.subtitle}>{pool.description}</Text>
        <Text style={styles.meta}>
          {pool.members} members - {pool.token}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  content: {
    flex: 1,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  balance: {
    color: "#a7f3d0",
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 4,
  },
});
