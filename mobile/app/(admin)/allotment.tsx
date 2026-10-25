import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function AdminAllotmentScreen() {
  const [activeRound, setActiveRound] = useState<any>(null);
  const [allotments, setAllotments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoadError(null);
      const res = await apiClient.get('/rounds');
      if (res.data?.success && res.data.data.rounds?.length > 0) {
        const rList = res.data.data.rounds;
        const selected = rList[0];
        setActiveRound(selected);

        // Fetch allotments for this round
        const altRes = await apiClient.get(`/rounds/${selected._id}/allotments`);
        if (altRes.data?.success) {
          setAllotments(altRes.data.data.allotments || []);
        }
      }
    } catch (err: any) {
      setLoadError(err.message || 'Unable to load allotment data.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRunAllotment = async () => {
    if (!activeRound) return;
    setIsRunning(true);
    setBannerMessage(null);
    try {
      const res = await apiClient.post(`/rounds/${activeRound._id}/allot`);
      const msg = res.data.data.message || 'Proposed results calculated successfully.';
      setBannerMessage({ type: 'success', text: msg });
      if (typeof window !== 'undefined' && window.alert) window.alert(`Allotment Complete: ${msg}`);
      else Alert.alert('Allotment Complete', msg);
      await loadData();
    } catch (err: any) {
      const msg = err.message || 'Allotment run failed';
      setBannerMessage({ type: 'error', text: msg });
      if (typeof window !== 'undefined' && window.alert) window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePublishAllotment = async () => {
    if (!activeRound) return;
    setIsPublishing(true);
    setBannerMessage(null);
    try {
      const res = await apiClient.post(`/rounds/${activeRound._id}/publish`);
      const msg = res.data.data.message || 'Allotment published to candidate dashboards.';
      setBannerMessage({ type: 'success', text: msg });
      if (typeof window !== 'undefined' && window.alert) window.alert(`Published: ${msg}`);
      else Alert.alert('Published', msg);
      await loadData();
    } catch (err: any) {
      const msg = err.message || 'Publish failed';
      setBannerMessage({ type: 'error', text: msg });
      if (typeof window !== 'undefined' && window.alert) window.alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          System-Assisted Allotment
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Deterministic rank-based allocation algorithm honoring branch preferences and capacities.
        </Text>
      </Surface>

      {bannerMessage ? (
        <Surface
          style={[
            styles.bannerBox,
            bannerMessage.type === 'success' ? styles.bannerSuccess : styles.bannerError,
          ]}
          elevation={2}
        >
          <Text
            variant="bodyMedium"
            style={[
              styles.bannerText,
              bannerMessage.type === 'success' ? styles.bannerTextSuccess : styles.bannerTextError,
            ]}
          >
            {bannerMessage.type === 'success' ? '✅ ' : '⚠️ '}
            {bannerMessage.text}
          </Text>
        </Surface>
      ) : null}
      {loadError ? (
        <Surface style={[styles.bannerBox, styles.bannerError]} elevation={2}>
          <Text style={styles.bannerTextError}>{loadError}</Text>
          <Button onPress={loadData}>Retry</Button>
        </Surface>
      ) : null}

      {activeRound ? (
        <Card style={styles.controlCard} mode="elevated">
          <Card.Content>
            <View style={styles.controlHeaderRow}>
              <View style={styles.controlHeaderLeft}>
                <Text variant="titleMedium" style={styles.controlTitle}>
                  {activeRound.name}
                </Text>
                <Text variant="bodySmall" style={styles.controlSub}>
                  Status: {activeRound.status}
                </Text>
              </View>
              <Chip mode="flat" style={styles.roundChip} textStyle={styles.roundChipText}>
                {activeRound.status}
              </Chip>
            </View>
            <View style={styles.actionBtnRow}>
              <Button
                mode="contained"
                buttonColor={theme.colors.primary}
                onPress={handleRunAllotment}
                loading={isRunning}
                disabled={isRunning || isPublishing}
                style={styles.actionBtn}
              >
                1. Run Allotment
              </Button>
              <Button
                mode="contained"
                buttonColor={theme.colors.secondary}
                onPress={handlePublishAllotment}
                loading={isPublishing}
                disabled={isRunning || isPublishing}
                style={styles.actionBtn}
              >
                2. Publish Results
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      <Text variant="titleMedium" style={styles.sectionHeader}>
        Allotment Records ({allotments.length})
      </Text>

      {allotments.length === 0 && !isLoading ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No allotments computed yet for this round. Tap "1. Run Allotment" to evaluate eligible candidates.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {allotments.map((alt) => (
        <Card key={alt._id} style={styles.itemCard} mode="outlined">
          <Card.Content>
            <View style={styles.row}>
              <View style={styles.leftCol}>
                <Text variant="titleMedium" style={styles.candidateName}>
                  {alt.applicationId?.userId?.fullName || 'Candidate'}
                </Text>
                <Text variant="bodySmall" style={styles.emailText}>
                  {alt.applicationId?.userId?.email} · Merit Rank: <Text style={styles.boldText}>{alt.allottedRank || 'N/A'}</Text>
                </Text>
                <Text variant="bodyMedium" style={styles.progText}>
                  Programme: <Text style={styles.progHighlight}>{alt.programmeId?.name ? `${alt.programmeId.name} (${alt.programmeId.code})` : 'Not Allotted'}</Text>
                </Text>
              </View>
              <View style={styles.rightCol}>
                <Chip
                  mode="flat"
                  style={alt.result === 'Allotted' ? styles.allottedChip : styles.notAllottedChip}
                  textStyle={alt.result === 'Allotted' ? styles.allottedText : styles.notAllottedText}
                >
                  {alt.result}
                </Chip>
                <Chip mode="outlined" style={styles.pubChip} textStyle={styles.pubText}>
                  {alt.publication}
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    paddingBottom: 40,
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
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  controlHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  controlHeaderLeft: {
    flex: 1,
    minWidth: 160,
  },
  controlTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  controlSub: {
    color: '#64748B',
    marginTop: 2,
  },
  roundChip: {
    backgroundColor: '#DDE6ED',
    alignSelf: 'flex-start',
  },
  roundChipText: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  actionBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minWidth: 130,
    borderRadius: 8,
  },
  sectionHeader: {
    color: '#0F2C59',
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#64748B',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  leftCol: {
    flex: 1,
    minWidth: 160,
    marginRight: 6,
  },
  candidateName: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  emailText: {
    color: '#64748B',
    marginTop: 2,
  },
  progText: {
    color: '#334155',
    marginTop: 6,
  },
  progHighlight: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F2C59',
  },
  rightCol: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allottedChip: {
    backgroundColor: '#ECFDF5',
  },
  allottedText: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 11,
  },
  notAllottedChip: {
    backgroundColor: '#FEE2E2',
  },
  notAllottedText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 11,
  },
  pubChip: {
    borderColor: '#CBD5E1',
  },
  pubText: {
    color: '#64748B',
    fontSize: 10,
  },
  bannerBox: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  bannerSuccess: {
    backgroundColor: '#DEF7EC',
    borderColor: '#31C48D',
    borderWidth: 1,
  },
  bannerError: {
    backgroundColor: '#FDE8E8',
    borderColor: '#F98080',
    borderWidth: 1,
  },
  bannerText: {
    fontWeight: '600',
  },
  bannerTextSuccess: {
    color: '#03543F',
  },
  bannerTextError: {
    color: '#9B1C1C',
  },
});
