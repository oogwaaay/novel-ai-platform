import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface OfflineProject {
  id: string;
  userId: string;
  title: string;
  content: string;
  chapters: any[];
  genre?: string;
  length?: number;
  language?: string;
  updatedAt: number;
  isDirty?: boolean;
  deletedAt?: number | null;
}

export interface OfflineContext {
  projectId: string;
  characters: any[];
  writingStyle: any;
  knowledgeEntries: any[];
  updatedAt: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'project-update' | 'context-update' | 'knowledge-update' | 'style-update';
  payload: any;
  createdAt: number;
  retries: number;
}

interface KeyValueRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

interface OfflineDB extends DBSchema {
  keyvalue: {
    key: string;
    value: KeyValueRecord;
  };
  projects: {
    key: string;
    value: OfflineProject;
    indexes: { 'by-user': string };
  };
  contexts: {
    key: string;
    value: OfflineContext;
    indexes: { 'by-project': string };
  };
  queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-type': string };
  };
}

const DB_NAME = 'novel-ai-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keyvalue')) {
          db.createObjectStore('keyvalue', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('by-user', 'userId');
        }
        if (!db.objectStoreNames.contains('contexts')) {
          const store = db.createObjectStore('contexts', { keyPath: 'projectId' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('queue')) {
          const store = db.createObjectStore('queue', { keyPath: 'id' });
          store.createIndex('by-type', 'type');
        }
      }
    });
  }
  return dbPromise;
}

export async function getKeyValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDb();
    const record = await db.get('keyvalue', key);
    if (!record || typeof record.value === 'undefined') {
      return fallback;
    }
    return record.value as T;
  } catch (error) {
    console.error('[offlineDb] Failed to read key', key, error);
    return fallback;
  }
}

export async function setKeyValue<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put('keyvalue', {
      key,
      value,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('[offlineDb] Failed to write key', key, error);
  }
}

export async function deleteKeyValue(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('keyvalue', key);
  } catch (error) {
    console.error('[offlineDb] Failed to delete key', key, error);
  }
}

export async function clearOfflineData() {
  const db = await getDb();
  await Promise.all([
    db.clear('keyvalue'),
    db.clear('projects'),
    db.clear('contexts'),
    db.clear('queue')
  ]);
}




