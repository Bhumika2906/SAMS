import { useRouter, usePathname, Slot } from 'expo-router';
import React from 'react';
import { StyleSheet, View, ScrollView, Image, Text } from 'react-native';
import { Appbar, Chip, Surface } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';

export default function FacultyLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const navItems = [
    { label: 'Overview', path: '/(faculty)' },
    { label: 'Scan QR Gate Pass', path: '/(faculty)/scan' },
    { label: 'Manual Verification', path: '/(faculty)/checklist' },
    { label: 'Verification History', path: '/(faculty)/history' },
  ];

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/lnmiit_logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerPortalTitle}>SAMS Faculty</Text>
            <Text style={styles.headerSubtitle}>
              {`Verifier: ${user?.fullName || 'Faculty'}`}
            </Text>
          </View>
        </View>
        <Appbar.Action icon="logout" color="#FFFFFF" onPress={handleLogout} />
      </Appbar.Header>

      <Surface style={styles.navBar} elevation={1}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/(faculty)' && pathname === '/(faculty)/index');
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
    backgroundColor: '#A01A1E',
    paddingHorizontal: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 105,
    height: 36,
  },
  headerTitleGroup: {
    justifyContent: 'center',
  },
  headerPortalTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#FECDD3',
    fontWeight: '500',
    fontSize: 12,
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
    backgroundColor: '#A01A1E',
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
