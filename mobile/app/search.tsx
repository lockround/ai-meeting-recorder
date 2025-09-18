import { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet } from 'react-native';
import { searchNotes, MeetingNote } from '../lib/db';
import { Link } from 'expo-router';

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MeetingNote[]>([]);

  const onChange = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const r = await searchNotes(text.trim());
    setResults(r);
  };

  return (
    <View style={styles.container}>
      <TextInput value={q} onChangeText={onChange} placeholder="Search meetings, notes, actions…" style={styles.input} />
      <FlatList
        data={results}
        keyExtractor={(i) => `${i.id}`}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/meeting/[eventId]', params: { eventId: item.eventId } }} style={styles.row}>
            {item.eventTitle || 'Untitled'}
          </Link>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ paddingTop: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12 },
  row: { padding: 12, borderRadius: 10, backgroundColor: '#f8fafc', color: '#0f172a' },
});

