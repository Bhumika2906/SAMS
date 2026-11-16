import { UserRole } from '@sams/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { useAuth } from '../../src/context/AuthContext';

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
      setErrorMessage('Please enter both Application ID / Email and password.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await login({ email: email.trim().toLowerCase(), password });
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
    <ImageBackground
      source={require('../../assets/images/campus_bg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Dark tint overlay across the aerial background */}
      <View style={styles.darkBackdrop}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Image
              source={require('../../assets/images/lnmiit_logo.png')}
              style={styles.topBarLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topGreenPill}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.topGreenPillText}>+ New Applicant</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.centerContainer}>
              {/* Wide Transparent Sign-In Card */}
              <View style={styles.signInCard}>
                {/* Institute Brand Header */}
                <View style={styles.cardHeader}>
                  <Image
                    source={require('../../assets/images/lnmiit_logo.png')}
                    style={styles.cardLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandSubtitle}>
                    The LNM Institute of Information Technology
                  </Text>
                  <Text style={styles.brandMotto}>
                    "Excellence Our Motto Discipline Our Way"
                  </Text>
                </View>

                <Text style={styles.signInHeading}>Sign In</Text>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <HelperText type="error" visible style={styles.errorText}>
                      {errorMessage}
                    </HelperText>
                  </View>
                ) : null}

                {/* Email / Application ID Input */}
                <TextInput
                  label="Application ID / Email Address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  style={styles.transparentInput}
                  textColor="#FFFFFF"
                  outlineColor="rgba(255, 255, 255, 0.35)"
                  activeOutlineColor="#A01A1E"
                  theme={{
                    colors: {
                      onSurfaceVariant: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(10, 15, 25, 0.65)',
                    },
                  }}
                  right={<TextInput.Icon icon="account" color="rgba(255, 255, 255, 0.6)" />}
                />

                {/* Password Input */}
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
                      color="rgba(255, 255, 255, 0.6)"
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  mode="outlined"
                  style={styles.transparentInput}
                  textColor="#FFFFFF"
                  outlineColor="rgba(255, 255, 255, 0.35)"
                  activeOutlineColor="#A01A1E"
                  theme={{
                    colors: {
                      onSurfaceVariant: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(10, 15, 25, 0.65)',
                    },
                  }}
                />

                {/* Crimson Red Sign In Button */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.crimsonButton}
                  contentStyle={styles.crimsonButtonContent}
                  buttonColor="#A01A1E"
                  textColor="#FFFFFF"
                >
                  Sign In
                </Button>

                {/* Links row */}
                <View style={styles.linksRow}>
                  <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                    <Text style={styles.linkRed}>New Registration</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text style={styles.linkWhite}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Demo Credentials */}
                <View style={styles.demoBox}>
                  <Text style={styles.demoTitle}>
                    Quick Demo Credentials (Password: Password@123)
                  </Text>
                  <View style={styles.demoGrid}>
                    <Chip
                      mode="outlined"
                      compact
                      onPress={() => fillPreset('applicant1@sams.test')}
                      style={styles.demoChip}
                      textStyle={styles.demoChipText}
                    >
                      Applicant 1
                    </Chip>
                    <Chip
                      mode="outlined"
                      compact
                      onPress={() => fillPreset('admin@sams.test')}
                      style={styles.demoChip}
                      textStyle={styles.demoChipText}
                    >
                      Admin
                    </Chip>
                    <Chip
                      mode="outlined"
                      compact
                      onPress={() => fillPreset('faculty1@sams.test')}
                      style={styles.demoChip}
                      textStyle={styles.demoChipText}
                    >
                      Faculty 1
                    </Chip>
                    <Chip
                      mode="outlined"
                      compact
                      onPress={() => fillPreset('management@sams.test')}
                      style={styles.demoChip}
                      textStyle={styles.demoChipText}
                    >
                      Management
                    </Chip>
                  </View>
                </View>

                {/* Inquiry footer info */}
                <View style={styles.inquiryBox}>
                  <Text style={styles.inquiryHeader}>
                    For admission-related inquiries email us
                  </Text>
                  <Text style={styles.inquiryDetail}>
                    ✉ ugadmissions@lnmiit.ac.in   |   ☎ 1800-180-6566
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom copyright notice */}
            <Text style={styles.footerCopyright}>
              © 2026 The LNM Institute of Information Technology Jaipur. All Rights Reserved.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarLogo: {
    width: 120,
    height: 40,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topGreenPill: {
    backgroundColor: '#15803D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  topGreenPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInCard: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: 'rgba(12, 17, 28, 0.7)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(2px)',
      },
    }),
  },
  cardHeader: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cardLogo: {
    width: 150,
    height: 48,
    marginBottom: 6,
    alignSelf: 'center',
  },
  brandSubtitle: {
    color: '#F87171',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  brandMotto: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  signInHeading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 18,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 14,
  },
  errorText: {
    color: '#FCA5A5',
  },
  transparentInput: {
    marginBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    fontSize: 15,
  },
  crimsonButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  crimsonButtonContent: {
    paddingVertical: 9,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  linkRed: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 14,
  },
  linkWhite: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  demoBox: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  demoTitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  demoChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inquiryBox: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  inquiryHeader: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  inquiryDetail: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  footerCopyright: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
});
