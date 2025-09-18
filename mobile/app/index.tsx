import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import * as Calendar from 'expo-calendar';
import { getAllNotesMap } from '../lib/db';

type CalendarEvent = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [noteMapVersion, setNoteMapVersion] = useState(0);
  const [notesByEventId, setNotesByEventId] = useState<Record<string, { transcription?: string; summary?: string; actionItems?: string[] }>>({});
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (perm.status !== 'granted') {
        setEvents([]);
        setLoading(false);
        return;
      }

      const calendars = await Calendar.getCalendarsAsync();
      const calendarIds = calendars.map((c) => c.id);
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 14);
      const allEvents = await Calendar.getEventsAsync(calendarIds, start, end);
      const normalized: CalendarEvent[] = allEvents
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .map((e) => ({ id: e.id, title: e.title ?? 'Untitled', startDate: new Date(e.startDate), endDate: new Date(e.endDate) }));
      setEvents(normalized);

      const map = await getAllNotesMap();
      setNotesByEventId(map);
      setLoading(false);
    };
    init();
  }, [noteMapVersion]);

  const renderItem = ({ item }: { item: CalendarEvent }) => {
    const note = notesByEventId[item.id];
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/meeting/[eventId]', params: { eventId: item.id, title: item.title } })}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{formatTimeRange(item.startDate, item.endDate)}</Text>
        {note?.transcription ? <Text numberOfLines={1} style={styles.tag}>Transcribed</Text> : null}
        {note?.summary ? <Text numberOfLines={1} style={styles.tag}>Summarized</Text> : null}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerActions}>
        <Link href="/schedule" style={styles.link}>Schedule</Link>
        <Link href="/search" style={styles.link}>Search</Link>
      </View>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666' }}>No upcoming events</Text>}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

function formatTimeRange(start: Date, end: Date) {
  const sameDay = start.toDateString() === end.toDateString();
  const date = start.toLocaleDateString();
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `${date} • ${startTime} - ${endTime}` : `${date} ${startTime} - ${end.toLocaleDateString()} ${endTime}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  link: { color: '#2563eb', fontWeight: '600' },
  card: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 4 },
  tag: { marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: '600' },
});

