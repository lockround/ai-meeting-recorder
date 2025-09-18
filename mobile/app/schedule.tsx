import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import { useRouter } from 'expo-router';

export default function ScheduleScreen() {
  const [title, setTitle] = useState('New Meeting');
  const router = useRouter();

  const createEvent = async () => {
    const perm = await Calendar.requestCalendarPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Calendar permission is required.');
      return;
    }

    const calendars = await Calendar.getCalendarsAsync();
    const calendar = calendars.find((c) => (c as any).isPrimary) ?? calendars[0];
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const eventId = await Calendar.createEventAsync(calendar.id, {
      title: title || 'New Meeting',
      startDate,
      endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    Alert.alert('Event created', 'Opening the meeting page...', [
      { text: 'OK', onPress: () => router.replace({ pathname: '/meeting/[eventId]', params: { eventId, title } }) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Meeting title" />
      <TouchableOpacity onPress={createEvent} style={styles.button}>
        <Text style={styles.buttonText}>Create for next 30 minutes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  label: { fontSize: 12, color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});

