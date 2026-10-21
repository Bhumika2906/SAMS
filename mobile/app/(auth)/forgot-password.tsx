import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { message: string } }>(
        '/auth/forgot-password',
        { email: email.trim().toLowerCase() },
      );
      setMessage(res.data.data.message || 'Reset code sent if the email is registered.');
      setStep('reset');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword) {
      setErrorMessage('Please provide both the 6-digit OTP code and a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password: newPassword,
      });
      setMessage('Password has been successfully updated! You can now sign in.');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.card} elevation={2}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Reset Password
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {step === 'request'
                ? 'Enter your registered email to receive a password reset code.'
                : 'Enter the 6-digit code printed in the server console and your new password.'}
            </Text>
          </View>

          {message ? (
            <Text variant="bodyMedium" style={styles.successBanner}>
              {message}
            </Text>
          ) : null}

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorBanner}>
              {errorMessage}
            </HelperText>
          ) : null}

          {step === 'request' ? (
            <>
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
              <Button
                mode="contained"
                onPress={handleRequestOtp}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                buttonColor={theme.colors.primary}
              >
                Send Reset Code
              </Button>
            </>
          ) : (
            <>
              <TextInput
                label="6-Digit OTP Code"
                value={otp}
                onChangeText={(text) => {
                  setOtp(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                mode="outlined"
                style={styles.input}
                outlineColor="#CBD5E1"
                activeOutlineColor={theme.colors.primary}
              />

              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
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
                onPress={handleResetPassword}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                buttonColor={theme.colors.primary}
              >
                Set New Password
              </Button>
            </>
          )}

          <Button
            mode="text"
            onPress={() => router.replace('/(auth)/login')}
            textColor={theme.colors.secondary}
            style={styles.backButton}
          >
            Back to Sign In
          </Button>
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
  },
  title: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
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
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 12,
  },
});
