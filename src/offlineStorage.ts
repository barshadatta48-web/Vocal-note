const DB_NAME = 'vocal-note-offline';
const DB_VERSION = 2;
const STORE_NAME = 'app';
const LEGACY_NOTES_KEY = 'stickie-notes-rainbow';
const LEGACY_TEMPLATES_KEY = 'stickie-templates-rainbow';
const SNAPSHOT_TIMESTAMP_KEY = 'stickie-offline-snapshot-saved-at';

type Snapshot = {
  notes: unknown[];
  templates: unknown[];
  savedAt: number;
};

const canUseIndexedDB = () =>
  typeof window !== 'undefined' && 'indexedDB' in window;

function isValidSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<Snapshot>;
  return (
    Array.isArray(snapshot.notes) &&
    Array.isArray(snapshot.templates) &&
    (snapshot.savedAt === undefined ||
      (typeof snapshot.savedAt === 'number' && Number.isFinite(snapshot.savedAt)))
  );
}

/** An empty snapshot is valid, but it must not erase a non-empty backup. */
function hasStoredData(snapshot: Snapshot): boolean {
  return snapshot.notes.length > 0 || snapshot.templates.length > 0;
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

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () =>
      reject(request.error || new Error('Unable to open IndexedDB'));
    request.onblocked = () =>
      reject(new Error('IndexedDB upgrade is blocked by another open tab'));
  });
}

async function readValue<T>(key: string): Promise<T | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    let result: T | null = null;

    request.onsuccess = () => {
      result = (request.result as T | undefined) ?? null;
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Unable to read offline data'));
    };
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('Unable to read offline data'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Offline read was aborted'));
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

/**
 * Legacy localStorage stores notes/templates as separate arrays. Its timestamp
 * must come from metadata written at save time, never from the time it is read.
 * Older installs without metadata are treated as an unversioned migration source.
 */
function readLegacyStorage(): Snapshot | null {
  try {
    const notesRaw = localStorage.getItem(LEGACY_NOTES_KEY);
    const templatesRaw = localStorage.getItem(LEGACY_TEMPLATES_KEY);
    if (notesRaw === null && templatesRaw === null) return null;

    const notes = notesRaw === null ? [] : JSON.parse(notesRaw);
    const templates = templatesRaw === null ? [] : JSON.parse(templatesRaw);
    if (!Array.isArray(notes) || !Array.isArray(templates)) return null;

    const rawTimestamp = localStorage.getItem(SNAPSHOT_TIMESTAMP_KEY);
    const parsedTimestamp = rawTimestamp === null ? 0 : Number(rawTimestamp);
    const savedAt = Number.isFinite(parsedTimestamp) && parsedTimestamp > 0
      ? parsedTimestamp
      : 0;

    return { notes, templates, savedAt };
  } catch (error) {
    console.warn('Legacy localStorage migration data is invalid.', error);
    return null;
  }
}

function persistLegacySnapshot(snapshot: Snapshot): void {
  try {
    localStorage.setItem(LEGACY_NOTES_KEY, JSON.stringify(snapshot.notes));
    localStorage.setItem(LEGACY_TEMPLATES_KEY, JSON.stringify(snapshot.templates));
    localStorage.setItem(SNAPSHOT_TIMESTAMP_KEY, String(snapshot.savedAt));
  } catch (error) {
    // IndexedDB remains the primary store if localStorage is unavailable or full.
    console.warn('Unable to update legacy offline-storage mirror:', error);
  }
}

/** Migrate without discarding the legacy backup if the IndexedDB write fails. */
async function migrateLegacySnapshot(legacy: Snapshot): Promise<Snapshot> {
  const migrated = { ...legacy, savedAt: legacy.savedAt || Date.now() };
  try {
    await writeValue('snapshot', migrated);
    persistLegacySnapshot(migrated);
  } catch (migrationError) {
    console.warn('Could not migrate legacy snapshot to IndexedDB:', migrationError);
  }
  return migrated;
}

export async function loadOfflineSnapshot(): Promise<Snapshot | null> {
  const legacy = readLegacyStorage();

  try {
    const existing = await readValue<Snapshot>('snapshot');
    const isExistingValid = isValidSnapshot(existing);

    if (isExistingValid && legacy) {
      const existingHasData = hasStoredData(existing);
      const legacyHasData = hasStoredData(legacy);

      // Never let an empty IndexedDB snapshot hide non-empty legacy notes or
      // templates. This protects data created by older versions of the app.
      if (!existingHasData && legacyHasData) {
        return migrateLegacySnapshot(legacy);
      }

      // Conversely, an empty/older localStorage mirror must not replace real,
      // newer data already stored in IndexedDB.
      if (existingHasData && !legacyHasData) {
        return existing;
      }

      // Prefer IndexedDB on ties and whenever legacy data has no trustworthy
      // save-time metadata. Reading legacy data must never make it look newer.
      if ((existing.savedAt || 0) >= legacy.savedAt) {
        return existing;
      }

      // A genuinely newer legacy snapshot may come from an older app version.
      return migrateLegacySnapshot(legacy);
    }

    if (isExistingValid) return existing;
    if (legacy) return migrateLegacySnapshot(legacy);

    return null;
  } catch (error) {
    console.warn('IndexedDB read failed; localStorage fallback will be used.', error);
    return legacy;
  }
}

// Serialize writes so slower IndexedDB operations cannot complete out of order
// and replace a newer note snapshot with an older one.
let saveQueue: Promise<void> = Promise.resolve();

export function saveOfflineSnapshot(
  notes: unknown[],
  templates: unknown[]
): Promise<void> {
  const snapshot: Snapshot = {
    notes: Array.isArray(notes) ? notes : [],
    templates: Array.isArray(templates) ? templates : [],
    savedAt: Date.now(),
  };

  const saveTask = saveQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await writeValue('snapshot', snapshot);
        // Keep the legacy mirror and its timestamp in sync after IDB commits.
        persistLegacySnapshot(snapshot);
      } catch (error) {
        console.warn('IndexedDB offline save failed; using localStorage fallback:', error);
        persistLegacySnapshot(snapshot);
      }
    });

  saveQueue = saveTask;
  return saveTask;
}
