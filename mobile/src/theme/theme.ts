import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0F2C59', // LNMIIT Navy Blue
    onPrimary: '#FFFFFF',
    primaryContainer: '#DDE6ED',
    onPrimaryContainer: '#0F2C59',
    secondary: '#F86F03', // Restrained Orange Accent
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE5D9',
    onSecondaryContainer: '#5C2400',
    background: '#F8F9FA', // Clean light surface
    surface: '#FFFFFF',
    onSurface: '#1E293B',
    surfaceVariant: '#EEF2F6',
    onSurfaceVariant: '#475569',
    outline: '#CBD5E1',
    error: '#DC2626',
    onError: '#FFFFFF',
  },
};
