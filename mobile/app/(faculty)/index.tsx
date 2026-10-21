import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Surface, Text } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function FacultyHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              Faculty Verifier Portal
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {user?.fullName} · {user?.email}
            </Text>
          </View>
          <Chip mode="flat" style={styles.counterChip} textStyle={styles.counterChipText}>
            Assigned Counter
          </Chip>
        </View>
      </Surface>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Verification Queue
      </Text>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(faculty)/scan')}>
        <Card.Title
          title="Scan Candidate QR Pass"
          subtitle="Scan campus visit gate pass or enter 128-bit manual token"
        />
        <Card.Actions>
          <Button mode="contained" buttonColor={theme.colors.primary}>
            Open QR Scanner
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(faculty)/checklist')}>
        <Card.Title
          title="Active Document Checklist"
          subtitle="Inspect physical originals and verify item-by-item"
        />
        <Card.Actions>
          <Button mode="outlined" textColor={theme.colors.primary}>
            View Current Checklist
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card} mode="elevated" onPress={() => router.push('/(faculty)/history')}>
        <Card.Title
          title="Verification History"
          subtitle="Audit log of candidates verified by your counter"
        />
        <Card.Actions>
          <Button mode="text" textColor={theme.colors.secondary}>
            View Log
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
  counterChip: {
    backgroundColor: '#DDE6ED',
  },
  counterChipText: {
    color: '#0F2C59',
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
