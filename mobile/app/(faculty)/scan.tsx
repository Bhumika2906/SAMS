import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { setActiveVerification } from '../../src/storage/activeVerification';
import { theme } from '../../src/theme/theme';

export default function FacultyScanScreen() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleScan = async (codeToVerify?: string) => {
    const code = (codeToVerify || tokenInput).trim();
    if (!code) {
      setErrorMsg('Please enter a candidate email, pass code, or token');
      return;
    }
    setErrorMsg(null);
    setIsScanning(true);
    try {
      const res = await apiClient.post('/verify/scan', { token: code });
      if (res.data?.success) {
        setActiveVerification(code, res.data.data);
        // Navigate directly to the Checklist tab
        router.push('/(faculty)/checklist');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired gate pass token');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.headerCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.title}>
            Document Verification Desk
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Assigned counter: Lecture Hall 1 (LH-101). Validate gate pass and verify physical originals.
          </Text>
        </Surface>

        {/* Scan / Input Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Title
            title="Gate Pass Validation"
            subtitle="Enter candidate email, name, or pass code"
          />
          <Card.Content>
            {errorMsg ? (
              <HelperText type="error" visible style={styles.errorText}>
                {errorMsg}
              </HelperText>
            ) : null}

            <TextInput
              label="Gate Pass Token / Code"
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="e.g. TOKEN hash or DEMO-PASS-101"
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                buttonColor={theme.colors.primary}
                onPress={() => handleScan()}
                loading={isScanning}
                disabled={isScanning}
                style={styles.scanBtn}
              >
                Validate Pass
              </Button>
              <Button
                mode="outlined"
                textColor={theme.colors.secondary}
                onPress={() => {
                  setTokenInput('DEMO-PASS-101');
                  handleScan('DEMO-PASS-101');
                }}
                disabled={isScanning}
                style={styles.quickBtn}
              >
                Quick Demo Pass
              </Button>
            </View>
          </Card.Content>
        </Card>
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
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
  },
  errorText: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scanBtn: {
    flex: 1,
    minWidth: 130,
    borderRadius: 8,
  },
  quickBtn: {
    flex: 1,
    minWidth: 130,
    borderRadius: 8,
    borderColor: '#F86F03',
  },
});
