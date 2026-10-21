import { UserRole } from '@sams/shared';
import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../src/context/AuthContext';
import { theme } from '../src/theme/theme';

export default function IndexScreen() {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.loadingText}>
          Loading SAMS...
        </Text>
      </View>
    );
  }

  if (!user || !token) {
    return <Redirect href="/(auth)/login" />;
  }

  switch (user.role) {
    case UserRole.Applicant:
      return <Redirect href="/(applicant)" />;
    case UserRole.AdministratorUser:
      return <Redirect href="/(admin)" />;
    case UserRole.FacultyVerifier:
      return <Redirect href="/(faculty)" />;
    case UserRole.Management:
      return <Redirect href="/(management)" />;
    default:
      return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    color: '#0F2C59',
    fontWeight: '600',
  },
});
