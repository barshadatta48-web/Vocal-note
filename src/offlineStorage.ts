const DB_NAME = 'vocal-note-offline';
const DB_VERSION = 1;
const STORE_NAME = 'app';

type Snapshot = {
  notes: unknown[];
  templates: unknown[];
  savedAt: number;
};

const canUseIndexedDB = () => typeof window !== 'undefined' && 'indexedDB' in window;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDB()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB'));
  });
}

async function readValue<T>(key: string): Promise<T | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error || new Error('Unable to read offline data'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Unable to read offline data'));
    };
  });
}

async function writeValue<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Unable to save offline data'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Offline save was aborted'));
    };
  });
}

export async function loadOfflineSnapshot(): Promise<Snapshot | null> {
  try {
    const existing = await readValue<Snapshot>('snapshot');
    if (existing) return existing;

    // One-time migration from the previous localStorage implementation.
    const notes = localStorage.getItem('stickie-notes-rainbow');
    const templates = localStorage.getItem('stickie-templates-rainbow');

    if (!notes && !templates) return null;

    const snapshot: Snapshot = {
      notes: notes ? JSON.parse(notes) : [],
      templates: templates ? JSON.parse(templates) : [],
      savedAt: Date.now(),
    };

    await writeValue('snapshot', snapshot);
    return snapshot;
  } catch (error) {
    console.warn('Offline storage read failed; localStorage fallback will be used.', error);
    return null;
  }
}

export async function saveOfflineSnapshot(notes: unknown[], templates: unknown[]): Promise<void> {
  try {
    await writeValue('snapshot', {
      notes,
      templates,
      savedAt: Date.now(),
    });
  } catch (error) {
    console.warn('Offline storage save failed:', error);
    // Keep the existing localStorage backup as a safety net.
    try {
      localStorage.setItem('stickie-notes-rainbow', JSON.stringify(notes));
      localStorage.setItem('stickie-templates-rainbow', JSON.stringify(templates));
    } catch {
      // Ignore quota/private-mode failures; the in-memory app remains usable.
    }
  }
}
