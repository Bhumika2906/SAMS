import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function FacultyScanScreen() {
  const [tokenInput, setTokenInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleScan = async (codeToVerify?: string) => {
    const code = (codeToVerify || tokenInput).trim();
    if (!code) {
      setErrorMsg('Please enter or scan a gate pass token code');
      return;
    }
    setErrorMsg(null);
    setIsScanning(true);
    try {
      const res = await apiClient.post('/verify/scan', { token: code });
      if (res.data?.success) {
        setScannedData(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired gate pass token');
    } finally {
      setIsScanning(false);
    }
  };

  const handleVerifyItem = async (itemId: string, status: 'Verified' | 'NotVerified') => {
    setIsVerifying(true);
    try {
      const res = await apiClient.post(`/verify/items/${itemId}`, { status });
      if (res.data?.success) {
        // Update local checklist state
        setScannedData((prev: any) => {
          if (!prev) return prev;
          const updatedItems = prev.checklist.items.map((it: any) =>
            it._id === itemId ? { ...it, status } : it,
          );
          const allVerified = updatedItems
            .filter((i: any) => i.mandatory)
            .every((i: any) => i.status === 'Verified');
          return {
            ...prev,
            checklist: {
              ...prev.checklist,
              status: allVerified ? 'FullyVerified' : 'PartiallyVerified',
              items: updatedItems,
            },
            candidate: {
              ...prev.candidate,
              admissionStage: allVerified ? 'AdmissionConfirmed' : prev.candidate.admissionStage,
            },
          };
        });

        if (res.data.data.admissionConfirmed) {
          Alert.alert(
            'Admission Confirmed!',
            'All mandatory original documents are verified. The candidate is officially admitted to LNMIIT!',
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update item status');
    } finally {
      setIsVerifying(false);
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
          <Card.Title title="Gate Pass Validation" subtitle="Enter QR token or use demo pass" />
          <Card.Content>
            {errorMsg ? (
              <HelperText type="error" visible style={styles.errorText}>
                {errorMsg}
              </HelperText>
            ) : null}

            <TextInput
              label="Gate Pass Code / Token"
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="e.g. DEMO-PASS-101 or hash"
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

        {/* Scanned Candidate & Checklist Display */}
        {scannedData ? (
          <Surface style={styles.resultCard} elevation={2}>
            <View style={styles.candidateHeader}>
              <View>
                <Text variant="titleLarge" style={styles.candName}>
                  {scannedData.candidate?.fullName}
                </Text>
                <Text variant="bodySmall" style={styles.candEmail}>
                  {scannedData.candidate?.email}
                </Text>
              </View>
              <Chip
                mode="flat"
                style={
                  scannedData.candidate?.admissionStage === 'AdmissionConfirmed'
                    ? styles.confirmedChip
                    : styles.stageChip
                }
                textStyle={styles.chipText}
              >
                {scannedData.candidate?.admissionStage}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.checkTitle}>
              Verify Mandatory Original Documents
            </Text>
            <Text variant="bodySmall" style={styles.checkSub}>
              Physical inspection required. Tap Verified once confirmed against originals.
            </Text>

            {scannedData.checklist?.items?.map((item: any) => (
              <Card key={item._id} style={styles.itemCard} mode="outlined">
                <Card.Content>
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text variant="titleSmall" style={styles.itemTitle}>
                        {item.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.mandatoryText}>
                        {item.mandatory ? 'Mandatory Original' : 'Optional'}
                      </Text>
                    </View>
                    <Chip
                      mode="flat"
                      style={item.status === 'Verified' ? styles.verChip : styles.notVerChip}
                      textStyle={item.status === 'Verified' ? styles.verChipText : styles.notVerChipText}
                    >
                      {item.status}
                    </Chip>
                  </View>

                  <View style={styles.actionBtnRow}>
                    <Button
                      mode="contained"
                      buttonColor="#047857"
                      compact
                      onPress={() => handleVerifyItem(item._id, 'Verified')}
                      loading={isVerifying}
                      disabled={isVerifying || item.status === 'Verified'}
                      style={styles.verifyBtn}
                    >
                      Mark Verified ✓
                    </Button>
                    <Button
                      mode="outlined"
                      textColor="#DC2626"
                      compact
                      onPress={() => handleVerifyItem(item._id, 'NotVerified')}
                      loading={isVerifying}
                      disabled={isVerifying || item.status === 'NotVerified'}
                      style={styles.notVerifyBtn}
                    >
                      Reject ✗
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </Surface>
        ) : null}
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
    gap: 8,
  },
  scanBtn: {
    flex: 1,
    borderRadius: 8,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#F86F03',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    borderTopColor: '#0F2C59',
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candName: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  candEmail: {
    color: '#64748B',
  },
  stageChip: {
    backgroundColor: '#FFE5D9',
  },
  confirmedChip: {
    backgroundColor: '#ECFDF5',
  },
  chipText: {
    fontWeight: '700',
    fontSize: 11,
  },
  divider: {
    marginVertical: 14,
  },
  checkTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  checkSub: {
    color: '#64748B',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    borderColor: '#E2E8F0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  mandatoryText: {
    color: '#64748B',
    fontSize: 11,
  },
  verChip: {
    backgroundColor: '#ECFDF5',
  },
  verChipText: {
    color: '#047857',
    fontWeight: '700',
  },
  notVerChip: {
    backgroundColor: '#FFE5D9',
  },
  notVerChipText: {
    color: '#C45C26',
    fontWeight: '700',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyBtn: {
    flex: 1,
    borderRadius: 6,
  },
  notVerifyBtn: {
    flex: 1,
    borderRadius: 6,
    borderColor: '#DC2626',
  },
});
