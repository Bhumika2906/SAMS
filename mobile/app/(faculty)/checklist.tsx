import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Surface, Text } from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import {
  clearActiveVerification,
  getActiveVerification,
  updateActiveVerificationData,
} from '../../src/storage/activeVerification';

export default function FacultyChecklistScreen() {
  const router = useRouter();
  const [activeCandidate, setActiveCandidate] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadActive = () => {
    const { activeData } = getActiveVerification();
    setActiveCandidate(activeData);
  };

  useFocusEffect(
    useCallback(() => {
      loadActive();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const { activeToken } = getActiveVerification();
    if (activeToken) {
      try {
        const res = await apiClient.post('/verify/scan', { token: activeToken });
        if (res.data?.success) {
          setActiveCandidate(res.data.data);
          updateActiveVerificationData(() => res.data.data);
        }
      } catch {
        // Ignored
      }
    }
    setRefreshing(false);
  };

  const handleVerifyItem = async (itemId: string, status: 'Verified' | 'NotVerified') => {
    setIsVerifying(true);
    try {
      const res = await apiClient.post(`/verify/items/${itemId}`, { status });
      if (res.data?.success) {
        // Update local and storage state
        setActiveCandidate((prev: any) => {
          if (!prev) return prev;
          const updatedItems = prev.checklist.items.map((it: any) =>
            it._id === itemId ? { ...it, status } : it,
          );
          const allVerified = updatedItems
            .filter((i: any) => i.mandatory)
            .every((i: any) => i.status === 'Verified');
          const updated = {
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
          updateActiveVerificationData(() => updated);
          return updated;
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

  const handleFinishNext = () => {
    clearActiveVerification();
    setActiveCandidate(null);
    router.push('/(faculty)/scan');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Surface style={styles.headerCard} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          Document Checklist Verification
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Verify physical originals item by item. Scanning alone does not verify documents.
        </Text>
      </Surface>

      {activeCandidate ? (
        <Surface style={styles.resultCard} elevation={2}>
          {/* Candidate Header */}
          <View style={styles.candidateHeader}>
            <View style={styles.candHeaderLeft}>
              <Text variant="titleLarge" style={styles.candName}>
                {activeCandidate.candidate?.fullName}
              </Text>
              <Text variant="bodySmall" style={styles.candEmail}>
                {activeCandidate.candidate?.email}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[
                activeCandidate.candidate?.admissionStage === 'AdmissionConfirmed'
                  ? styles.confirmedChip
                  : styles.stageChip,
                styles.stageChipBase,
              ]}
              textStyle={styles.chipText}
            >
              {activeCandidate.candidate?.admissionStage}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.checkTitle}>
            Verify Mandatory Original Documents
          </Text>
          <Text variant="bodySmall" style={styles.checkSub}>
            Physical inspection required. Tap Verified once confirmed against candidate originals.
          </Text>

          {/* Checklist Items */}
          {activeCandidate.checklist?.items?.map((item: any) => (
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

          <Button
            mode="outlined"
            onPress={handleFinishNext}
            style={styles.finishBtn}
            icon="check-circle"
          >
            Finish & Verify Next Candidate
          </Button>
        </Surface>
      ) : (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text variant="titleLarge" style={styles.emptyTitle}>
              No Candidate Active
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Please enter an applicant's Gate Pass Token on the Scan QR tab to load their verification checklist.
            </Text>
            <Button
              mode="contained"
              buttonColor="#0F2C59"
              onPress={() => router.push('/(faculty)/scan')}
              style={styles.emptyBtn}
              icon="qrcode-scan"
            >
              Go to Scan QR
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
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
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  candHeaderLeft: {
    flex: 1,
    minWidth: 160,
  },
  candName: {
    color: '#0F2C59',
    fontWeight: '800',
  },
  candEmail: {
    color: '#64748B',
  },
  stageChipBase: {
    alignSelf: 'flex-start',
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
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    minWidth: 150,
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
    alignSelf: 'flex-start',
  },
  verChipText: {
    color: '#047857',
    fontWeight: '700',
  },
  notVerChip: {
    backgroundColor: '#FFE5D9',
    alignSelf: 'flex-start',
  },
  notVerChipText: {
    color: '#C45C26',
    fontWeight: '700',
  },
  actionBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verifyBtn: {
    flex: 1,
    minWidth: 130,
    borderRadius: 6,
  },
  notVerifyBtn: {
    flex: 1,
    minWidth: 110,
    borderRadius: 6,
    borderColor: '#DC2626',
  },
  finishBtn: {
    marginTop: 16,
    borderColor: '#0F2C59',
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    color: '#0F2C59',
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  emptyBtn: {
    borderRadius: 8,
  },
});
