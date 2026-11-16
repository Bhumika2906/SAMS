import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { setActiveVerification } from '../../src/storage/activeVerification';
import { theme } from '../../src/theme/theme';

export default function FacultyScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const scanLock = useRef(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleScan = async (codeToVerify?: string) => {
    const code = (codeToVerify || tokenInput).trim();
    if (!code) {
      setErrorMsg('Please enter a candidate email, pass code, or token');
      return;
    }
    if (scanLock.current) return;
    scanLock.current = true;
    setCameraOpen(false);
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
      scanLock.current = false;
      setIsScanning(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.headerCard} elevation={1}>
          <Text variant="headlineSmall" style={styles.title}>
            Document Verification Desk
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Scan the gate pass assigned to your verification counter.
          </Text>
        </Surface>

        {/* Scan / Input Card */}
        <Card style={styles.card} mode="elevated">
          <Card.Title
            title="Gate Pass Validation"
            subtitle="Scan the QR or enter the complete pass token"
          />
          <Card.Content>
            <Button
              disabled={isScanning}
              onPress={async () => {
                const result = permission?.granted
                  ? permission
                  : await requestPermission();
                if (result.granted) setCameraOpen(true);
                else
                  setErrorMsg(
                    'Camera permission is required. Enable it in settings or enter the pass code.',
                  );
              }}
            >
              Scan QR code
            </Button>
            {cameraOpen && (
              <View>
                <CameraView
                  style={{ height: 300 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={({ data }) => {
                    void handleScan(data);
                  }}
                />
                <Button onPress={() => setCameraOpen(false)}>
                  Close camera
                </Button>
              </View>
            )}
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
    color: '#A01A1E',
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
