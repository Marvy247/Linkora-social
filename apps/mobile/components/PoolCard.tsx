import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface PoolCardProps {
  id: string;
  name: string;
  description: string;
  totalValue: string;
  participants: number;
  apy?: string;
  isLoading?: boolean;
  onPress?: () => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({
  id,
  name,
  description,
  totalValue,
  participants,
  apy,
  isLoading = false,
  onPress,
}) => {
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={[styles.loadingBar, styles.nameLoading]} />
        <View style={[styles.loadingBar, styles.descriptionLoading]} />
        <View style={styles.statsContainer}>
          <View style={[styles.loadingBar, styles.statLoading]} />
          <View style={[styles.loadingBar, styles.statLoading]} />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID={`pool-card-${id}`}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        {apy && <Text style={styles.apy}>{apy} APY</Text>}
      </View>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total Value</Text>
          <Text style={styles.statValue}>{totalValue}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Participants</Text>
          <Text style={styles.statValue}>{participants}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  loadingContainer: {
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  apy: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingBar: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
  },
  nameLoading: {
    height: 18,
    width: '60%',
  },
  descriptionLoading: {
    height: 14,
    width: '100%',
  },
  statLoading: {
    height: 16,
    width: '80%',
  },
});