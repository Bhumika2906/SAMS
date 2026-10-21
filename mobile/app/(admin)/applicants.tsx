import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';

export default function AdminApplicantsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Applicants
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Browse registered candidates, check merit ranks, verify submissions, and review eligibility.
        </Text>
      </Surface>

      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Candidate Registry"
          subtitle="8 seeded applicants across Draft, Eligible, Allotted, Paid, Verified"
          right={() => (
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Ready for Round 1
            </Chip>
          )}
        />
        <Card.Content>
          <Text variant="bodySmall" style={styles.bodyText}>
            Interactive applicant search, filters (Category, Status, Rank range), and eligibility status toggle are wired to backend in Phase 2.
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
    backgroundColor: '#DDE6ED',
  },
  chipText: {
    color: '#0F2C59',
    fontWeight: '700',
    fontSize: 12,
  },
  bodyText: {
    color: '#475569',
    marginTop: 8,
  },
});
