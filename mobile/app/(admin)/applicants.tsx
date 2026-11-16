import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, Alert, Platform, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { apiClient } from '../../src/api/client';

export default function AdminApplicantsScreen() {
  const [data, setData] = useState<any>({
    applicants: [],
    faculty: [],
    counters: [],
    audit: [],
  });
  const [search, setSearch] = useState('');
  const [rank, setRank] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setData((await apiClient.get('/admin/registry')).data.data);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  const update = async (path: string, body: any) => {
    try {
      await apiClient.post(path, body);
      setMessage('Saved');
      await load();
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="headlineSmall" style={{ color: '#A01A1E', fontWeight: '800' }}>
        Applicant review and faculty assignments
      </Text>
      {message ? <Text style={{ color: '#16A34A', fontWeight: '600' }}>{message}</Text> : null}
      <TextInput
        label="Search name or email"
        value={search}
        onChangeText={setSearch}
        mode="outlined"
      />
      <TextInput
        label="Merit rank to assign"
        keyboardType="numeric"
        value={rank}
        onChangeText={setRank}
        mode="outlined"
      />
      <TextInput
        label="Reason for final rejection"
        value={reason}
        onChangeText={setReason}
        mode="outlined"
      />
      {data.applicants
        .filter((a: any) =>
          ((a.userId?.fullName || '') + (a.userId?.email || ''))
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((a: any) => (
          <Card key={a._id} style={{ marginBottom: 10 }} mode="outlined">
            <Card.Content>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B' }}>
                {a.userId?.fullName} | {a.userId?.email}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 8 }}>
                Rank {a.meritRank || 'Unassigned'} | Status: {a.admissionStage}
              </Text>
              <Button
                mode="contained"
                buttonColor="#A01A1E"
                style={{ marginVertical: 4 }}
                onPress={() =>
                  update('/admin/applicants/' + a._id, {
                    action: 'rank',
                    rank: Number(rank),
                  })
                }
              >
                Assign entered rank
              </Button>
              <Button
                mode="outlined"
                textColor="#B91C1C"
                style={{ borderColor: '#B91C1C', marginTop: 4 }}
                onPress={async () => {
                  const question = 'Reject this application and release any held seat?';
                  const yes =
                    Platform.OS === 'web'
                      ? window.confirm(question)
                      : await new Promise<boolean>((resolve) =>
                          Alert.alert(
                            'Final rejection',
                            question,
                            [
                              { text: 'Cancel', onPress: () => resolve(false) },
                              { text: 'Reject', onPress: () => resolve(true) },
                            ],
                            { cancelable: false },
                          ),
                        );
                  if (yes)
                    await update('/admin/applicants/' + a._id, {
                      action: 'reject',
                      reason,
                    });
                }}
              >
                Reject with entered reason
              </Button>
            </Card.Content>
          </Card>
        ))}
      <Text variant="titleLarge" style={{ color: '#A01A1E', fontWeight: '800', marginTop: 12 }}>
        Faculty counters
      </Text>
      {data.faculty.map((f: any) => (
        <Card key={f._id} style={{ marginBottom: 8 }} mode="outlined">
          <Card.Content>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>{f.fullName}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {data.counters.map((c: any) => (
                <Button
                  key={c._id}
                  mode={f.assignedCounterId === c._id ? 'contained' : 'outlined'}
                  buttonColor={f.assignedCounterId === c._id ? '#A01A1E' : undefined}
                  onPress={() =>
                    update('/admin/faculty/' + f._id + '/counter', {
                      counterId: c._id,
                    })
                  }
                >
                  {c.name}
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>
      ))}
      <Text variant="titleLarge" style={{ color: '#A01A1E', fontWeight: '800', marginTop: 12 }}>
        Recent audit history
      </Text>
      {data.audit.map((entry: any) => (
        <Text key={entry._id} style={{ color: '#64748B', fontSize: 12, paddingVertical: 2 }}>
          {new Date(entry.timestamp).toLocaleString()} | {entry.action} | {entry.summary}
        </Text>
      ))}
    </ScrollView>
  );
}
