import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Surface, Text } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';

export default function ApplicantProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Applicant Profile
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Personal account information and verified status.
        </Text>
      </Surface>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.infoRow}>
            <Text variant="labelMedium" style={styles.label}>Full Name:</Text>
            <Text variant="bodyMedium" style={styles.value}>{user?.fullName}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text variant="labelMedium" style={styles.label}>Email:</Text>
            <Text variant="bodyMedium" style={styles.value}>{user?.email}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text variant="labelMedium" style={styles.label}>Account Status:</Text>
            <Text variant="bodyMedium" style={[styles.value, { color: '#047857' }]}>
              {user?.verified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text variant="labelMedium" style={styles.label}>Role:</Text>
            <Text variant="bodyMedium" style={styles.value}>{user?.role}</Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={handleLogout}
        textColor="#DC2626"
        style={styles.logoutButton}
        icon="logout"
      >
        Sign Out
      </Button>
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
    marginBottom: 16,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 10,
  },
  label: {
    color: '#64748B',
    fontWeight: '600',
  },
  value: {
    color: '#0F2C59',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    backgroundColor: '#F1F5F9',
  },
  logoutButton: {
    borderColor: '#DC2626',
    borderRadius: 8,
    marginTop: 8,
  },
});
