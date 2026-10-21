import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, Chip, Surface, Text } from 'react-native-paper';

export default function AdminReportsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Reports & Analytics
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Track admission cycle metrics, seat fill rates, response conversions, and document verification progress.
        </Text>
      </Surface>

      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Seat Statistics Summary"
          subtitle="Real-time programme capacity tracking"
          right={() => (
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Live Matrix
            </Chip>
          )}
        />
        <Card.Content>
          <Text variant="bodySmall" style={styles.bodyText}>
            CSE: 3 Total (1 Allotted, 0 Confirmed) · CCE: 2 Total (1 Allotted, 1 Confirmed) · ECE: 2 Total (0 Allotted, 0 Confirmed).
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
