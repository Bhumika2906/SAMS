import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/theme/theme';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp } = useAuth();

  const [email, setEmail] = useState(params.email || '');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!email.trim() || !otp.trim()) {
      setErrorMessage('Please enter both email and the 6-digit OTP code.');
      return;
    }
    if (otp.trim().length !== 6) {
      setErrorMessage('OTP must be exactly 6 digits.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      // Redirect to applicant home upon verification
      router.replace('/(applicant)');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed. Please try again.');
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
              Verify Your Account
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Enter the 6-digit verification code. (Simulated OTP is printed to the server console).
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
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
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
