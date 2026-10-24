import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function ApplicantChecklistScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [passData, setPassData] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [appStage, setAppStage] = useState<string>('Registered');
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [trackerRes, passRes, payRes] = await Promise.all([
        apiClient.get('/applications/me/tracker'),
        apiClient.get('/payments/gatepass/me'),
        apiClient.get('/payments/me'),
      ]);

      if (trackerRes.data?.success) {
        setAppStage(trackerRes.data.data.currentStage);
      }
      if (passRes.data?.success) {
        setPassData(passRes.data.data.pass);
        setChecklist(passRes.data.data.checklist);
      }
      if (payRes.data?.success) {
        setPayment(payRes.data.data.payment);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleSimulatePayment = async (outcome: 'success' | 'fail') => {
    setIsPaying(true);
    setMessage(null);
    try {
      const res = await apiClient.post('/payments/me', { outcome });
      setMessage(res.data.data.message);
      if (outcome === 'success') {
        Alert.alert(
          'Payment Successful',
          'Your fee deposit has been accepted. Your campus QR gate pass and personalized verification checklist are now available!',
        );
      } else {
        Alert.alert('Payment Failed', 'Simulated failure recorded. You can retry with the success button.');
      }
      await loadAll();
    } catch (err: any) {
      const msg = err.message || 'Payment simulation failed';
      setMessage(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Payment Error: ${msg}`);
      } else {
        Alert.alert('Payment Error', msg);
      }
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge">Loading checklist and gate pass...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Payment, Gate Pass & Checklist
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Campus document verification is unlocked after admission fee payment.
        </Text>
      </Surface>

      {message ? (
        <Text variant="bodyMedium" style={styles.banner}>
          {message}
        </Text>
      ) : null}

      {/* Final Admission Confirmed Banner */}
      {appStage === 'AdmissionConfirmed' ? (
        <Surface style={styles.confirmedBanner} elevation={2}>
          <Text variant="titleLarge" style={styles.confirmedTitle}>
            🎓 Admission Officially Confirmed!
          </Text>
          <Text variant="bodyMedium" style={styles.confirmedDesc}>
            All mandatory original documents have been verified by faculty verifiers. Welcome to LNMIIT Jaipur!
          </Text>
        </Surface>
      ) : null}

      {/* Simulated Payment Section (Only if seat accepted or payment needed) */}
      {appStage === 'SeatConfirmed' || !payment ? (
        <Card style={styles.paymentCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Admission Fee Payment
                </Text>
                <Text variant="bodySmall" style={styles.cardSubtitle}>
                  SIMULATED PAYMENT GATEWAY
                </Text>
              </View>
              <Chip mode="flat" style={styles.simChip} textStyle={styles.simChipText}>
                Simulated
              </Chip>
            </View>

            <View style={styles.feeBox}>
              <Text variant="labelSmall" style={styles.feeLabel}>
                DEPOSIT AMOUNT
              </Text>
              <Text variant="headlineMedium" style={styles.feeAmount}>
                ₹1,60,000
              </Text>
              <Text variant="bodySmall" style={styles.feeNote}>
                Semester 1 tuition fee deposit. No real cards needed.
              </Text>
            </View>

            <View style={styles.paymentBtnRow}>
              <Button
                mode="contained"
                buttonColor="#047857"
                onPress={() => handleSimulatePayment('success')}
                loading={isPaying}
                disabled={isPaying}
                style={styles.payBtn}
              >
                Simulate Payment Success
              </Button>
              <Button
                mode="outlined"
                textColor="#DC2626"
                onPress={() => handleSimulatePayment('fail')}
                loading={isPaying}
                disabled={isPaying}
                style={[styles.payBtn, styles.failBtn]}
              >
                Simulate Fail
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.receiptCard} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Text variant="titleMedium" style={styles.receiptTitle}>
                  Admission Payment: Completed
                </Text>
                <Text variant="bodySmall" style={styles.receiptSubtitle}>
                  Receipt No: {payment?.receiptNumber || 'REC-LNMIIT-2026'}
                </Text>
              </View>
              <Chip mode="flat" style={styles.paidChip} textStyle={styles.paidChipText}>
                Paid ₹160,000
              </Chip>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* QR Gate Pass Section */}
      {passData ? (
        <Card style={styles.passCard} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Text variant="titleMedium" style={styles.passTitle}>
                  Campus Visit QR Gate Pass
                </Text>
                <Text variant="bodySmall" style={styles.passSubtitle}>
                  Show this token at the verification hall entrance
                </Text>
              </View>
              <Chip mode="flat" style={styles.validChip} textStyle={styles.validChipText}>
                {passData.validity}
              </Chip>
            </View>
            <Surface style={styles.qrBox} elevation={1}>
              <Text variant="labelSmall" style={styles.tokenLabel}>
                VERIFICATION PASS TOKEN
              </Text>
              <Text variant="headlineSmall" style={styles.tokenText}>
                {passData.tokenHash ? `TOKEN: ${passData.tokenHash.substring(0, 16).toUpperCase()}` : 'DEMO-PASS-101'}
              </Text>
              <Text variant="bodySmall" style={styles.securityNote}>
                Opaque token verified server-side. No candidate PII is exposed.
              </Text>
            </Surface>

            <Divider style={styles.divider} />

            <View style={styles.visitDetails}>
              <Text variant="bodySmall" style={styles.detailItem}>
                <Text style={styles.boldText}>Purpose: </Text>{passData.purpose || 'Document Verification'}
              </Text>
              <Text variant="bodySmall" style={styles.detailItem}>
                <Text style={styles.boldText}>Visit Date: </Text>{passData.date || '2026-11-15'}
              </Text>
              <Text variant="bodySmall" style={styles.detailItem}>
                <Text style={styles.boldText}>Time Slot: </Text>{passData.timeSlot || '10:00 AM - 1:00 PM'}
              </Text>
              <Text variant="bodySmall" style={styles.detailItem}>
                <Text style={styles.boldText}>Location: </Text>Lecture Hall 1 (LH-101), LNMIIT Campus
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {/* Digital Checklist Section */}
      {checklist ? (
        <Card style={styles.checklistCard} mode="outlined">
          <Card.Title
            title="Personalized Document Checklist"
            subtitle={`Status: ${checklist.status}`}
          />
          <Card.Content>
            {checklist.items?.map((item: any, idx: number) => (
              <View key={item._id || idx} style={styles.checklistItem}>
                <View style={styles.itemTextCol}>
                  <Text variant="titleSmall" style={styles.itemName}>
                    {item.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.itemMandatory}>
                    {item.mandatory ? 'Mandatory Original' : 'Optional'}
                  </Text>
                </View>
                <Chip
                  mode="flat"
                  style={item.status === 'Verified' ? styles.itemVerified : styles.itemPending}
                  textStyle={item.status === 'Verified' ? styles.itemVerifiedText : styles.itemPendingText}
                >
                  {item.status}
                </Chip>
              </View>
            ))}
          </Card.Content>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  banner: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontWeight: '600',
  },
  confirmedBanner: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#047857',
  },
  confirmedTitle: {
    color: '#047857',
    fontWeight: '800',
  },
  confirmedDesc: {
    color: '#065F46',
    marginTop: 4,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderTopWidth: 4,
    borderTopColor: '#0F2C59',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    minWidth: 160,
  },
  cardTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  receiptTitle: {
    color: '#047857',
    fontWeight: '700',
  },
  receiptSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  passTitle: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  passSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  simChip: {
    backgroundColor: '#FFE5D9',
    alignSelf: 'flex-start',
  },
  simChipText: {
    color: '#C45C26',
    fontWeight: '700',
    fontSize: 11,
  },
  feeBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  feeLabel: {
    color: '#64748B',
    letterSpacing: 1,
  },
  feeAmount: {
    color: '#0F2C59',
    fontWeight: '800',
    marginTop: 4,
  },
  feeNote: {
    color: '#64748B',
    marginTop: 4,
  },
  paymentBtnRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 16,
  },
  payBtn: {
    borderRadius: 8,
  },
  failBtn: {
    borderColor: '#DC2626',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#047857',
    marginBottom: 16,
  },
  paidChip: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
  },
  paidChipText: {
    color: '#047857',
    fontWeight: '700',
  },
  passCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  validChip: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
  },
  validChipText: {
    color: '#047857',
    fontWeight: '700',
  },
  qrBox: {
    backgroundColor: '#0F2C59',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  tokenLabel: {
    color: '#F86F03',
    fontWeight: '700',
    letterSpacing: 1,
  },
  tokenText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginVertical: 6,
  },
  securityNote: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 11,
  },
  divider: {
    marginVertical: 12,
  },
  visitDetails: {
    gap: 6,
  },
  detailItem: {
    color: '#334155',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F2C59',
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemTextCol: {
    flex: 1,
    minWidth: 150,
  },
  itemName: {
    color: '#0F2C59',
    fontWeight: '700',
  },
  itemMandatory: {
    color: '#64748B',
    fontSize: 11,
  },
  itemVerified: {
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
  },
  itemVerifiedText: {
    color: '#047857',
    fontWeight: '700',
  },
  itemPending: {
    backgroundColor: '#FFE5D9',
    alignSelf: 'flex-start',
  },
  itemPendingText: {
    color: '#C45C26',
    fontWeight: '700',
  },
});
