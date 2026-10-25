import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { apiClient } from '../../src/api/client';
import { theme } from '../../src/theme/theme';

export default function ApplicantApplicationScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feePaid, setFeePaid] = useState(false);
  const [feeDetails, setFeeDetails] = useState<{
    amount?: number;
    transactionId?: string;
    receiptNumber?: string;
    paidAt?: string;
  } | null>(null);
  const [isPayingFee, setIsPayingFee] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [phone, setPhone] = useState('9876543210');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('2008-05-14');
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');
  const [class12Score, setClass12Score] = useState('92');
  const [examRoll, setExamRoll] = useState('JEE2601992');
  const [pref1, setPref1] = useState('CSE');
  const [pref2, setPref2] = useState('CCE');
  const [pref3, setPref3] = useState('ECE');

  const [programmes, setProgrammes] = useState<Array<{ _id: string; code: string; name: string }>>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.get('/applications/me');
        if (res.data?.success) {
          const app = res.data.data.application;
          const progs = res.data.data.programmes || [];
          setProgrammes(progs);
          if (app) {
            setLocked(!!app.locked);
            if (app.applicationFee?.paid) {
              setFeePaid(true);
              setFeeDetails(app.applicationFee);
            }
            if (app.personal?.phone) setPhone(app.personal.phone);
            if (app.personal?.gender) setGender(app.personal.gender);
            if (app.personal?.dateOfBirth) setDob(app.personal.dateOfBirth);
            if (app.address?.city) setCity(app.address.city);
            if (app.address?.state) setState(app.address.state);
            if (app.education?.class12Score) setClass12Score(String(app.education.class12Score));
            if (app.education?.examRollNumber) setExamRoll(app.education.examRollNumber);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load application');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const buildPayload = () => {
    // Map preference codes to programme IDs
    const cse = programmes.find((p) => p.code === 'CSE')?._id;
    const cce = programmes.find((p) => p.code === 'CCE')?._id;
    const ece = programmes.find((p) => p.code === 'ECE')?._id;

    const mappedPrefs: Array<{ programmeId: string; preferenceOrder: number }> = [];
    if (cse) mappedPrefs.push({ programmeId: cse, preferenceOrder: 1 });
    if (cce) mappedPrefs.push({ programmeId: cce, preferenceOrder: 2 });
    if (ece) mappedPrefs.push({ programmeId: ece, preferenceOrder: 3 });

    return {
      personal: { phone: phone.trim(), gender: gender.trim(), dateOfBirth: dob.trim() },
      address: { city: city.trim(), state: state.trim() },
      education: { class12Score: Number(class12Score), examRollNumber: examRoll.trim() },
      preferences: mappedPrefs,
    };
  };

  const handleSaveDraft = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);
    try {
      await apiClient.put('/applications/me', buildPayload());
      setSuccessMsg('Application draft saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayFee = async (outcome: 'success' | 'fail' = 'success') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsPayingFee(true);
    try {
      // Step 3 in UC-002: Save details first so mandatory details exist on server
      await apiClient.put('/applications/me', buildPayload());
      const res = await apiClient.post('/applications/me/pay-fee', { outcome });
      if (res.data?.success && res.data.data.feePaid) {
        setFeePaid(true);
        setFeeDetails(res.data.data.applicationFee);
        setSuccessMsg(res.data.data.message || 'Application fee paid successfully! Receipt generated.');
      } else {
        setErrorMsg(res.data?.data?.message || 'Payment simulated as Failed. You can retry payment anytime.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Payment failed.');
    } finally {
      setIsPayingFee(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // UC-002: Require application fee payment before submission
    if (!feePaid) {
      setErrorMsg('Please pay the application fee of ₹1,000 before submitting your application.');
      return;
    }

    setIsSubmitting(true);
    try {
      // First save current inputs
      await apiClient.put('/applications/me', buildPayload());
      // Then submit & lock
      const res = await apiClient.post('/applications/me/submit');
      setLocked(true);
      setSuccessMsg(res.data.data.message || 'Application submitted successfully! Application is now locked.');
      Alert.alert(
        'Submission Confirmed',
        'Your application has been locked and submitted for round seat allotment.',
        [{ text: 'OK', onPress: () => router.push('/(applicant)') }],
      );
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text variant="bodyLarge">Loading application...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {locked ? (
          <Surface style={styles.lockedBanner} elevation={2}>
            <Text variant="titleMedium" style={styles.lockedTitle}>
              🔒 Application Submitted & Locked
            </Text>
            <Text variant="bodySmall" style={styles.lockedSubtitle}>
              Your application is verified and locked for allotment rounds. No further changes allowed.
            </Text>
          </Surface>
        ) : null}

        {successMsg ? (
          <Text variant="bodyMedium" style={styles.successText}>
            {successMsg}
          </Text>
        ) : null}

        {errorMsg ? (
          <HelperText type="error" visible style={styles.errorText}>
            {errorMsg}
          </HelperText>
        ) : null}

        {/* Section 1: Personal Info */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="1. Personal Details" />
          <Card.Content>
            <TextInput
              label="Contact Phone"
              value={phone}
              onChangeText={setPhone}
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
            <TextInput
              label="Gender"
              value={gender}
              onChangeText={setGender}
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
            <TextInput
              label="Date of Birth (YYYY-MM-DD)"
              value={dob}
              onChangeText={setDob}
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
          </Card.Content>
        </Card>

        {/* Section 2: Address */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="2. Address & Domicile" />
          <Card.Content>
            <TextInput
              label="City"
              value={city}
              onChangeText={setCity}
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
            <TextInput
              label="State"
              value={state}
              onChangeText={setState}
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
          </Card.Content>
        </Card>

        {/* Section 3: Qualifications */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="3. Qualifying Examination" />
          <Card.Content>
            <TextInput
              label="Class 12 Aggregate Percentage (%)"
              value={class12Score}
              onChangeText={setClass12Score}
              keyboardType="numeric"
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
            <TextInput
              label="JEE Main Roll Number"
              value={examRoll}
              onChangeText={setExamRoll}
              disabled={locked}
              mode="outlined"
              style={styles.input}
              outlineColor="#CBD5E1"
            />
          </Card.Content>
        </Card>

        {/* Section 4: Ranked Preferences */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="4. Ranked Branch Preferences" subtitle="Rank 1 is your highest preference" />
          <Card.Content>
            <View style={styles.prefRow}>
              <Chip mode="outlined" style={styles.prefChip}>
                Preference 1
              </Chip>
              <Text variant="titleMedium" style={styles.prefName}>
                CSE — Computer Science & Engineering
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.prefRow}>
              <Chip mode="outlined" style={styles.prefChip}>
                Preference 2
              </Chip>
              <Text variant="titleMedium" style={styles.prefName}>
                CCE — Communication & Computer Engineering
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.prefRow}>
              <Chip mode="outlined" style={styles.prefChip}>
                Preference 3
              </Chip>
              <Text variant="titleMedium" style={styles.prefName}>
                ECE — Electronics & Communication Engineering
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Section 5: Application Processing Fee */}
        <Card style={styles.card} mode="outlined">
          <Card.Title title="5. Application Fee Payment" />
          <Card.Content>
            {feePaid ? (
              <View style={styles.receiptContainer}>
                <Surface style={styles.receiptHeader} elevation={0}>
                  <Text variant="titleMedium" style={styles.receiptTitle}>
                    ✓ Fee Paid & Receipt Generated
                  </Text>
                  <Chip mode="flat" style={styles.paidBadge} textStyle={styles.paidBadgeText}>
                    ₹{feeDetails?.amount || 1000} PAID
                  </Chip>
                </Surface>

                <View style={styles.receiptRow}>
                  <Text variant="bodySmall" style={styles.receiptLabel}>
                    Receipt Number:
                  </Text>
                  <Text variant="bodyMedium" style={styles.receiptValue}>
                    {feeDetails?.receiptNumber || 'RCP-APP-CONFIRMED'}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text variant="bodySmall" style={styles.receiptLabel}>
                    Transaction ID:
                  </Text>
                  <Text variant="bodyMedium" style={styles.receiptValue}>
                    {feeDetails?.transactionId || 'TXN-APP-SIMULATED'}
                  </Text>
                </View>

                {feeDetails?.paidAt ? (
                  <View style={styles.receiptRow}>
                    <Text variant="bodySmall" style={styles.receiptLabel}>
                      Paid At:
                    </Text>
                    <Text variant="bodyMedium" style={styles.receiptValue}>
                      {new Date(feeDetails.paidAt).toLocaleString()}
                    </Text>
                  </View>
                ) : null}

                <Text variant="bodySmall" style={styles.receiptNote}>
                  Payment verified. You may now perform final review and submit your application below.
                </Text>
              </View>
            ) : (
              <View>
                <Text variant="bodyMedium" style={styles.feeExplainer}>
                  An application processing fee of <Text style={{ fontWeight: 'bold' }}>₹1,000</Text> is mandatory before submitting your application.
                </Text>

                <View style={styles.feeBreakdown}>
                  <Text variant="bodyMedium">Application & Processing Fee:</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    ₹1,000
                  </Text>
                </View>

                {!locked ? (
                  <View style={styles.paymentActions}>
                    <Button
                      mode="contained"
                      onPress={() => handlePayFee('success')}
                      loading={isPayingFee}
                      disabled={isSaving || isSubmitting || isPayingFee}
                      buttonColor="#059669"
                      icon="credit-card-outline"
                      style={styles.payBtn}
                    >
                      Pay ₹1,000 (Simulate Success)
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handlePayFee('fail')}
                      loading={isPayingFee}
                      disabled={isSaving || isSubmitting || isPayingFee}
                      textColor="#DC2626"
                      icon="alert-circle-outline"
                      style={styles.failBtn}
                    >
                      Simulate Decline (Test Retry)
                    </Button>
                  </View>
                ) : null}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Form Action Buttons */}
        {!locked ? (
          <View>
            {!feePaid ? (
              <HelperText type="info" visible style={styles.feeNoticeText}>
                ⚠️ Please pay the ₹1,000 application fee above to enable final submission.
              </HelperText>
            ) : null}
            <View style={styles.buttonGroup}>
              <Button
                mode="outlined"
                onPress={handleSaveDraft}
                loading={isSaving}
                disabled={isSaving || isSubmitting || isPayingFee}
                textColor={theme.colors.primary}
                style={styles.draftBtn}
              >
                Save Draft
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSaving || isSubmitting || isPayingFee || !feePaid}
                buttonColor={feePaid ? theme.colors.primary : '#94A3B8'}
                style={styles.submitBtn}
              >
                Review & Submit
              </Button>
            </View>
          </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedBanner: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#047857',
  },
  lockedTitle: {
    color: '#047857',
    fontWeight: '800',
  },
  lockedSubtitle: {
    color: '#065F46',
    marginTop: 2,
  },
  successText: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderColor: '#E2E8F0',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  prefChip: {
    backgroundColor: '#DDE6ED',
    alignSelf: 'flex-start',
  },
  prefName: {
    color: '#0F2C59',
    fontWeight: '700',
    flex: 1,
    minWidth: 180,
  },
  divider: {
    backgroundColor: '#F1F5F9',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  draftBtn: {
    flex: 1,
    minWidth: 120,
    borderColor: '#0F2C59',
  },
  submitBtn: {
    flex: 1,
    minWidth: 140,
  },
  feeNoticeText: {
    color: '#D97706',
    marginBottom: 8,
    fontWeight: '600',
  },
  receiptContainer: {
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  receiptTitle: {
    color: '#15803D',
    fontWeight: '700',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
  },
  paidBadgeText: {
    color: '#166534',
    fontWeight: '800',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  receiptLabel: {
    color: '#64748B',
  },
  receiptValue: {
    color: '#0F172A',
    fontWeight: '600',
  },
  receiptNote: {
    color: '#15803D',
    marginTop: 10,
    fontStyle: 'italic',
  },
  feeExplainer: {
    color: '#475569',
    marginBottom: 10,
    lineHeight: 20,
  },
  feeBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  paymentActions: {
    gap: 10,
  },
  payBtn: {
    borderRadius: 8,
  },
  failBtn: {
    borderColor: '#F87171',
    borderRadius: 8,
  },
});

