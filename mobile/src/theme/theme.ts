import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#A01A1E', // LNMIIT Crimson Red (Official Brand)
    onPrimary: '#FFFFFF',
    primaryContainer: '#FEE2E2',
    onPrimaryContainer: '#7F1D1D',
    secondary: '#8B1418', // Deep Maroon
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE4E6',
    onSecondaryContainer: '#5C0D11',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    onSurface: '#1E293B',
    surfaceVariant: '#F1F5F9',
    onSurfaceVariant: '#475569',
    outline: '#CBD5E1',
    error: '#DC2626',
    onError: '#FFFFFF',
  },
};
