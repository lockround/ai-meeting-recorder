// @ts-nocheck
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDb } from '../lib/db';

export default function RootLayout() {
  useEffect(() => {
    initDb();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Meetings' }} />
        <Stack.Screen name="schedule" options={{ title: 'Schedule Meeting' }} />
        <Stack.Screen name="meeting/[eventId]" options={{ title: 'Meeting' }} />
        <Stack.Screen name="search" options={{ title: 'Search' }} />
      </Stack>
    </>
  );
}

