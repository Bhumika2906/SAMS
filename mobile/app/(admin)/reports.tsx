import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Seat Statistics Summary
              </Text>
              <Text variant="bodySmall" style={styles.cardSubtitle}>
                Real-time programme capacity tracking
              </Text>
            </View>
            <Chip mode="flat" style={styles.chip} textStyle={styles.chipText}>
              Live Matrix
            </Chip>
          </View>
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
