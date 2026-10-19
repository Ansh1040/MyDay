// Minimal IndexedDB wrapper: a key-value store for app state and a blob store for voice/photo/sketch files.
const DB_NAME = 'elsewhere';
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: 'kv' | 'blobs', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
        // Commit right away instead of waiting for auto-commit: a write started while the page is being
        // hidden/unloaded (see store.ts flush) is otherwise dropped when the document goes away.
        if (mode === 'readwrite') t.commit?.();
      }),
  );
}

export const kv = {
  get: <T = unknown>(key: string) => tx<T | undefined>('kv', 'readonly', (s) => s.get(key)),
  set: (key: string, value: unknown) => tx('kv', 'readwrite', (s) => s.put(value, key)),
  del: (key: string) => tx('kv', 'readwrite', (s) => s.delete(key)),
};

export const blobs = {
  get: (id: string) => tx<Blob | undefined>('blobs', 'readonly', (s) => s.get(id)),
  put: (id: string, blob: Blob) => tx('blobs', 'readwrite', (s) => s.put(blob, id)),
  del: (id: string) => tx('blobs', 'readwrite', (s) => s.delete(id)),
  keys: () => tx<IDBValidKey[]>('blobs', 'readonly', (s) => s.getAllKeys()),
  clear: () => tx('blobs', 'readwrite', (s) => s.clear()),
};

/** Ask the browser not to evict our data under storage pressure (best effort). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) return await navigator.storage.persist();
    return true;
  } catch {
    return false;
  }
}
