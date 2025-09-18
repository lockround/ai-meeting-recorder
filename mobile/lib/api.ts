// @ts-nocheck
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8787';

export async function transcribeAudio(fileUri: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) throw new Error('File not found');

  const formData = new FormData();
  const filename = fileUri.split('/').pop() || `audio-${Date.now()}.m4a`;
  // @ts-ignore
  formData.append('file', { uri: fileUri, name: filename, type: 'audio/mp4' });

  const res = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: formData as any,
  });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
  const data = (await res.json()) as { text: string };
  return data.text;
}

export async function summarizeText(text: string): Promise<{ summary: string; actionItems: string[] }> {
  const res = await fetch(`${API_URL}/api/summarize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Summarization failed: ${res.status}`);
  return (await res.json()) as { summary: string; actionItems: string[] };
}

