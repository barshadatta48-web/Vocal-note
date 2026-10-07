const DB_NAME = 'vocal-note-offline';
const DB_VERSION = 2;
const STORE_NAME = 'app';

type Snapshot = {
  notes: unknown[];
  templates: unknown[];
  savedAt: number;
};

const canUseIndexedDB = () => typeof window !== 'undefined' && 'indexedDB' in window;

function isValidSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<Snapshot>;
  return Array.isArray(snapshot.notes) && Array.isArray(snapshot.templates);
}

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

function readLegacyStorage(): Snapshot | null {
  try {
    const notesRaw = localStorage.getItem('stickie-notes-rainbow');
    const templatesRaw = localStorage.getItem('stickie-templates-rainbow');
    if (!notesRaw && !templatesRaw) return null;

    const notes = notesRaw ? JSON.parse(notesRaw) : [];
    const templates = templatesRaw ? JSON.parse(templatesRaw) : [];
    if (!Array.isArray(notes) || !Array.isArray(templates)) return null;

    return { notes, templates, savedAt: Date.now() };
  } catch (error) {
    console.warn('Legacy localStorage migration data is invalid.', error);
    return null;
  }
}

export async function loadOfflineSnapshot(): Promise<Snapshot | null> {
  // Preserve the original AI Studio/localStorage data as the first source of truth.
  // This prevents an older IndexedDB snapshot from resurrecting notes that the user
  // has already deleted or changed.
  const legacy = readLegacyStorage();

  try {
    if (legacy) {
      // Keep IndexedDB synchronized with the existing AI Studio storage.
      await writeValue('snapshot', legacy);
      return legacy;
    }

    const existing = await readValue<Snapshot>('snapshot');
    if (isValidSnapshot(existing)) return existing;

    return null;
  } catch (error) {
    console.warn('IndexedDB read failed; localStorage fallback will be used.', error);
    return legacy;
  }
}

export async function saveOfflineSnapshot(notes: unknown[], templates: unknown[]): Promise<void> {
  const snapshot: Snapshot = {
    notes: Array.isArray(notes) ? notes : [],
    templates: Array.isArray(templates) ? templates : [],
    savedAt: Date.now(),
  };

  try {
    await writeValue('snapshot', snapshot);
  } catch (error) {
    console.warn('Offline storage save failed:', error);
    try {
      localStorage.setItem('stickie-notes-rainbow', JSON.stringify(snapshot.notes));
      localStorage.setItem('stickie-templates-rainbow', JSON.stringify(snapshot.templates));
    } catch {
      // Ignore quota/private-mode failures; the in-memory app remains usable.
    }
  }
}
