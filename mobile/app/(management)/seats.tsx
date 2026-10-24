import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

interface ProgrammeInfo {
  _id: string;
  code: string;
  name: string;
  baseCapacity: number;
  fee: number;
}

export default function ManagementSeatsScreen() {
  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSeats = async () => {
    try {
      const res = await apiClient.get('/management/overview');
      if (res.data?.success) {
        setProgrammes(res.data.data.programmes || []);
      }
    } catch {
      // Keep state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSeats();
    }, []),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSeats(); }} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Seat Statistics (Branch-wise)
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Read-only aggregate seat allocation data across academic programmes.
        </Text>
      </Surface>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        programmes.map((p) => (
          <Card key={p._id} style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Text variant="titleMedium" style={styles.progTitle}>
                    {p.code} - {p.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.progFee}>
                    Tuition Fee: ₹{p.fee?.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
                  Read-Only
                </Chip>
              </View>

              <View style={styles.statRow}>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Approved Base Capacity:
                </Text>
                <Text variant="bodyMedium" style={styles.statValue}>
                  {p.baseCapacity} Seats
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 160,
  },
  progTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  progFee: {
    color: '#64748B',
    marginTop: 2,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  chipText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    color: '#64748B',
  },
  statValue: {
    fontWeight: '700',
    color: '#0F2C59',
  },
});

