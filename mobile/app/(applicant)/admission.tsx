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
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAllotment = async () => {
    try {
      setLoadError(null);
      const res = await apiClient.get('/allotments/me/current');
      if (res.data?.success) {
        setAllotment(res.data.data.currentAllotment ?? res.data.data.allotment);
        setApplication(res.data.data.application);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Unable to load the current admission round.');
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
      const res = await apiClient.post(`/allotments/${allotment._id}/respond`, { response: decision });
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

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge" style={styles.banner}>{loadError}</Text>
        <Button mode="contained" onPress={fetchAllotment}>Retry</Button>
      </View>
    );
  }

  const isNotAllotted = allotment && allotment.result === 'NotAllotted';
  const isSeatAllotted = allotment && allotment.result === 'Allotted';

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
          System-assisted merit allotment results.
        </Text>
      </Surface>

      {message ? (
        <Text variant="bodyMedium" style={styles.banner}>
          {message}
        </Text>
      ) : null}

      {isNotAllotted ? (
        <Card style={styles.notAllottedCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Text variant="titleMedium" style={styles.allotmentCardTitle}>
                  {allotment.roundId?.name || 'Round 1 Allotment Result'}
                </Text>
                <Text variant="bodySmall" style={styles.meritText}>
                  Merit Rank: {allotment.allottedRank || application?.meritRank || 'N/A'}
                </Text>
              </View>
              <Chip
                mode="flat"
                style={styles.notAllottedChip}
                textStyle={styles.notAllottedChipText}
              >
                Not Allotted
              </Chip>
            </View>

            <Surface style={styles.notAllottedBox} elevation={0}>
              <Text variant="titleMedium" style={styles.notAllottedTitle}>
                No Seat Allotted in This Round
              </Text>
              <Text variant="bodyMedium" style={styles.notAllottedDesc}>
                Based on your merit rank (#{allotment.allottedRank || application?.meritRank || 'N/A'}) and preferred branches, all available seats were allotted to candidates with higher ranks.
              </Text>
              <Text variant="bodySmall" style={styles.notAllottedSub}>
                You do not need to accept or decline. Your application remains active and eligible for consideration in subsequent rounds if vacancies arise.
              </Text>
            </Surface>

            {application?.preferences && application.preferences.length > 0 ? (
              <View style={styles.prefSection}>
                <Divider style={styles.divider} />
                <Text variant="labelMedium" style={styles.prefSectionTitle}>
                  YOUR SUBMITTED PREFERENCES:
                </Text>
                {application.preferences.map((pref: any) => (
                  <View key={pref.programmeId?._id || pref.preferenceOrder} style={styles.prefRow}>
                    <Text variant="bodyMedium" style={styles.prefOrderText}>
                      Choice #{pref.preferenceOrder}:
                    </Text>
                    <Text variant="bodyMedium" style={styles.prefProgText}>
                      {pref.programmeId?.name || 'Programme'} ({pref.programmeId?.code || 'N/A'})
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card.Content>
        </Card>
      ) : isSeatAllotted ? (
        <Card style={styles.allotmentCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Text variant="titleMedium" style={styles.allotmentCardTitle}>
                  {allotment.roundId?.name || 'Round 1 Allotment Result'}
                </Text>
                <Text variant="bodySmall" style={styles.meritText}>
                  Merit Rank: {allotment.allottedRank || application?.meritRank || 'N/A'}
                </Text>
              </View>
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
            </View>

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
  notAllottedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#64748B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 160,
  },
  allotmentCardTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  meritText: {
    color: '#64748B',
    marginTop: 2,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  pendingChip: {
    backgroundColor: '#FFE5D9',
  },
  acceptedChip: {
    backgroundColor: '#ECFDF5',
  },
  notAllottedChip: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  notAllottedChipText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  statusChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
  notAllottedBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  notAllottedTitle: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 6,
  },
  notAllottedDesc: {
    color: '#475569',
    lineHeight: 22,
    marginBottom: 8,
  },
  notAllottedSub: {
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  prefSection: {
    marginTop: 16,
  },
  prefSectionTitle: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  prefOrderText: {
    color: '#0F2C59',
    fontWeight: '600',
    fontSize: 13,
  },
  prefProgText: {
    color: '#334155',
    fontSize: 13,
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
    flexWrap: 'wrap',
    gap: 8,
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
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    minWidth: 120,
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
