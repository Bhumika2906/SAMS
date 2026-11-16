import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function AdminRoundsScreen() {
  const [responseDeadline, setResponseDeadline] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const [withdrawalDeadline, setWithdrawalDeadline] = useState(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const [isFinal, setIsFinal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRounds = async () => {
    try {
      setError(null);
      const res = await apiClient.get('/rounds');
      if (res.data?.success) {
        setRounds(res.data.data.rounds || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rounds');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRounds();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRounds();
    setRefreshing(false);
  };

  const notify = (title: string, message: string) => {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // 1-Click Quick Start Round for Demo
  const handleQuickStartRound = async () => {
    setActionLoadingId('new_round');
    setError(null);
    setSuccessMsg(null);
    try {
      const now = Date.now();
      const nextNum = rounds.length + 1;
      const autoResp = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
      const autoWith = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();

      const res = await apiClient.post('/rounds', {
        name: `Round ${nextNum} - Regular Allotment`,
        responseDeadline: responseDeadline || autoResp,
        withdrawalDeadline: withdrawalDeadline || autoWith,
        isFinal,
      });

      const msg = res.data?.data?.message || `Round ${nextNum} started successfully!`;
      setSuccessMsg(msg);
      notify('Success', msg);
      await fetchRounds();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to start round';
      setError(msg);
      notify('Error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 1-Click Immediate End / Close Round for Demo
  const handleEndRoundNow = async (roundId: string, roundName: string) => {
    setActionLoadingId(`close_${roundId}`);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post(`/rounds/${roundId}/close`, { force: true });
      const msg = res.data?.data?.message || `${roundName} has been closed immediately for demo!`;
      setSuccessMsg(msg);
      notify('Round Closed', msg);
      await fetchRounds();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to close round';
      setError(msg);
      notify('Error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Run allotment for open round
  const handleRunAllotment = async (roundId: string) => {
    setActionLoadingId(`allot_${roundId}`);
    setError(null);
    try {
      const res = await apiClient.post(`/rounds/${roundId}/allot`);
      const msg = res.data?.data?.message || 'Proposed allotment calculated successfully.';
      setSuccessMsg(msg);
      notify('Allotment Complete', msg);
      await fetchRounds();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Allotment failed';
      setError(msg);
      notify('Error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Publish allotment for round
  const handlePublishAllotment = async (roundId: string) => {
    setActionLoadingId(`publish_${roundId}`);
    setError(null);
    try {
      const res = await apiClient.post(`/rounds/${roundId}/publish`);
      const msg = res.data?.data?.message || 'Round allotment published successfully!';
      setSuccessMsg(msg);
      notify('Published', msg);
      await fetchRounds();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Publish failed';
      setError(msg);
      notify('Error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Set preset deadlines
  const applyPresetDays = (days: number) => {
    const resp = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const withdr = new Date(Date.now() + (days + 7) * 24 * 60 * 60 * 1000).toISOString();
    setResponseDeadline(resp);
    setWithdrawalDeadline(withdr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published':
        return { bg: '#E0F2FE', text: '#0284C7' };
      case 'Closed':
        return { bg: '#F1F5F9', text: '#64748B' };
      case 'AllotmentRun':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'Open':
      default:
        return { bg: '#DCFCE7', text: '#16A34A' };
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header with Quick Start Round button */}
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={styles.title}>
              Admission Rounds
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Manage round lifecycles, automated seat allotments, and deadlines.
            </Text>
          </View>

          {/* Quick Demo Action Buttons */}
          <View style={styles.headerActions}>
            <Button
              mode="contained"
              buttonColor="#A01A1E"
              icon="play-circle"
              onPress={handleQuickStartRound}
              loading={actionLoadingId === 'new_round'}
              disabled={!!actionLoadingId}
              style={styles.actionBtn}
            >
              + Start Next Round (Demo)
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => setShowAdvanced(!showAdvanced)}
              style={styles.advancedToggleBtn}
            >
              {showAdvanced ? 'Hide Settings' : 'Settings'}
            </Button>
          </View>
        </View>

        {/* Status messages */}
        {successMsg && (
          <Surface style={styles.successBanner} elevation={0}>
            <Text style={styles.successText}>✓ {successMsg}</Text>
          </Surface>
        )}
        {error && (
          <HelperText type="error" visible style={styles.errorText}>
            {error}
          </HelperText>
        )}

        {/* Collapsible advanced deadline configuration */}
        {showAdvanced && (
          <View style={styles.advancedContainer}>
            <Divider style={{ marginVertical: 12 }} />
            <Text variant="titleSmall" style={{ color: '#A01A1E', fontWeight: '700', marginBottom: 8 }}>
              Optional Custom Deadlines (Auto-Generated by Default)
            </Text>

            <View style={styles.presetRow}>
              <Text variant="bodySmall" style={{ color: '#64748B', alignSelf: 'center' }}>
                Quick Presets:
              </Text>
              <Chip mode="outlined" compact onPress={() => applyPresetDays(1)} style={styles.presetChip}>
                +1 Day
              </Chip>
              <Chip mode="outlined" compact onPress={() => applyPresetDays(3)} style={styles.presetChip}>
                +3 Days
              </Chip>
              <Chip mode="outlined" compact onPress={() => applyPresetDays(7)} style={styles.presetChip}>
                +7 Days (Default)
              </Chip>
            </View>

            <TextInput
              label="Response/payment deadline (ISO timestamp)"
              value={responseDeadline}
              onChangeText={setResponseDeadline}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
            <TextInput
              label="Withdrawal deadline (ISO timestamp)"
              value={withdrawalDeadline}
              onChangeText={setWithdrawalDeadline}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: '#A01A1E' }}>
                  Final regular round
                </Text>
                <Text variant="bodySmall" style={{ color: '#64748B' }}>
                  Automatically freezes all valid paid Float holdings upon round closure.
                </Text>
              </View>
              <Switch value={isFinal} onValueChange={setIsFinal} color="#A01A1E" />
            </View>
          </View>
        )}
      </Surface>

      {/* Rounds list */}
      {rounds.length === 0 && !isLoading && (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              No Admission Rounds Active
            </Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Tap "+ Start Next Round (Demo)" above to initialize Round 1 with configured seat matrix.
            </Text>
          </Card.Content>
        </Card>
      )}

      {rounds.map((round) => {
        const statusColors = getStatusColor(round.status);
        const isPublished = round.status === 'Published';
        const isOpen = round.status === 'Open' || round.status === 'Draft';
        const isAllotmentRun = round.status === 'AllotmentRun';
        const isClosed = round.status === 'Closed';

        return (
          <Card key={round._id} style={styles.card} mode="elevated" elevation={2}>
            <Card.Content>
              {/* Card Header */}
              <View style={styles.roundCardHeader}>
                <View style={styles.roundTitleBox}>
                  <Text variant="titleLarge" style={styles.roundName}>
                    {round.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.roundSub}>
                    Round #{round.roundNumber} {round.isFinal ? '| Final Round' : ''}
                  </Text>
                </View>
                <Chip
                  mode="flat"
                  style={[styles.statusChip, { backgroundColor: statusColors.bg }]}
                  textStyle={[styles.statusChipText, { color: statusColors.text }]}
                >
                  {round.status}
                </Chip>
              </View>

              {/* Deadline details */}
              <View style={styles.deadlinesCard}>
                <View style={styles.deadlinesRow}>
                  <Text style={styles.deadlineLabel}>Response & Payment Deadline:</Text>
                  <Text style={styles.deadlineValue}>
                    {round.responseDeadline
                      ? new Date(round.responseDeadline).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Not configured'}
                  </Text>
                </View>
                <View style={styles.deadlinesRow}>
                  <Text style={styles.deadlineLabel}>Withdrawal Deadline:</Text>
                  <Text style={styles.deadlineValue}>
                    {round.withdrawalDeadline
                      ? new Date(round.withdrawalDeadline).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Not configured'}
                  </Text>
                </View>
              </View>

              {/* DEMO ACTION BUTTONS */}
              <View style={styles.cardActionsContainer}>
                {/* 1. If Open/Draft: Allow running allotment */}
                {isOpen && (
                  <Button
                    mode="contained"
                    buttonColor="#0284C7"
                    icon="calculator"
                    loading={actionLoadingId === `allot_${round._id}`}
                    disabled={!!actionLoadingId}
                    onPress={() => handleRunAllotment(round._id)}
                    style={styles.cardActionBtn}
                  >
                    1. Run Allotment
                  </Button>
                )}

                {/* 2. If Allotment calculated: Allow publishing */}
                {isAllotmentRun && (
                  <Button
                    mode="contained"
                    buttonColor="#16A34A"
                    icon="check-circle"
                    loading={actionLoadingId === `publish_${round._id}`}
                    disabled={!!actionLoadingId}
                    onPress={() => handlePublishAllotment(round._id)}
                    style={styles.cardActionBtn}
                  >
                    2. Publish Allotment
                  </Button>
                )}

                {/* 3. If Published: Allow immediate End / Close Round */}
                {isPublished && (
                  <View style={styles.publishedActions}>
                    <Button
                      mode="contained"
                      buttonColor="#DC2626"
                      icon="stop-circle"
                      loading={actionLoadingId === `close_${round._id}`}
                      disabled={!!actionLoadingId}
                      onPress={() => handleEndRoundNow(round._id, round.name)}
                      style={styles.cardActionBtn}
                    >
                      End / Close Round Now (Demo)
                    </Button>
                  </View>
                )}

                {/* 4. If Closed: Informational notice */}
                {isClosed && (
                  <Text style={styles.closedNote}>
                    ✓ Round concluded. Allotments finalized and expired seats reconciled.
                  </Text>
                )}
              </View>

              <Divider style={{ marginVertical: 12 }} />

              {/* Seat Matrix Breakdown */}
              <Text variant="labelMedium" style={styles.matrixHeader}>
                SEAT MATRIX ALLOCATION:
              </Text>
              <View style={styles.matrixContainer}>
                {round.seatMatrix?.map((sm: any, idx: number) => (
                  <View key={idx} style={styles.matrixRow}>
                    <Text style={styles.progName}>
                      {sm.programmeId?.code || 'Prog'}: {sm.programmeId?.name || 'Programme'}
                    </Text>
                    <View style={styles.matrixNumbers}>
                      <Text style={styles.progCap}>
                        Capacity: <Text style={styles.boldText}>{sm.capacity}</Text>
                      </Text>
                      <Text style={styles.progCap}>
                        Allotted: <Text style={styles.boldText}>{sm.allotted || 0}</Text>
                      </Text>
                      <Text style={styles.progCap}>
                        Vacant: <Text style={styles.boldText}>{Math.max(0, (sm.capacity || 0) - (sm.allotted || 0))}</Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        );
      })}
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
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 200,
  },
  title: {
    color: '#A01A1E',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    borderRadius: 8,
  },
  advancedToggleBtn: {
    borderRadius: 8,
    borderColor: '#CBD5E1',
  },
  advancedContainer: {
    marginTop: 8,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
  },
  roundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  roundTitleBox: {
    flex: 1,
    minWidth: 160,
  },
  roundName: {
    color: '#A01A1E',
    fontWeight: '800',
  },
  roundSub: {
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
  },
  statusChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
  deadlinesCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    gap: 6,
  },
  deadlinesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  deadlineLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  deadlineValue: {
    color: '#A01A1E',
    fontWeight: '600',
    fontSize: 13,
  },
  cardActionsContainer: {
    marginVertical: 4,
  },
  publishedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardActionBtn: {
    borderRadius: 8,
    marginVertical: 4,
  },
  closedNote: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  matrixHeader: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 8,
  },
  matrixContainer: {
    gap: 8,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  progName: {
    color: '#A01A1E',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
    minWidth: 180,
  },
  matrixNumbers: {
    flexDirection: 'row',
    gap: 12,
  },
  progCap: {
    color: '#64748B',
    fontSize: 12,
  },
  boldText: {
    color: '#A01A1E',
    fontWeight: '700',
  },
  cardTitle: {
    color: '#A01A1E',
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748B',
    marginTop: 4,
  },
});
