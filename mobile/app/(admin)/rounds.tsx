import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function AdminRoundsScreen() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchRounds = async () => {
    try {
      const res = await apiClient.get('/rounds');
      if (res.data?.success) {
        setRounds(res.data.data.rounds || []);
      }
    } catch {
      // Ignored
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

  const handleCreateRound = async () => {
    setIsCreating(true);
    try {
      // Fetch programmes first to get their ObjectIds
      const appRes = await apiClient.get('/management/overview');
      const progs = appRes.data?.data?.programmes || [];

      const matrix = progs.map((p: any) => ({
        programmeId: p._id,
        capacity: p.code === 'CSE' ? 2 : 1, // Limited seats for demo competition
        allotted: 0,
        confirmed: 0,
      }));

      const res = await apiClient.post('/rounds', {
        name: `Round ${rounds.length + 1} - Regular Allotment`,
        seatMatrix: matrix,
      });

      Alert.alert('Round Created', res.data.data.message || 'Admission round initialized successfully.');
      await fetchRounds();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create round');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={styles.title}>
              Admission Rounds
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Configure rounds and seat matrix capacities.
            </Text>
          </View>
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            onPress={handleCreateRound}
            loading={isCreating}
            disabled={isCreating}
            compact
            style={styles.newRoundBtn}
          >
            + New Round
          </Button>
        </View>
      </Surface>

      {rounds.length === 0 && !isLoading ? (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>No Rounds Created Yet</Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Tap the "+ New Round" button above to initialize Round 1 with configured seat matrix.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {rounds.map((round) => (
        <Card key={round._id} style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.roundCardHeader}>
              <View style={styles.roundTitleBox}>
                <Text variant="titleMedium" style={styles.roundName}>
                  {round.name}
                </Text>
                <Text variant="bodySmall" style={styles.roundSub}>
                  Round #{round.roundNumber}
                </Text>
              </View>
              <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
                {round.status}
              </Chip>
            </View>

            <Text variant="labelMedium" style={styles.matrixHeader}>
              SEAT MATRIX ALLOCATION:
            </Text>
            {round.seatMatrix?.map((sm: any, idx: number) => (
              <View key={idx} style={styles.matrixRow}>
                <Text style={styles.progName}>
                  {sm.programmeId?.code || 'Prog'}: {sm.programmeId?.name || 'Programme'}
                </Text>
                <Text style={styles.progCap}>
                  Capacity: <Text style={styles.boldText}>{sm.capacity}</Text> | Allotted:{' '}
                  <Text style={styles.boldText}>{sm.allotted || 0}</Text>
                </Text>
              </View>
            ))}
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
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
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
    minWidth: 160,
  },
  title: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  newRoundBtn: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
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
    color: '#0F2C59',
    fontWeight: '700',
  },
  roundSub: {
    color: '#64748B',
    marginTop: 2,
  },
  cardTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#DDE6ED',
    alignSelf: 'flex-start',
  },
  chipText: {
    color: '#0F2C59',
    fontWeight: '700',
    fontSize: 12,
  },
  matrixHeader: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  matrixRow: {
    flexDirection: 'column',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  progName: {
    color: '#0F2C59',
    fontWeight: '700',
    fontSize: 14,
  },
  progCap: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  boldText: {
    color: '#0F2C59',
    fontWeight: '700',
  },
});
