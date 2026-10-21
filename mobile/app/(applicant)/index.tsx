import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function ApplicantHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tracker, setTracker] = useState<{
    currentStage: string;
    nextAction: string;
    stages: Array<{ key: string; label: string }>;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTracker = async () => {
    try {
      const res = await apiClient.get('/applications/me/tracker');
      if (res.data?.success) {
        setTracker(res.data.data);
      }
    } catch {
      // Use fallback defaults if not loaded yet
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTracker();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTracker();
    setRefreshing(false);
  };

  const currentStage = tracker?.currentStage || 'Registered';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Card */}
      <Surface style={styles.welcomeCard} elevation={2}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeText}>
            <Text variant="headlineSmall" style={styles.userName}>
              Welcome, {user?.fullName || 'Applicant'}!
            </Text>
            <Text variant="bodySmall" style={styles.userEmail}>
              {user?.email}
            </Text>
          </View>
          <Chip mode="flat" style={styles.stageChip} textStyle={styles.stageChipText}>
            Stage: {currentStage}
          </Chip>
        </View>

        {tracker?.nextAction ? (
          <Surface style={styles.nextActionBox} elevation={0}>
            <Text variant="labelMedium" style={styles.nextActionLabel}>
              NEXT REQUIRED ACTION:
            </Text>
            <Text variant="bodyMedium" style={styles.nextActionText}>
              {tracker.nextAction}
            </Text>
          </Surface>
        ) : null}
      </Surface>

      {/* Dynamic Main Action Button */}
      {currentStage === 'Registered' || currentStage === 'ApplicationInProgress' ? (
        <Card style={styles.highlightCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.highlightTitle}>
              Fill Admission Application
            </Text>
            <Text variant="bodySmall" style={styles.highlightDesc}>
              Submit personal details, marks, and branch preferences to participate in rounds.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              buttonColor={theme.colors.secondary}
              onPress={() => router.push('/(applicant)/application')}
            >
              Start Application Form
            </Button>
          </Card.Actions>
        </Card>
      ) : null}

      {currentStage === 'InRound' ? (
        <Card style={styles.highlightCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.highlightTitle}>
              Seat Allotment Published!
            </Text>
            <Text variant="bodySmall" style={styles.highlightDesc}>
              You have an active allotment. Tap to review your seat and respond with Accept or Decline.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              buttonColor={theme.colors.secondary}
              onPress={() => router.push('/(applicant)/admission')}
            >
              Respond to Seat
            </Button>
          </Card.Actions>
        </Card>
      ) : null}

      {currentStage === 'SeatConfirmed' ? (
        <Card style={styles.highlightCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.highlightTitle}>
              Seat Confirmed — Pay Admission Fee
            </Text>
            <Text variant="bodySmall" style={styles.highlightDesc}>
              Pay the admission tuition deposit to unlock your campus QR Gate Pass and Checklist.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              onPress={() => router.push('/(applicant)/checklist')}
            >
              Proceed to Payment
            </Button>
          </Card.Actions>
        </Card>
      ) : null}

      {currentStage === 'PaymentCompleted' || currentStage === 'VerificationPending' ? (
        <Card style={styles.highlightCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.highlightTitle}>
              QR Gate Pass & Verification Checklist
            </Text>
            <Text variant="bodySmall" style={styles.highlightDesc}>
              Your campus visit pass is ready. Bring original certificates for verification.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              onPress={() => router.push('/(applicant)/checklist')}
            >
              View Pass & Checklist
            </Button>
          </Card.Actions>
        </Card>
      ) : null}

      {currentStage === 'AdmissionConfirmed' ? (
        <Surface style={styles.congratsCard} elevation={2}>
          <Text variant="titleLarge" style={styles.congratsTitle}>
            🎉 Admission Confirmed!
          </Text>
          <Text variant="bodyMedium" style={styles.congratsDesc}>
            Congratulations! Your documents have been physically verified. You are officially enrolled at LNMIIT Jaipur.
          </Text>
        </Surface>
      ) : null}

      {/* Navigation Quick Cards */}
      <Text variant="titleMedium" style={styles.sectionHeader}>
        Navigation
      </Text>

      <Card style={styles.actionCard} mode="outlined" onPress={() => router.push('/(applicant)/application')}>
        <Card.Title title="Application Form" subtitle="View or edit your admission application" />
      </Card>

      <Card style={styles.actionCard} mode="outlined" onPress={() => router.push('/(applicant)/admission')}>
        <Card.Title title="Rounds & Seat Allotment" subtitle="Check round results and branch allotment" />
      </Card>

      <Card style={styles.actionCard} mode="outlined" onPress={() => router.push('/(applicant)/checklist')}>
        <Card.Title title="Fee Payment, Gate Pass & Checklist" subtitle="Simulated payment, QR pass, verification" />
      </Card>

      <Card style={styles.actionCard} mode="outlined" onPress={() => router.push('/(applicant)/profile')}>
        <Card.Title title="Candidate Profile" subtitle="Account details and sign out" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  welcomeRow: {
    flexDirection: 'column',
    gap: 8,
  },
  welcomeText: {
    marginBottom: 4,
  },
  userName: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  userEmail: {
    color: '#64748B',
  },
  stageChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5D9',
  },
  stageChipText: {
    color: '#C45C26',
    fontWeight: '700',
  },
  nextActionBox: {
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0F2C59',
  },
  nextActionLabel: {
    color: '#0F2C59',
    fontWeight: '700',
    fontSize: 11,
  },
  nextActionText: {
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F86F03',
  },
  highlightTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  highlightDesc: {
    color: '#64748B',
    marginTop: 4,
  },
  congratsCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#047857',
  },
  congratsTitle: {
    color: '#047857',
    fontWeight: '800',
  },
  congratsDesc: {
    color: '#065F46',
    marginTop: 4,
  },
  sectionHeader: {
    color: '#0F2C59',
    fontWeight: '700',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    borderColor: '#E2E8F0',
  },
});
