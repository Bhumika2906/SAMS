import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';

export default function FacultyChecklistScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Document Checklist Verification
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Verify physical originals item by item. Scanning alone does not verify anything.
        </Text>
      </Surface>

      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Active Candidate Checklist"
          subtitle="No candidate scanned yet"
          right={() => (
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Awaiting Scan
            </Chip>
          )}
        />
        <Card.Content>
          <Text variant="bodySmall" style={styles.bodyText}>
            When an applicant QR pass is validated, the full list of mandatory documents will appear here with Verified / NotVerified toggles.
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
