import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#A01A1E' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false, title: 'LNMIIT SAMS — Login' }} />
      <Stack.Screen name="register" options={{ title: 'Applicant Registration' }} />
      <Stack.Screen name="verify-otp" options={{ title: 'Verify Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
