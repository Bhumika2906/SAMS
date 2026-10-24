import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Candidate Registry
              </Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                8 seeded applicants across Draft, Eligible, Allotted, Paid, Verified
              </Text>
            </View>
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Ready for Round 1
            </Chip>
          </View>
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
    backgroundColor: '#DDE6ED',
    alignSelf: 'flex-start',
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
