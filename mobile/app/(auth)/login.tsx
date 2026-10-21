import { UserRole } from '@sams/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await login({ email: email.trim().toLowerCase(), password });
      // Redirect based on server-assigned role
      switch (user.role) {
        case UserRole.Applicant:
          router.replace('/(applicant)');
          break;
        case UserRole.AdministratorUser:
          router.replace('/(admin)');
          break;
        case UserRole.FacultyVerifier:
          router.replace('/(faculty)');
          break;
        case UserRole.Management:
          router.replace('/(management)');
          break;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Password@123');
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.card} elevation={2}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.brandTitle}>
              LNMIIT JAIPUR
            </Text>
            <Text variant="titleMedium" style={styles.subTitle}>
              Student Admission Management System
            </Text>
            <Text variant="bodySmall" style={styles.caption}>
              Mobile-only portal. Sign in with your registered account.
            </Text>
          </View>

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorBanner}>
              {errorMessage}
            </HelperText>
          ) : null}

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            outlineColor="#CBD5E1"
            activeOutlineColor={theme.colors.primary}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry={!showPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            mode="outlined"
            style={styles.input}
            outlineColor="#CBD5E1"
            activeOutlineColor={theme.colors.primary}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            buttonColor={theme.colors.primary}
          >
            Sign In
          </Button>

          <View style={styles.linksRow}>
            <Button
              mode="text"
              onPress={() => router.push('/(auth)/forgot-password')}
              textColor={theme.colors.secondary}
              compact
            >
              Forgot Password?
            </Button>
            <Button
              mode="text"
              onPress={() => router.push('/(auth)/register')}
              textColor={theme.colors.primary}
              compact
            >
              New Applicant? Register
            </Button>
          </View>

          {/* Quick Demo Credentials */}
          <Card style={styles.demoCard} mode="outlined">
            <Card.Content>
              <Text variant="labelMedium" style={styles.demoTitle}>
                Quick Demo Accounts (Password: Password@123)
              </Text>
              <View style={styles.chipGrid}>
                <Chip
                  mode="outlined"
                  compact
                  onPress={() => fillPreset('applicant1@sams.test')}
                  style={styles.chip}
                >
                  Applicant 1
                </Chip>
                <Chip
                  mode="outlined"
                  compact
                  onPress={() => fillPreset('admin@sams.test')}
                  style={styles.chip}
                >
                  Admin
                </Chip>
                <Chip
                  mode="outlined"
                  compact
                  onPress={() => fillPreset('faculty1@sams.test')}
                  style={styles.chip}
                >
                  Faculty 1
                </Chip>
                <Chip
                  mode="outlined"
                  compact
                  onPress={() => fillPreset('management@sams.test')}
                  style={styles.chip}
                >
                  Management
                </Chip>
              </View>
            </Card.Content>
          </Card>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scroll: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  brandTitle: {
    color: '#0F2C59',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subTitle: {
    color: '#F86F03',
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  caption: {
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  demoCard: {
    marginTop: 24,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  demoTitle: {
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
  },
});
