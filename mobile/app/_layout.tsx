import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0B1F3A' },
          headerTintColor: '#FFFFFF',
          headerTitle: 'LNMIIT SAMS',
        }}
      />
    </>
  );
}
