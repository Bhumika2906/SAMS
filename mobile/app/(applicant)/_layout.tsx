import { useRouter, usePathname, Slot } from 'expo-router';
import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Appbar, Chip, Surface } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';

export default function ApplicantLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const navItems = [
    { label: 'Home', path: '/(applicant)' },
    { label: 'Application', path: '/(applicant)/application' },
    { label: 'Admission', path: '/(applicant)/admission' },
    { label: 'Checklist', path: '/(applicant)/checklist' },
    { label: 'Profile', path: '/(applicant)/profile' },
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content
          title="LNMIIT SAMS"
          subtitle={`Applicant: ${user?.fullName || 'Candidate'}`}
          titleStyle={styles.headerTitle}
          subtitleStyle={styles.headerSubtitle}
        />
        <Appbar.Action icon="logout" color="#FFFFFF" onPress={handleLogout} />
      </Appbar.Header>

      <Surface style={styles.navBar} elevation={1}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/(applicant)' && pathname === '/(applicant)/index');
            return (
              <Chip
                key={item.path}
                selected={isActive}
                onPress={() => router.push(item.path as any)}
                style={[styles.navChip, isActive && styles.activeChip]}
                textStyle={[styles.chipText, isActive && styles.activeChipText]}
                showSelectedOverlay
              >
                {item.label}
              </Chip>
            );
          })}
        </ScrollView>
      </Surface>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#0F2C59',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#F86F03',
    fontWeight: '600',
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  navChip: {
    backgroundColor: '#F1F5F9',
  },
  activeChip: {
    backgroundColor: '#0F2C59',
  },
  chipText: {
    color: '#475569',
    fontSize: 13,
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});
