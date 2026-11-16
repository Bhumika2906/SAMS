import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

interface ProgrammeInfo {
  _id: string;
  code: string;
  name: string;
  baseCapacity: number;
  fee: number;
  available?: number;
  floating?: number;
  frozen?: number;
  offered?: number;
  allotted?: number;
}

export default function ManagementSeatsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const badgeBasis = isMobile ? '48%' : '18%';

  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSeats = async () => {
    try {
      const res = await apiClient.get('/management/overview');
      if (res.data?.success) {
        setProgrammes(
          (res.data.data.programmes || []).map((p: any) => ({
            ...p,
            ...(res.data.data.inventory || []).find((s: any) => s.programmeId === p._id),
          })),
        );
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
        programmes.map((p) => {
          const baseCap = p.baseCapacity ?? 0;
          const vacant = p.available ?? 0;
          const floating = p.floating ?? 0;
          const frozen = p.frozen ?? 0;
          const pending = p.offered ?? 0;
          const occupied = (floating + frozen + pending);
          const pct = baseCap > 0 ? Math.min(100, Math.round((occupied / baseCap) * 100)) : 0;

          return (
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

                {/* Clean formatted seat metrics grid (Responsive for Mobile) */}
                <View style={styles.metricsContainer}>
                  <View style={[styles.statBadge, { flexBasis: badgeBasis, backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                    <Text style={[styles.statNum, { color: '#A01A1E' }]}>{baseCap}</Text>
                    <Text style={[styles.statTag, { color: '#475569' }]}>Total Capacity</Text>
                  </View>
                  <View style={[styles.statBadge, { flexBasis: badgeBasis, backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Text style={[styles.statNum, { color: '#047857' }]}>{vacant}</Text>
                    <Text style={[styles.statTag, { color: '#065F46' }]}>Vacant</Text>
                  </View>
                  <View style={[styles.statBadge, { flexBasis: badgeBasis, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <Text style={[styles.statNum, { color: '#1D4ED8' }]}>{frozen}</Text>
                    <Text style={[styles.statTag, { color: '#1E40AF' }]}>Frozen</Text>
                  </View>
                  <View style={[styles.statBadge, { flexBasis: badgeBasis, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <Text style={[styles.statNum, { color: '#B45309' }]}>{floating}</Text>
                    <Text style={[styles.statTag, { color: '#92400E' }]}>Float</Text>
                  </View>
                  <View style={[styles.statBadge, { flexBasis: isMobile ? '100%' : badgeBasis, backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                    <Text style={[styles.statNum, { color: '#7E22CE' }]}>{pending}</Text>
                    <Text style={[styles.statTag, { color: '#6B21A8' }]}>Pending Decision</Text>
                  </View>
                </View>

                {/* Occupancy progress summary */}
                <View style={styles.occupancyContainer}>
                  <View style={styles.occupancyBarBackground}>
                    <View style={[styles.occupancyBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text variant="bodySmall" style={styles.occupancyText}>
                    {occupied} of {baseCap} seats allocated ({pct}% filled)
                  </Text>
                </View>
              </Card.Content>
            </Card>
          );
        })
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
    color: '#A01A1E',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    marginBottom: 14,
    borderRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 160,
  },
  progTitle: {
    color: '#A01A1E',
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
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statBadge: {
    flexGrow: 1,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  occupancyContainer: {
    marginTop: 4,
  },
  occupancyBarBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    backgroundColor: '#A01A1E',
    borderRadius: 3,
  },
  occupancyText: {
    color: '#64748B',
    marginTop: 6,
    fontSize: 12,
  },
});
