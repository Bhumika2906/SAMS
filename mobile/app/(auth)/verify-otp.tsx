import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp, resendOtp } = useAuth();

  const [email, setEmail] = useState(params.email || '');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail || !cleanOtp) {
      setErrorMessage('Please enter both your email and the 6-digit OTP code.');
      return;
    }
    if (cleanOtp.length !== 6) {
      setErrorMessage('OTP must be exactly 6 digits.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      await verifyOtp({
        email: cleanEmail,
        otp: cleanOtp,
      });
      // Redirect to applicant home upon verification
      router.replace('/(applicant)');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to resend OTP.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsResending(true);
    try {
      await resendOtp(cleanEmail);
      setInfoMessage('New 6-digit OTP generated! Check your server terminal.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
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
              Verify Your Account
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Enter the 6-digit verification code printed in your server terminal.
            </Text>
          </View>

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorBanner}>
              {errorMessage}
            </HelperText>
          ) : null}

          {infoMessage ? (
            <HelperText type="info" visible style={styles.infoBanner}>
              {infoMessage}
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
            label="6-Digit OTP Code"
            value={otp}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
              setOtp(cleaned);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            mode="outlined"
            style={styles.input}
            outlineColor="#CBD5E1"
            activeOutlineColor={theme.colors.primary}
            placeholder="e.g. 123456"
          />

          <View style={styles.resendRow}>
            <Button
              mode="text"
              loading={isResending}
              disabled={isResending || isSubmitting}
              onPress={handleResendOtp}
              textColor={theme.colors.primary}
              compact
            >
              Resend OTP Code
            </Button>
          </View>

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.verifyButton}
            contentStyle={styles.verifyButtonContent}
            buttonColor={theme.colors.primary}
          >
            Verify & Proceed to Dashboard
          </Button>

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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  infoBanner: {
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  resendRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  verifyButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  verifyButtonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 12,
  },
});
