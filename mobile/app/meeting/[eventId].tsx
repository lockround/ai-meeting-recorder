import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { getNoteByEventId, saveAudio, saveSummary, saveTranscription, upsertNote } from '../../lib/db';
import { transcribeAudio, summarizeText } from '../../lib/api';

export default function MeetingScreen() {
  const { eventId, title } = useLocalSearchParams<{ eventId: string; title?: string }>();
  const router = useRouter();
  const [eventTitle, setEventTitle] = useState(title ?? 'Meeting');
  const [eventTime, setEventTime] = useState<string>('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      await upsertNote(eventId, eventTitle);
      const stored = await getNoteByEventId(eventId);
      if (stored) {
        setAudioUri(stored.audioUri);
        setTranscript(stored.transcription ?? '');
        setSummary(stored.summary ?? '');
        setActionItems(stored.actionItems ?? []);
        if (stored.eventTitle) setEventTitle(stored.eventTitle);
      }
      try {
        const ev = await (Calendar as any).getEventByIdAsync(eventId);
        if (ev) {
          const start = new Date(ev.startDate);
          const end = new Date(ev.endDate);
          setEventTitle(ev.title ?? eventTitle);
          setEventTime(`${start.toLocaleString()} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        }
      } catch {}
    };
    load();
  }, [eventId]);

  const requestAudioPermissions = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone permission required');
      return false;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 1,
    });
    return true;
  };

  const startRecording = async () => {
    if (!(await requestAudioPermissions())) return;
    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      Alert.alert('Recording error', String(e));
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;
      const dir = FileSystem.documentDirectory + 'recordings/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const filename = `meeting-${eventId}-${Date.now()}.m4a`;
      const dest = dir + filename;
      await FileSystem.copyAsync({ from: uri, to: dest });
      setAudioUri(dest);
      await saveAudio(eventId!, eventTitle, dest);
      Alert.alert('Saved', 'Recording saved locally.');
    } catch (e) {
      Alert.alert('Stop error', String(e));
    }
  };

  const transcribe = async () => {
    if (!audioUri) return Alert.alert('No audio', 'Please record first.');
    try {
      setBusy(true);
      const text = await transcribeAudio(audioUri);
      setTranscript(text);
      await saveTranscription(eventId!, text);
    } catch (e) {
      Alert.alert('Transcription failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const summarize = async () => {
    if (!transcript) return Alert.alert('No transcription', 'Transcribe first.');
    try {
      setBusy(true);
      const result = await summarizeText(transcript);
      setSummary(result.summary);
      setActionItems(result.actionItems ?? []);
      await saveSummary(eventId!, result.summary, result.actionItems ?? []);
    } catch (e) {
      Alert.alert('Summarization failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{eventTitle}</Text>
      <Text style={styles.subtitle}>{eventTime}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recording</Text>
        {recording ? (
          <TouchableOpacity onPress={stopRecording} style={[styles.button, styles.danger]}>
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startRecording} style={styles.button}>
            <Text style={styles.buttonText}>Record</Text>
          </TouchableOpacity>
        )}
        {audioUri ? <Text style={styles.caption}>Saved: {audioUri.replace(FileSystem.documentDirectory ?? '', '')}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transcription</Text>
        <TouchableOpacity onPress={transcribe} disabled={busy} style={styles.buttonAlt}>
          <Text style={styles.buttonAltText}>{busy ? 'Working…' : 'Transcribe'}</Text>
        </TouchableOpacity>
        {!!transcript && <Text style={styles.body}>{transcript}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Summary & Action Items</Text>
        <TouchableOpacity onPress={summarize} disabled={busy} style={styles.buttonAlt}>
          <Text style={styles.buttonAltText}>{busy ? 'Working…' : 'Summarize'}</Text>
        </TouchableOpacity>
        {!!summary && <Text style={styles.body}>{summary}</Text>}
        {actionItems?.length ? (
          <View style={{ marginTop: 8 }}>
            {actionItems.map((a, idx) => (
              <Text key={idx} style={styles.actionItem}>• {a}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 4, marginBottom: 12 },
  card: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  button: { backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center', width: 140 },
  danger: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontWeight: '700' },
  buttonAlt: { borderColor: '#2563eb', borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center', width: 140 },
  buttonAltText: { color: '#2563eb', fontWeight: '700' },
  caption: { marginTop: 8, color: '#64748b', fontSize: 12 },
  body: { marginTop: 8, color: '#0f172a' },
  actionItem: { fontSize: 14, color: '#0f172a', marginTop: 4 },
});

