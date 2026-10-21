import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function ApplicantAdmissionScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allotment, setAllotment] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAllotment = async () => {
    try {
      const res = await apiClient.get('/allotments/me/current');
      if (res.data?.success) {
        setAllotment(res.data.data.allotment);
        setApplication(res.data.data.application);
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllotment();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllotment();
    setRefreshing(false);
  };

  const handleRespond = async (decision: 'Accepted' | 'Declined') => {
    const confirmed =
      typeof window !== 'undefined' && window.confirm
        ? window.confirm(
            decision === 'Accepted'
              ? 'Accept this seat offer? You will be directed to pay the admission fee and unlock your campus QR pass.'
              : 'Are you sure you want to decline this seat offer?',
          )
        : true;

    if (!confirmed) return;

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await apiClient.post('/allotments/me/respond', { response: decision });
      const msg = res.data?.data?.message || `Seat ${decision} successfully!`;
      setMessage(msg);
      await fetchAllotment();
      if (decision === 'Accepted') {
        router.push('/(applicant)/checklist');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to submit response';
      setMessage(errMsg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Error: ${errMsg}`);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge">Loading allotment results...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Admission Rounds & Seat Status
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          System-assisted merit allotment results. Respond before the window closes.
        </Text>
      </Surface>

      {message ? (
        <Text variant="bodyMedium" style={styles.banner}>
          {message}
        </Text>
      ) : null}

      {allotment ? (
        <Card style={styles.allotmentCard} mode="elevated">
          <Card.Title
            title="Round 1 Allotment Result"
            subtitle={`Merit Rank: ${allotment.allottedRank || application?.meritRank || 'N/A'}`}
            right={() => (
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  allotment.response === 'Accepted' ? styles.acceptedChip : styles.pendingChip,
                ]}
                textStyle={styles.statusChipText}
              >
                {allotment.response === 'Accepted' ? 'Seat Confirmed' : allotment.result}
              </Chip>
            )}
          />
          <Card.Content>
            <View style={styles.progBox}>
              <Text variant="labelMedium" style={styles.progLabel}>
                ALLOTTED PROGRAMME
              </Text>
              <Text variant="headlineSmall" style={styles.progTitle}>
                {allotment.programmeId?.name || 'Programme Allotted'} ({allotment.programmeId?.code || 'CSE'})
              </Text>
              <Text variant="bodyMedium" style={styles.feeText}>
                Tuition Deposit: ₹{(allotment.programmeId?.fee || 160000).toLocaleString('en-IN')}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.responseRow}>
              <Text variant="labelLarge" style={styles.responseLabel}>
                Candidate Response:
              </Text>
              <Text variant="bodyLarge" style={styles.responseValue}>
                {allotment.response}
              </Text>
            </View>

            {allotment.response === 'Pending' ? (
              <View style={styles.actionButtonGroup}>
                <Button
                  mode="contained"
                  buttonColor="#047857"
                  onPress={() => handleRespond('Accepted')}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.actionBtn}
                >
                  Accept Seat
                </Button>
                <Button
                  mode="outlined"
                  textColor="#DC2626"
                  onPress={() => handleRespond('Declined')}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={[styles.actionBtn, styles.declineBtn]}
                >
                  Decline
                </Button>
              </View>
            ) : null}

            {allotment.response === 'Accepted' ? (
              <Button
                mode="contained"
                buttonColor={theme.colors.primary}
                onPress={() => router.push('/(applicant)/checklist')}
                style={styles.payBtn}
              >
                Proceed to Pay Admission Fee →
              </Button>
            ) : null}
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Active Seat Allotment
            </Text>
            <Text variant="bodyMedium" style={styles.emptyDesc}>
              Either Round 1 has not been published by the administration yet, or your application is awaiting review. Pull to refresh to check for updates.
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  banner: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontWeight: '600',
  },
  allotmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  statusChip: {
    marginRight: 16,
  },
  pendingChip: {
    backgroundColor: '#FFE5D9',
  },
  acceptedChip: {
    backgroundColor: '#ECFDF5',
  },
  statusChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
  progBox: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0F2C59',
    marginTop: 8,
  },
  progLabel: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 1,
  },
  progTitle: {
    color: '#0F2C59',
    fontWeight: '800',
    marginTop: 4,
  },
  feeText: {
    color: '#C45C26',
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  responseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseLabel: {
    color: '#475569',
  },
  responseValue: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  declineBtn: {
    borderColor: '#DC2626',
  },
  payBtn: {
    marginTop: 20,
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  emptyDesc: {
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },
});
