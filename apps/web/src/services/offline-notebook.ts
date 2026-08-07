const DATABASE_NAME = "nagovori-offline-v1";
const DATABASE_VERSION = 1;
const ENTRY_STORE = "notebookQueue";

export const OFFLINE_NOTEBOOK_CHANGED_EVENT = "nagovori:offline-notebook-changed";
export const OFFLINE_NOTEBOOK_WORKSPACE_KEY = "nagovori:offline-workspace-id";

export type OfflineNotebookStatus = "error" | "queued" | "syncing";

export interface OfflineNotebookEntry {
  attempts: number;
  audioBlob?: Blob;
  audioMimeType?: string;
  body: string;
  createdAt: string;
  error?: string;
  id: string;
  kind: "idea";
  mediaId?: string;
  status: OfflineNotebookStatus;
  updatedAt: string;
  workspaceId: string;
}

type NewOfflineNotebookEntry = Pick<OfflineNotebookEntry, "workspaceId" | "body"> & {
  audioBlob?: Blob;
  audioMimeType?: string;
};

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const randomValues = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < randomValues.length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 256);
    }
  }
  randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80;
  const hex = Array.from(randomValues, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Браузер не поддерживает надёжное офлайн-хранение."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть офлайн-хранилище."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ENTRY_STORE)) {
        const store = database.createObjectStore(ENTRY_STORE, { keyPath: "id" });
        store.createIndex("workspaceId", "workspaceId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const current = database.transaction(ENTRY_STORE, mode);
    const store = current.objectStore(ENTRY_STORE);
    let settled = false;
    let resultReady = false;
    let resultValue: T;
    const finish = (value: T) => {
      resultReady = true;
      resultValue = value;
    };
    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      reject(reason);
      try {
        current.abort();
      } catch {
        // The transaction may already be inactive after an IndexedDB request error.
      }
    };
    current.onabort = () => {
      if (settled) return;
      settled = true;
      reject(current.error ?? new Error("Офлайн-операция отменена."));
    };
    current.oncomplete = () => {
      if (settled) return;
      if (!resultReady) {
        settled = true;
        reject(new Error("Офлайн-операция не вернула результат."));
        return;
      }
      settled = true;
      resolve(resultValue);
    };
    current.onerror = () => {
      if (settled) return;
      settled = true;
      reject(current.error ?? new Error("Ошибка офлайн-хранилища."));
    };
    try {
      operation(store, finish, fail);
    } catch (error) {
      fail(error);
    }
  }).finally(() => database.close());
}

function announceChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OFFLINE_NOTEBOOK_CHANGED_EVENT));
  }
}

export function rememberOfflineNotebookWorkspace(workspaceId: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(OFFLINE_NOTEBOOK_WORKSPACE_KEY, workspaceId);
  }
}

export function readOfflineNotebookWorkspace(): string | null {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(OFFLINE_NOTEBOOK_WORKSPACE_KEY);
}

export async function requestPersistentNotebookStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function createOfflineNotebookEntry(input: NewOfflineNotebookEntry): Promise<OfflineNotebookEntry> {
  if (!input.body.trim() && !input.audioBlob?.size) {
    throw new Error("Заметка пуста.");
  }
  const now = new Date().toISOString();
  const entry: OfflineNotebookEntry = {
    attempts: 0,
    ...(input.audioBlob ? { audioBlob: input.audioBlob } : {}),
    ...(input.audioMimeType ? { audioMimeType: input.audioMimeType } : {}),
    body: input.body.trim(),
    createdAt: now,
    id: createId(),
    kind: "idea",
    status: "queued",
    updatedAt: now,
    workspaceId: input.workspaceId,
  };
  await putOfflineNotebookEntry(entry);
  return entry;
}

export async function putOfflineNotebookEntry(entry: OfflineNotebookEntry): Promise<void> {
  await transaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(entry);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  announceChange();
}

export async function updateOfflineNotebookEntry(
  id: string,
  patch: Partial<OfflineNotebookEntry>,
): Promise<OfflineNotebookEntry | null> {
  const existing = await getOfflineNotebookEntry(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  await putOfflineNotebookEntry(updated);
  return updated;
}

export async function getOfflineNotebookEntry(id: string): Promise<OfflineNotebookEntry | null> {
  return transaction<OfflineNotebookEntry | null>("readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as OfflineNotebookEntry | undefined) ?? null);
  });
}

export async function listOfflineNotebookEntries(workspaceId: string): Promise<OfflineNotebookEntry[]> {
  const rows = await transaction<OfflineNotebookEntry[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as OfflineNotebookEntry[]);
  });
  return rows
    .filter((entry) => entry.workspaceId === workspaceId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function deleteOfflineNotebookEntry(id: string): Promise<void> {
  await transaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  announceChange();
}
