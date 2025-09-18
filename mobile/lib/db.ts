import * as SQLite from 'expo-sqlite';

export type MeetingNote = {
  id: number;
  eventId: string;
  eventTitle: string | null;
  audioUri: string | null;
  transcription: string | null;
  summary: string | null;
  actionItems: string[] | null;
  createdAt: string;
  updatedAt: string;
};

let db: SQLite.WebSQLDatabase | null = null;

export function initDb() {
  if (db) return;
  db = SQLite.openDatabase('meetings.db');
  db.transaction((tx) => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS meeting_notes (
        id INTEGER PRIMARY KEY NOT NULL,
        eventId TEXT,
        eventTitle TEXT,
        audioUri TEXT,
        transcription TEXT,
        summary TEXT,
        actionItems TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );`
    );
    tx.executeSql('CREATE INDEX IF NOT EXISTS idx_meeting_notes_eventId ON meeting_notes(eventId);');
  });
}

function getDb(): SQLite.WebSQLDatabase {
  if (!db) initDb();
  if (!db) throw new Error('DB not initialized');
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

export function upsertNote(eventId: string, eventTitle: string | null = null): Promise<void> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql(
        'SELECT id FROM meeting_notes WHERE eventId = ? LIMIT 1',
        [eventId],
        (_t, res) => {
          if (res.rows.length > 0) {
            tx.executeSql('UPDATE meeting_notes SET eventTitle = COALESCE(?, eventTitle), updatedAt = ? WHERE eventId = ?', [eventTitle, nowIso(), eventId]);
            resolve();
          } else {
            tx.executeSql(
              'INSERT INTO meeting_notes (eventId, eventTitle, audioUri, transcription, summary, actionItems, createdAt, updatedAt) VALUES (?, ?, NULL, NULL, NULL, NULL, ?, ?)',
              [eventId, eventTitle, nowIso(), nowIso()],
              () => resolve(),
              (_t2, err) => {
                reject(err);
                return false;
              }
            );
          }
        },
        (_t, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
}

export function saveAudio(eventId: string, eventTitle: string | null, audioUri: string): Promise<void> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql('UPDATE meeting_notes SET eventTitle = COALESCE(?, eventTitle), audioUri = ?, updatedAt = ? WHERE eventId = ?', [eventTitle, audioUri, nowIso(), eventId]);
      resolve();
    }, (err) => reject(err));
  });
}

export function saveTranscription(eventId: string, text: string): Promise<void> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql('UPDATE meeting_notes SET transcription = ?, updatedAt = ? WHERE eventId = ?', [text, nowIso(), eventId]);
      resolve();
    }, (err) => reject(err));
  });
}

export function saveSummary(eventId: string, summary: string, actionItems: string[]): Promise<void> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql('UPDATE meeting_notes SET summary = ?, actionItems = ?, updatedAt = ? WHERE eventId = ?', [summary, JSON.stringify(actionItems), nowIso(), eventId]);
      resolve();
    }, (err) => reject(err));
  });
}

export function getNoteByEventId(eventId: string): Promise<MeetingNote | null> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.readTransaction((tx) => {
      tx.executeSql(
        'SELECT * FROM meeting_notes WHERE eventId = ? LIMIT 1',
        [eventId],
        (_t, res) => {
          if (res.rows.length === 0) return resolve(null);
          const row = res.rows.item(0);
          resolve(mapRow(row));
        },
        (_t, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
}

export function getAllNotesMap(): Promise<Record<string, { transcription?: string; summary?: string; actionItems?: string[] }>> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.readTransaction((tx) => {
      tx.executeSql('SELECT eventId, transcription, summary, actionItems FROM meeting_notes', [], (_t, res) => {
        const map: Record<string, { transcription?: string; summary?: string; actionItems?: string[] }> = {};
        for (let i = 0; i < res.rows.length; i++) {
          const row = res.rows.item(i);
          map[row.eventId] = {
            transcription: row.transcription ?? undefined,
            summary: row.summary ?? undefined,
            actionItems: row.actionItems ? JSON.parse(row.actionItems) : undefined,
          };
        }
        resolve(map);
      }, (_t, err) => {
        reject(err);
        return false;
      });
    });
  });
}

export function searchNotes(query: string): Promise<MeetingNote[]> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    const q = `%${query}%`;
    database.readTransaction((tx) => {
      tx.executeSql(
        'SELECT * FROM meeting_notes WHERE (eventTitle LIKE ? OR transcription LIKE ? OR summary LIKE ? OR actionItems LIKE ?) ORDER BY updatedAt DESC',
        [q, q, q, q],
        (_t, res) => {
          const arr: MeetingNote[] = [];
          for (let i = 0; i < res.rows.length; i++) arr.push(mapRow(res.rows.item(i)));
          resolve(arr);
        },
        (_t, err) => {
          reject(err);
          return false;
        }
      );
    });
  });
}

function mapRow(row: any): MeetingNote {
  return {
    id: row.id,
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    audioUri: row.audioUri,
    transcription: row.transcription,
    summary: row.summary,
    actionItems: row.actionItems ? JSON.parse(row.actionItems) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

