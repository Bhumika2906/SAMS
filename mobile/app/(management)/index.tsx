import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

interface ManagementStats {
  totalApplicants: number;
  submittedCount: number;
  allottedCount: number;
  seatConfirmedCount: number;
  admissionConfirmedCount: number;
}

interface ProgrammeInfo {
  _id: string;
  code: string;
  name: string;
  baseCapacity: number;
  fee: number;
}

export default function ManagementOverviewScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<ManagementStats | null>(null);
  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await apiClient.get('/management/overview');
      if (res.data?.success) {
        setStats(res.data.data.stats);
        setProgrammes(res.data.data.programmes || []);
      }
    } catch {
      // Keep previous or fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOverview();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOverview();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              Executive Overview
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {user?.fullName} · Read-Only Access
            </Text>
          </View>
          <Chip mode="flat" style={styles.readOnlyChip} textStyle={styles.readOnlyChipText}>
            Strictly Read-Only
          </Chip>
        </View>
      </Surface>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Key Admission Metrics
      </Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.metricsGrid}>
          <Surface style={styles.metricCard} elevation={1}>
            <Text variant="displaySmall" style={[styles.metricValue, { color: theme.colors.primary }]}>
              {stats?.totalApplicants ?? 0}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Total Registered
            </Text>
          </Surface>

          <Surface style={styles.metricCard} elevation={1}>
            <Text variant="displaySmall" style={[styles.metricValue, { color: '#0284C7' }]}>
              {stats?.submittedCount ?? 0}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Applications Submitted
            </Text>
          </Surface>

          <Surface style={styles.metricCard} elevation={1}>
            <Text variant="displaySmall" style={[styles.metricValue, { color: '#D97706' }]}>
              {stats?.allottedCount ?? 0}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Seats Allotted
            </Text>
          </Surface>

          <Surface style={styles.metricCard} elevation={1}>
            <Text variant="displaySmall" style={[styles.metricValue, { color: '#16A34A' }]}>
              {stats?.admissionConfirmedCount ?? 0}
            </Text>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Admissions Confirmed
            </Text>
          </Surface>
        </View>
      )}

      <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 12 }]}>
        Academic Programmes Capacity
      </Text>

      {programmes.map((p) => (
        <Card key={p._id} style={styles.progCard} mode="outlined">
          <Card.Content>
            <View style={styles.progRow}>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: '700', color: '#0F2C59' }}>
                  {p.code} - {p.name}
                </Text>
                <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 2 }}>
                  Fee: ₹{p.fee?.toLocaleString('en-IN')}
                </Text>
              </View>
              <Chip style={{ backgroundColor: '#EEF2F6' }} textStyle={{ fontWeight: '700', color: '#0F2C59' }}>
                Cap: {p.baseCapacity}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(management)/seats')}>
        <Card.Title
          title="Branch-Wise Seat Distribution"
          subtitle="Detailed seat capacity, confirmed seats, and vacancies"
        />
        <Card.Actions>
          <Button mode="contained" buttonColor={theme.colors.primary}>
            View Detailed Seats
          </Button>
        </Card.Actions>
      </Card>
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  readOnlyChip: {
    backgroundColor: '#E2E8F0',
  },
  readOnlyChipText: {
    color: '#475569',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#0F2C59',
    fontWeight: '700',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  metricValue: {
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  progCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 10,
    borderColor: '#E2E8F0',
  },
  progRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
  },
});

