import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function AdminOverviewScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              Administrator Overview
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Signed in as {user?.fullName} ({user?.email})
            </Text>
          </View>
          <Chip mode="flat" style={styles.roleChip} textStyle={styles.roleChipText}>
            SuperAdmin
          </Chip>
        </View>
      </Surface>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Management Quick Actions
      </Text>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(admin)/applicants')}>
        <Card.Title
          title="Applicants Management"
          subtitle="Search, filter, inspect eligibility and review submissions"
        />
        <Card.Actions>
          <Button mode="contained" buttonColor={theme.colors.primary}>
            View Applicants
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(admin)/rounds')}>
        <Card.Title
          title="Admission Rounds & Seat Matrix"
          subtitle="Configure rounds, programme seat capacities (CSE, CCE, ECE)"
        />
        <Card.Actions>
          <Button mode="outlined" textColor={theme.colors.primary}>
            Manage Rounds
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(admin)/allotment')}>
        <Card.Title
          title="System-Assisted Allotment"
          subtitle="Run deterministic seat allotment, review proposed results, publish"
        />
        <Card.Actions>
          <Button mode="outlined" textColor={theme.colors.secondary}>
            Run Allotment
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(admin)/reports')}>
        <Card.Title
          title="Reports & Analytics"
          subtitle="Seat occupancy, response rates, and document verification progress"
        />
        <Card.Actions>
          <Button mode="text" textColor={theme.colors.primary}>
            View Reports
          </Button>
        </Card.Actions>
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  roleChip: {
    backgroundColor: '#FFE5D9',
  },
  roleChipText: {
    color: '#C45C26',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#0F2C59',
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
  },
});
