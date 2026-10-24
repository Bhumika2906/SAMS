import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';

export default function ManagementVerificationScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Verification Progress
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Campus-wide document verification metrics and counter throughput.
        </Text>
      </Surface>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Counter Throughput Summary
              </Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                Real-time document verification status
              </Text>
            </View>
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Read-Only
            </Chip>
          </View>
          <Text variant="bodySmall" style={styles.bodyText}>
            • Counter 1 (LH-101): Prof. Rajesh Sharma{'\n'}
            • Counter 2 (LH-102): Dr. Anita Verma{'\n\n'}
            Tracking candidate verification status: FullyVerified (1), VerificationPending (1), Awaiting payment (1).
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
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  bodyText: {
    color: '#334155',
    lineHeight: 22,
    marginTop: 8,
  },
});
