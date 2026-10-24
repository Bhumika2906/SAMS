import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';

export default function FacultyHistoryScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Verification History
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          List of candidates whose documents have been verified at your assigned counter.
        </Text>
      </Surface>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Past Verifications
              </Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                Audit trail with verifier ID and timestamps
              </Text>
            </View>
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Audit Log
            </Chip>
          </View>
          <Text variant="bodySmall" style={styles.bodyText}>
            Every verification action records the verifier ID and timestamp into the AuditLog on the server.
          </Text>
        </Card.Content>
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
  cardTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  chipText: {
    color: '#64748B',
    fontSize: 12,
  },
  bodyText: {
    color: '#475569',
    marginTop: 8,
  },
});
