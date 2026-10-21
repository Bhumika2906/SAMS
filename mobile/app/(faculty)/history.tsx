import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
        <Card.Title
          title="Past Verifications"
          subtitle="Audit trail with verifier ID and timestamps"
          right={() => (
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Audit Log
            </Chip>
          )}
        />
        <Card.Content>
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
  chip: {
    marginRight: 16,
    backgroundColor: '#F1F5F9',
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
